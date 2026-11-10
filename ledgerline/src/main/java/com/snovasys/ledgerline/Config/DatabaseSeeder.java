package com.snovasys.ledgerline.Config;

import com.snovasys.ledgerline.entity.Account;
import com.snovasys.ledgerline.entity.Role;
import com.snovasys.ledgerline.entity.User;
import com.snovasys.ledgerline.repository.AccountRepository;
import com.snovasys.ledgerline.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository,
                          AccountRepository accountRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        // 1. First-Admin Bootstrap Check
        boolean adminExists = userRepository.existsByRole(Role.ROLE_ADMIN) 
                || userRepository.findByEmail("admin@balancevault.com").isPresent();

        if (!adminExists) {
            User admin = new User();
            admin.setEmail("admin@balancevault.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole(Role.ROLE_ADMIN);
            userRepository.save(admin);
            System.out.println("🚀 [BalanceVault] Default Admin User seeded: admin@balancevault.com / admin123 (ROLE_ADMIN)");
        } else {
            System.out.println("ℹ️ [BalanceVault] Admin user already exists. Skipping admin seed.");
        }

        // 2. Demo Accounts Seeding (Alice & Bob)
        if (accountRepository.count() == 0) {
            Account alice = new Account();
            alice.setAccountNumber("1001");
            alice.setOwnerName("Alice");
            alice.setBalance(new BigDecimal("5000.0000"));

            Account bob = new Account();
            bob.setAccountNumber("1002");
            bob.setOwnerName("Bob");
            bob.setBalance(new BigDecimal("1000.0000"));

            accountRepository.save(alice);
            accountRepository.save(bob);
            System.out.println("✅ [BalanceVault] Initial Accounts (Alice: 1001 & Bob: 1002) Created Successfully!");
        }
    }
}

