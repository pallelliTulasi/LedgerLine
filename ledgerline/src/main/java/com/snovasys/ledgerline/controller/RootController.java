package com.snovasys.ledgerline.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Root and Health Check Controller.
 * Provides instant 200 OK responses for cloud health checks (Render, AWS, etc.).
 */
@RestController
public class RootController {

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "BalanceVault API",
                "version", "1.0.0",
                "docs", "/swagger-ui/index.html",
                "timestamp", Instant.now().toString()
        ));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "BalanceVault"
        ));
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, String>> apiHealth() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "BalanceVault"
        ));
    }
}

