package com.snovasys.ledgerline;

import com.snovasys.ledgerline.entity.Account;
import com.snovasys.ledgerline.entity.LedgerEntry;
import com.snovasys.ledgerline.repository.AccountRepository;
import com.snovasys.ledgerline.repository.LedgerEntryRepository;
import com.snovasys.ledgerline.service.RateLimitingService;
import com.snovasys.ledgerline.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class TransactionSecurityTest {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private RateLimitingService rateLimitingService;

    private final String senderAccNum = "SEC-TEST-SRC";
    private final String receiverAccNum = "SEC-TEST-DST";

    @BeforeEach
    void setup() {
        ledgerEntryRepository.deleteAll();
        accountRepository.deleteAll();

        Account sender = new Account();
        sender.setAccountNumber(senderAccNum);
        sender.setOwnerName("Alice Security");
        sender.setBalance(new BigDecimal("500.0000"));
        accountRepository.save(sender);

        Account receiver = new Account();
        receiver.setAccountNumber(receiverAccNum);
        receiver.setOwnerName("Bob Security");
        receiver.setBalance(new BigDecimal("100.0000"));
        accountRepository.save(receiver);
    }

    @Test
    @DisplayName("Threat 5: Negative transfer amounts must be rejected immediately")
    void testNegativeAmountTransferRejected() {
        BigDecimal negativeAmount = new BigDecimal("-50.0000");
        String txId = "TXN-SEC-NEG-" + UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                transactionService.processTransfer(senderAccNum, receiverAccNum, negativeAmount, txId)
        );

        assertTrue(ex.getMessage().contains("positive"), "Error must state that transfer amount must be positive");

        // Verify balances remain untouched
        Account sender = accountRepository.findByAccountNumber(senderAccNum).orElseThrow();
        assertEquals(0, sender.getBalance().compareTo(new BigDecimal("500.0000")));
    }

    @Test
    @DisplayName("Threat 5: Zero transfer amounts must be rejected")
    void testZeroAmountTransferRejected() {
        BigDecimal zeroAmount = BigDecimal.ZERO;
        String txId = "TXN-SEC-ZERO-" + UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                transactionService.processTransfer(senderAccNum, receiverAccNum, zeroAmount, txId)
        );

        assertTrue(ex.getMessage().contains("positive"));
    }

    @Test
    @DisplayName("Threat 5: Self-transfers to the same account must be rejected")
    void testTransferToSameAccountRejected() {
        BigDecimal amount = new BigDecimal("10.0000");
        String txId = "TXN-SEC-SELF-" + UUID.randomUUID();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                transactionService.processTransfer(senderAccNum, senderAccNum, amount, txId)
        );

        assertTrue(ex.getMessage().contains("same account"));
    }

    @Test
    @DisplayName("Threat 1: Transfers exceeding available balance must fail with Insufficient Funds (No Overdraft)")
    void testInsufficientFundsRejected() {
        BigDecimal excessiveAmount = new BigDecimal("9999.0000"); // Sender only has 500
        String txId = "TXN-SEC-EXCESS-" + UUID.randomUUID();

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                transactionService.processTransfer(senderAccNum, receiverAccNum, excessiveAmount, txId)
        );

        assertTrue(ex.getMessage().contains("Insufficient funds"));

        // Verify balances remain strictly unchanged
        Account sender = accountRepository.findByAccountNumber(senderAccNum).orElseThrow();
        Account receiver = accountRepository.findByAccountNumber(receiverAccNum).orElseThrow();
        assertEquals(0, sender.getBalance().compareTo(new BigDecimal("500.0000")), "Sender balance unchanged");
        assertEquals(0, receiver.getBalance().compareTo(new BigDecimal("100.0000")), "Receiver balance unchanged");
    }

    @Test
    @DisplayName("Threat 4: Ledger audit trail records must be permanently stored and queryable")
    void testLedgerAuditEntriesAreImmutable() {
        BigDecimal transferAmount = new BigDecimal("75.0000");
        String txId = "TXN-SEC-AUDIT-" + UUID.randomUUID();

        LedgerEntry entry = transactionService.processTransfer(senderAccNum, receiverAccNum, transferAmount, txId);
        assertNotNull(entry.getId());
        assertEquals("SUCCESS", entry.getStatus());
        assertEquals(txId, entry.getTransactionId());

        // Verify entry in repository
        List<LedgerEntry> history = transactionService.getAccountHistory(senderAccNum);
        assertEquals(1, history.size());
        assertEquals(0, history.get(0).getAmount().compareTo(transferAmount));
        assertEquals(senderAccNum, history.get(0).getFromAccountNumber());
        assertEquals(receiverAccNum, history.get(0).getToAccountNumber());
    }

    @Test
    @DisplayName("Threat 6: Rate limiter permits up to configured capacity and throttles subsequent requests")
    void testRateLimitingEnforced() {
        String testKey = "client-ip-192.168.1.100";

        // Consume all available tokens (capacity = 20)
        for (int i = 0; i < 20; i++) {
            boolean allowed = rateLimitingService.tryConsume(testKey);
            assertTrue(allowed, "Request #" + (i + 1) + " should be allowed within quota");
        }

        // 21st request must be denied by rate limiter
        boolean throttled = rateLimitingService.tryConsume(testKey);
        assertFalse(throttled, "Request #21 must be rejected by the rate limiting token bucket");
    }
}
