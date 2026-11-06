package com.snovasys.ledgerline.service;

import com.snovasys.ledgerline.entity.*;
import com.snovasys.ledgerline.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class TransactionService {
    private final AccountRepository accountRepo;
    private final LedgerEntryRepository ledgerRepo;

    public TransactionService(AccountRepository accountRepo, LedgerEntryRepository ledgerRepo) {
        this.accountRepo = accountRepo;
        this.ledgerRepo = ledgerRepo;
    }

    @Transactional
    public LedgerEntry processTransfer(String fromAcc, String toAcc, BigDecimal amount, String txId) {
        if (ledgerRepo.findByTransactionId(txId).isPresent())
            throw new RuntimeException("Duplicate Transaction!");

        Account sender = accountRepo.findByAccountNumber(fromAcc)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        Account receiver = accountRepo.findByAccountNumber(toAcc)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        if (sender.getBalance().compareTo(amount) < 0)
            throw new RuntimeException("Insufficient funds!");

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