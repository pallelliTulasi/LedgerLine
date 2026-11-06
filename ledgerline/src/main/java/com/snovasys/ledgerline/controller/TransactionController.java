package com.snovasys.ledgerline.controller;

import com.snovasys.ledgerline.service.TransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {
    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    public record TransferRequest(String fromAccount, String toAccount, BigDecimal amount) {
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> makeTransfer(@RequestBody TransferRequest request) {
        try {
            String txId = UUID.randomUUID().toString();
            var result = transactionService.processTransfer(request.fromAccount(), request.toAccount(),
                    request.amount(), txId);
            return ResponseEntity.ok(Map.of("message", "Transfer Successful", "transaction", result));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{accountNumber}/history")
    public ResponseEntity<?> getHistory(@PathVariable String accountNumber) {
        return ResponseEntity.ok(transactionService.getAccountHistory(accountNumber));
    }
}