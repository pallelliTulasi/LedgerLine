package com.snovasys.ledgerline;

import com.snovasys.ledgerline.entity.Account;
import com.snovasys.ledgerline.entity.LedgerEntry;
import com.snovasys.ledgerline.repository.AccountRepository;
import com.snovasys.ledgerline.repository.LedgerEntryRepository;
import com.snovasys.ledgerline.service.TransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class TransactionServiceTest {

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @BeforeEach
    void setup() {
        ledgerEntryRepository.deleteAll();
        accountRepository.deleteAll();
    }

    @Test
    @DisplayName("Task 6: Concurrency Test - 50 concurrent transfer requests must prevent overdraft and maintain consistency")
    void testConcurrentTransfersMaintainBalanceConsistency() throws InterruptedException {
        // Initial setup: Sender starts with ₹1000.0000, Receiver starts with ₹0.0000
        String senderAccNum = "ACC-CONC-SRC";
        String receiverAccNum = "ACC-CONC-DST";

        Account sender = new Account();
        sender.setAccountNumber(senderAccNum);
        sender.setOwnerName("Sender");
        sender.setBalance(new BigDecimal("1000.0000"));
        accountRepository.save(sender);

        Account receiver = new Account();
        receiver.setAccountNumber(receiverAccNum);
        receiver.setOwnerName("Receiver");
        receiver.setBalance(new BigDecimal("0.0000"));
        accountRepository.save(receiver);

        int totalRequests = 50;
        BigDecimal transferAmount = new BigDecimal("25.0000"); // 50 * 25 = ₹1250 total requested (exceeds balance of 1000)

        ExecutorService executor = Executors.newFixedThreadPool(16);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalRequests);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < totalRequests; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // Synchronize all submitted tasks
                    String txId = "TXN-CONC-" + UUID.randomUUID();
                    transactionService.processTransfer(senderAccNum, receiverAccNum, transferAmount, txId);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Release the latch to start concurrent execution
        startLatch.countDown();
        boolean completed = doneLatch.await(15, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All 50 concurrent requests should complete within timeout");

        // Verify state in database
        Account finalSender = accountRepository.findByAccountNumber(senderAccNum).orElseThrow();
        Account finalReceiver = accountRepository.findByAccountNumber(receiverAccNum).orElseThrow();

        BigDecimal initialTotal = new BigDecimal("1000.0000");
        BigDecimal finalTotal = finalSender.getBalance().add(finalReceiver.getBalance());

        System.out.printf("Concurrency Test Results -> Success: %d, Failures: %d, Final Sender: %s, Final Receiver: %s%n",
                successCount.get(), failureCount.get(), finalSender.getBalance(), finalReceiver.getBalance());

        // 1. No overdraft: Sender balance must never be negative
        assertTrue(finalSender.getBalance().compareTo(BigDecimal.ZERO) >= 0,
                "Sender balance must never fall below zero (no overdraft)");

        // 2. Maximum possible successful transfers is 40 (40 * 25 = 1000)
        assertEquals(40, successCount.get(), "Exactly 40 transfers should succeed before balance is exhausted");
        assertEquals(10, failureCount.get(), "Remaining 10 transfers must fail due to insufficient funds");

        // 3. Sender balance must be exactly zero, and receiver must have gained 1000
        assertEquals(0, finalSender.getBalance().compareTo(BigDecimal.ZERO), "Sender balance should be 0.0000");
        assertEquals(0, finalReceiver.getBalance().compareTo(new BigDecimal("1000.0000")), "Receiver balance should be 1000.0000");

        // 4. Strict balance consistency: Total money in the system must remain unchanged
        assertEquals(0, initialTotal.compareTo(finalTotal),
                "Total balance across accounts must remain strictly constant");
    }

    @Test
    @DisplayName("Task 6: Idempotency Test - Duplicate transaction request with same txId only deducts balance once")
    void testIdempotentTransferDoesNotDeductBalanceTwice() {
        String senderAccNum = "ACC-IDEMP-SRC";
        String receiverAccNum = "ACC-IDEMP-DST";
        String fixedTxId = "TXN-IDEMP-FIXED-KEY-999";
        BigDecimal transferAmount = new BigDecimal("100.0000");

        Account sender = new Account();
        sender.setAccountNumber(senderAccNum);
        sender.setOwnerName("Alice Idemp");
        sender.setBalance(new BigDecimal("500.0000"));
        accountRepository.save(sender);

        Account receiver = new Account();
        receiver.setAccountNumber(receiverAccNum);
        receiver.setOwnerName("Bob Idemp");
        receiver.setBalance(new BigDecimal("200.0000"));
        accountRepository.save(receiver);

        // 1. First execution
        LedgerEntry firstResult = transactionService.processTransfer(senderAccNum, receiverAccNum, transferAmount, fixedTxId);
        assertNotNull(firstResult);
        assertEquals("SUCCESS", firstResult.getStatus());
        assertEquals(fixedTxId, firstResult.getTransactionId());

        Account senderAfterFirst = accountRepository.findByAccountNumber(senderAccNum).orElseThrow();
        Account receiverAfterFirst = accountRepository.findByAccountNumber(receiverAccNum).orElseThrow();
        assertEquals(0, senderAfterFirst.getBalance().compareTo(new BigDecimal("400.0000")), "Balance deducted after first call");
        assertEquals(0, receiverAfterFirst.getBalance().compareTo(new BigDecimal("300.0000")), "Balance credited after first call");

        // 2. Second execution with the identical txId (simulating duplicate network retry)
        LedgerEntry secondResult = transactionService.processTransfer(senderAccNum, receiverAccNum, transferAmount, fixedTxId);
        assertNotNull(secondResult);
        assertEquals(fixedTxId, secondResult.getTransactionId());

        Account senderAfterSecond = accountRepository.findByAccountNumber(senderAccNum).orElseThrow();
        Account receiverAfterSecond = accountRepository.findByAccountNumber(receiverAccNum).orElseThrow();

        // Balance MUST NOT be deducted a second time
        assertEquals(0, senderAfterSecond.getBalance().compareTo(new BigDecimal("400.0000")),
                "Sender balance must remain 400.0000 and NOT be deducted twice");
        assertEquals(0, receiverAfterSecond.getBalance().compareTo(new BigDecimal("300.0000")),
                "Receiver balance must remain 300.0000 and NOT be credited twice");

        // Exactly one ledger entry should exist for this transactionId
        assertTrue(ledgerEntryRepository.findByTransactionId(fixedTxId).isPresent());
        assertEquals(1, ledgerEntryRepository.findByFromAccountNumberOrToAccountNumber(senderAccNum, senderAccNum).size());
    }
}
