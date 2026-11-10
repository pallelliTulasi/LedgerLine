package com.snovasys.ledgerline.service;

import com.snovasys.ledgerline.entity.Account;
import com.snovasys.ledgerline.entity.LedgerEntry;
import com.snovasys.ledgerline.repository.AccountRepository;
import com.snovasys.ledgerline.repository.LedgerEntryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class TransactionService {
    private final AccountRepository accountRepo;
    private final LedgerEntryRepository ledgerRepo;

    public TransactionService(AccountRepository accountRepo, LedgerEntryRepository ledgerRepo) {
        this.accountRepo = accountRepo;
        this.ledgerRepo = ledgerRepo;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public LedgerEntry processTransfer(String fromAcc, String toAcc, BigDecimal amount, String txId) {
        if (fromAcc == null || toAcc == null) {
            throw new IllegalArgumentException("Account numbers cannot be null.");
        }
        if (fromAcc.equals(toAcc)) {
            throw new IllegalArgumentException("Cannot transfer to the same account.");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be positive.");
        }

        // Idempotency check: if transactionId was already processed, return existing entry without deducting balance again
        Optional<LedgerEntry> existingTx = ledgerRepo.findByTransactionId(txId);
        if (existingTx.isPresent()) {
            return existingTx.get();
        }

        // Lock accounts in deterministic order (by accountNumber) to prevent deadlocks under high concurrency
        Account firstLock;
        Account secondLock;
        if (fromAcc.compareTo(toAcc) < 0) {
            firstLock = accountRepo.findByAccountNumberWithLock(fromAcc)
                    .orElseThrow(() -> new RuntimeException("Sender not found: " + fromAcc));
            secondLock = accountRepo.findByAccountNumberWithLock(toAcc)
                    .orElseThrow(() -> new RuntimeException("Receiver not found: " + toAcc));
        } else {
            secondLock = accountRepo.findByAccountNumberWithLock(toAcc)
                    .orElseThrow(() -> new RuntimeException("Receiver not found: " + toAcc));
            firstLock = accountRepo.findByAccountNumberWithLock(fromAcc)
                    .orElseThrow(() -> new RuntimeException("Sender not found: " + fromAcc));
        }

        Account sender = fromAcc.equals(firstLock.getAccountNumber()) ? firstLock : secondLock;
        Account receiver = toAcc.equals(firstLock.getAccountNumber()) ? firstLock : secondLock;

        if (sender.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient funds!");
        }

        sender.setBalance(sender.getBalance().subtract(amount));
        receiver.setBalance(receiver.getBalance().add(amount));
        accountRepo.save(sender);
        accountRepo.save(receiver);

        LedgerEntry entry = new LedgerEntry();
        entry.setTransactionId(txId);
        entry.setFromAccountNumber(fromAcc);
        entry.setToAccountNumber(toAcc);
        entry.setAmount(amount);
        entry.setStatus("SUCCESS");
        return ledgerRepo.save(entry);
    }

    public List<LedgerEntry> getAccountHistory(String accountNum) {
        return ledgerRepo.findByFromAccountNumberOrToAccountNumber(accountNum, accountNum);
    }
}
