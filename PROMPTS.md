# 🧠 AI Prompts & Development Journey

**Project:** BalanceVault (LedgerLine)  
**Author:** Pallelli Lakshmi Tulasi  
**Repository:** [LedgerLine – GitHub](https://github.com/pallelliTulasi/LedgerLine)

## About This Document

This document explains how I used AI tools while developing BalanceVault (LedgerLine).

I used AI to get initial suggestions, understand technical problems, and speed up development. However, I didn't blindly accept everything it generated. I reviewed the code, identified issues, made changes where necessary, and tested the solutions.

For each entry, I've included the prompt I used, what the AI suggested, what I found wrong with it, how I fixed it, and the related Git commit.

---

## Entry 1: November 6, 2026 – JWT Authentication & Role-Based Access Control

**Target Category:** Authorization & Access Control

### What I asked

> Write a Spring Security configuration with JWT authentication and role-based access control for a Spring Boot 3 application.

### What the AI suggested

The AI initially generated a Spring Security configuration using `WebSecurityConfigurerAdapter`, `.antMatchers()`, HTTP Basic authentication, and a hardcoded JWT secret.

### What I found wrong

The suggested approach was outdated. `WebSecurityConfigurerAdapter` has been removed in Spring Security 6, which is used with Spring Boot 3. So, the code would not work in my project.

Hardcoding the JWT secret was another security risk because anyone accessing the source code could potentially see it. Also, the default session configuration wasn't suitable for a stateless REST API.

### How I fixed it

I replaced the old configuration with the modern `SecurityFilterChain` approach and configured `SessionCreationPolicy.STATELESS`.

I moved the JWT secret to environment-based configuration instead of keeping it directly in the Java code.

I also implemented:

- `JwtAuthenticationFilter` using `OncePerRequestFilter`.
- `JwtService` using JJWT version `0.12.5`.
- Role-based access control for `ROLE_USER` and `ROLE_ADMIN`.

This gave me a more suitable authentication and authorization setup for a Spring Boot 3 application.

**Git Commit:** [View Commit](https://github.com/pallelliTulasi/LedgerLine/commit/b368f88e938b1e50d308ace7b3ec1c9bc0d1de7b)

---

## Entry 2: November 6, 2026 – Transaction History & Idempotency

**Target Category:** Audit Trail & Data Integrity

### What I asked

> How can I transfer money between accounts in Spring Boot and maintain a proper transaction history?

### What the AI suggested

The AI generated a basic transfer method that directly updated account balances and used `System.out.println()` to display transaction details in the console.

### What I found wrong

Printing transaction details in the console is not the same as maintaining a proper audit trail. Those messages aren't permanently stored in the database.

I also noticed a more serious problem: the transfer wasn't atomic. If the application failed after deducting money from one account but before crediting the other, the account balances could become inconsistent.

There was also no protection against duplicate requests. If the same transfer request was submitted again, the amount could potentially be deducted twice.

### How I fixed it

I created a `LedgerEntry` entity to store transaction details such as:

- Transaction ID
- Sender and receiver account numbers
- Transfer amount
- Transaction status
- Timestamp

I also created a `LedgerEntryRepository` to manage these records.

I used `@Transactional` with `Isolation.READ_COMMITTED` to make the transfer operation part of a database transaction.

For duplicate requests, I added an idempotency check using `findByTransactionId()`. This allows the application to identify an already processed transaction instead of processing the same transfer again.

This helped me maintain a proper transaction history and improve data consistency.

**Git Commit:** [View Commit](https://github.com/pallelliTulasi/LedgerLine/commit/9b6513a9047453073dbea1c590d5c0715c349041)

---

## Entry 3: November 6, 2026 – Fixing CORS Issues in Spring Security

**Target Category:** Access Control & Network Security

### What I asked

> My React frontend hosted on Render is showing an AxiosError: Network Error when calling my Spring Boot backend. How can I fix this?

### What the AI suggested

The AI suggested adding `@CrossOrigin(origins = "*")` to the REST controller classes.

### What I found wrong

That suggestion didn't address the actual problem.

Spring Security processes incoming requests through its filter chain before they reach the Spring MVC controllers.

When the browser sends an `OPTIONS` preflight request, Spring Security can reject it before the controller-level `@CrossOrigin` annotation gets a chance to handle it.

Using a wildcard origin with credentials is also not allowed by browser CORS rules.

### How I fixed it

Instead of adding CORS annotations to individual controllers, I configured CORS centrally.

I created a `CorsConfigurationSource` bean and integrated it directly with the `SecurityFilterChain`.

I also:

- Allowed `OPTIONS` preflight requests using `requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()`.
- Added specific allowed origins for local development and deployed frontend applications.
- Configured permitted HTTP methods and headers.
- Exposed the required rate-limit headers.

This made the CORS configuration more consistent and easier to maintain.

**Git Commit:** [View Commit](https://github.com/pallelliTulasi/LedgerLine/commit/7e92b8fc57ec718e2fe13b19280dff863b12368d)

---

## Entry 4: November 6, 2026 – Database Configuration & Environment Variables

**Target Category:** Secrets Management & Production Resilience

### What I asked

> Give me the application.properties configuration to connect my Spring Boot application to Render PostgreSQL.

### What the AI suggested

The AI provided a basic database configuration with a fixed JDBC URL, username, and password.

```properties
spring.datasource.url=jdbc:postgresql://ep-xyz.render.com:5432/ledgerline_db
spring.datasource.username=user
spring.datasource.password=secret123
```

### What I found wrong

Keeping database credentials directly in the configuration file is risky, especially when the project is hosted on a public GitHub repository.

I also found that Render provides database connection URLs in a format such as `postgres://user:password@host:port/database`.

Spring Boot's standard JDBC configuration expects a JDBC URL with the `jdbc:postgresql://` prefix, so the connection URL needed to be converted.

### How I fixed it

I created a custom `DataSourceConfig` class to handle database configuration dynamically.

The configuration checks the available environment variables and uses an embedded H2 database when no external database configuration is provided.

For the cloud database, I added logic to convert the PostgreSQL connection URL into the JDBC format and extract the required connection details.

This allowed me to use the same application in local development and cloud deployment without keeping database credentials in the source code.

**Git Commit:** [View Commit](https://github.com/pallelliTulasi/LedgerLine/commit/ad1aa2b0ef4c9fbafbb86e58f0004ff04f46ab21)

---

## Entry 5: November 10, 2026 – Handling Concurrent Transactions

**Target Category:** Authorization, Audit Trail & Financial Integrity

### What I asked

> How can I handle multiple users transferring money at the same time without causing errors or incorrect account balances?

### What the AI suggested

The AI suggested using Java's `synchronized` keyword on the transfer service method.

### What I found wrong

Although `synchronized` can prevent multiple threads from executing a method simultaneously within a single JVM, it isn't a reliable solution for a cloud application running multiple instances.

For example, if the application runs on two different server instances, each instance has its own JVM. A synchronized method in one instance cannot control access in the other.

It also creates a performance problem because all transfers would have to wait for one another, even when they involve completely different accounts.

### How I fixed it

I moved the concurrency control to the database level.

I implemented pessimistic row locking using `@Lock(LockModeType.PESSIMISTIC_WRITE)` in the `AccountRepository`.

I also introduced a consistent account-locking order using account numbers (`fromAcc.compareTo(toAcc)`) to reduce the possibility of deadlocks when two accounts transfer money to each other simultaneously.

To verify the implementation, I wrote a 50-thread concurrency test in `TransactionServiceTest`.

The test checks that concurrent transfers don't cause overdrafts and that the total balance remains consistent.

This helped me understand why database-level locking is important in financial applications.

**Git Commit:** [View Commit](https://github.com/pallelliTulasi/LedgerLine/commit/b368f88e938b1e50d308ace7b3ec1c9bc0d1de7b)

---

## Entry 6: November 10, 2026 – Docker Deployment & Memory Optimization

**Target Category:** Infrastructure, Reliability & Cloud Deployment

### What I asked

> Create a Dockerfile and render.yaml configuration to deploy my Spring Boot backend on Render's free tier.

### What the AI suggested

The AI initially generated a single-stage Dockerfile that copied the project source code and ran `mvn spring-boot:run` directly inside the container.

It also didn't include JVM memory settings or a proper health-check endpoint.

### What I found wrong

Running the application through Maven in production adds unnecessary overhead.

In my deployment setup, the build and runtime configuration needed to account for Render's 512 MB memory limit. Without proper memory optimization, the application could run out of memory and crash.

I also needed a health-check endpoint so the deployment platform could verify whether the application was running properly.

### How I fixed it

I replaced the single-stage Dockerfile with a multi-stage build.

The first stage uses Eclipse Temurin 17 JDK to build the application, while the second stage uses a lightweight JRE image to run the generated JAR file.

I also:

- Optimized the Docker image and generated a runnable JAR.
- Added JVM memory-related flags in `render.yaml`, including `-XX:+UseContainerSupport` and `-XX:MaxRAMPercentage=75.0`.
- Added `-XX:+ExitOnOutOfMemoryError` for better failure handling.
- Created a dedicated `/health` endpoint in `RootController` for deployment health checks.

These changes made the deployment setup more suitable for a resource-constrained cloud environment.

**Git Commit:** [View Commit](https://github.com/pallelliTulasi/LedgerLine/commit/1b0786a60db882a17f6443c68eafe01947e4526d)

---

## Final Note

Building BalanceVault was a learning experience for me, especially because it involved handling money transfers, security, database consistency, and cloud deployment.

AI helped me get started with different implementations, but reviewing its suggestions was equally important. I had to understand why certain approaches wouldn't work, identify potential problems, and make the necessary changes.

Through this process, I learned that using AI in development isn't just about generating code. It's also about questioning the output, understanding the underlying concepts, testing the implementation, and taking responsibility for the final result.

**That's the approach I followed while developing BalanceVault.**
