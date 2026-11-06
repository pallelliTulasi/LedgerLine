package com.snovasys.ledgerline.Config;

// Ee rendu imports add chesam
import com.snovasys.ledgerline.entity.Account;
import com.snovasys.ledgerline.repository.AccountRepository;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.math.BigDecimal;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(AccountRepository accountRepository) {
        return args -> {
            // Already accounts unte malli create cheyyakunda check chestunnam
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
                System.out.println("✅ Dummy Accounts (Alice & Bob) Created Successfully!");
            }
        };
    }
}