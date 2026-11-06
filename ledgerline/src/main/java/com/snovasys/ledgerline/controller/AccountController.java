package com.snovasys.ledgerline.controller;

import com.snovasys.ledgerline.repository.AccountRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
@CrossOrigin(origins = "*")
public class AccountController {
    private final AccountRepository accountRepository;

    public AccountController(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @GetMapping("/{accountNumber}/balance")
    public ResponseEntity<?> getBalance(@PathVariable String accountNumber) {
        return accountRepository.findByAccountNumber(accountNumber)
                .map(account -> ResponseEntity.ok(account))
                .orElse(ResponseEntity.notFound().build());
    }
}