package com.snovasys.ledgerline.repository;

import com.snovasys.ledgerline.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {
    Optional<LedgerEntry> findByTransactionId(String transactionId);

    // History thechukodaniki kotha method
    List<LedgerEntry> findByFromAccountNumberOrToAccountNumber(String fromAcc, String toAcc);
}