package com.snovasys.ledgerline.controller;

import com.snovasys.ledgerline.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
@Tag(name = "Transactions", description = "Endpoints for idempotent fund transfers and ledger audit history")
@SecurityRequirement(name = "BearerAuth")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    public record TransferRequest(
            @Schema(description = "Source account number", example = "1001", requiredMode = Schema.RequiredMode.REQUIRED)
            String fromAccount,
            @Schema(description = "Destination account number", example = "1002", requiredMode = Schema.RequiredMode.REQUIRED)
            String toAccount,
            @Schema(description = "Transfer amount in INR", example = "150.00", requiredMode = Schema.RequiredMode.REQUIRED)
            BigDecimal amount,
            @Schema(description = "Optional client-generated idempotency key/UUID", example = "txn-550e8400-e29b-41d4-a716-446655440000")
            String transactionId
    ) {}

    @Operation(summary = "Transfer Funds Idempotently", description = "Executes an atomic transfer between two accounts with pessimistic locking and idempotency validation.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Transfer executed or existing idempotent transaction returned successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid transfer request or insufficient funds", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Missing or invalid JWT token", content = @Content),
            @ApiResponse(responseCode = "429", description = "Too Many Requests - Rate limit exceeded", content = @Content)
    })
    @PostMapping("/transfer")
    public ResponseEntity<?> makeTransfer(@RequestBody TransferRequest request) {
        try {
            String txId = (request.transactionId() != null && !request.transactionId().isBlank())
                    ? request.transactionId()
                    : UUID.randomUUID().toString();

            var result = transactionService.processTransfer(
                    request.fromAccount(),
                    request.toAccount(),
                    request.amount(),
                    txId
            );
            return ResponseEntity.ok(Map.of(
                    "message", "Transfer Successful",
                    "transaction", result
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @Operation(summary = "Get Account Transaction History", description = "Fetches the complete ledger audit log of debit and credit transactions for an account.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Transaction history retrieved successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Missing or invalid JWT token", content = @Content),
            @ApiResponse(responseCode = "429", description = "Too Many Requests - Rate limit exceeded", content = @Content)
    })
    @GetMapping("/{accountNumber}/history")
    public ResponseEntity<?> getHistory(@PathVariable String accountNumber) {
        return ResponseEntity.ok(transactionService.getAccountHistory(accountNumber));
    }
}
