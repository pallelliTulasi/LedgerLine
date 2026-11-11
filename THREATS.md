# 🛡️ Threat Model & Security Assurance Matrix (THREATS.md)

**Project:** BalanceVault (LedgerLine)  
**System Type:** High-Concurrency Financial Ledger & Distributed Transaction System  
**Framework:** Spring Boot 3 / React / PostgreSQL / Redis / Spring Security 6  

---

## 1. Threat Modeling Methodology

BalanceVault implements the **STRIDE** threat modeling framework to systematically identify and neutralize attack vectors targeting our financial ledger:

| Threat Category | Target Asset | Defense Strategy |
| :--- | :--- | :--- |
| **S**poofing | User Identity & Token Claims | Stateless HMAC-SHA256 JWT validation on every non-public endpoint |
| **T**ampering | Account Balances & Ledger Records | Pessimistic database locking (`PESSIMISTIC_WRITE`) & append-only immutable audit trail |
| **R**epudiation | Transaction History | Immutable `LedgerEntry` audit logs with client-verifiable UUIDs |
| **I**nformation Disclosure | Sensitive Customer Data & Secrets | Masked database credentials, environment variable isolation, CORS origin enforcement |
| **D**enial of Service | API Availability & Connection Pools | Distributed Token Bucket rate limiting (Bucket4j + Redis at 20 req/min) |
| **E**levation of Privilege | Administrative Operations | Strict Role-Based Access Control (`ROLE_USER` vs `ROLE_ADMIN`) |

---

## 2. Threat Analysis, Mitigations & Automated Test Mapping

### Threat 1: Race Conditions & Double-Spending (Concurrency Attack)
* **Threat Category:** Tampering / Invariant Violation
* **Attack Vector:** An attacker fires 50 concurrent HTTP POST transfer requests within milliseconds against an account with limited funds to exploit Time-Of-Check to Time-Of-Use (TOCTOU) latency and trigger an overdraft.
* **Impact:** Balance drops below zero; total system money is not conserved; ledger corrupts.
* **Mitigation in Code:** 
  1. `AccountRepository.findByAccountNumberWithLock()` executes `SELECT ... FOR UPDATE` row-level pessimistic locks (`LockModeType.PESSIMISTIC_WRITE`).
  2. Accounts are locked in **deterministic account-number order** (`fromAcc.compareTo(toAcc) < 0 ? lock(from) then lock(to) : lock(to) then lock(from)`) to eliminate database deadlocks under bi-directional concurrent traffic.
  3. Entire transfer lifecycle is wrapped inside `@Transactional(isolation = Isolation.READ_COMMITTED)`.
* **Automated Test:** `TransactionServiceTest.testConcurrentTransfersMaintainBalanceConsistency`
  - Simulates 50 simultaneous threads attacking a ₹1,000 balance with ₹25 transfers.
  - Verifies exactly 40 succeed, 10 fail, zero overdraft occurs, and total system balance is 100% conserved.

---

### Threat 2: Broken Object-Level Authorization (IDOR) & Sender Account Spoofing
* **Threat Category:** Spoofing / Elevation of Privilege
* **Attack Vector:** An authenticated attacker tampers with the HTTP request body `{"fromAccount": "1001", "toAccount": "1002", "amount": 500}` by substituting the `fromAccount` of another customer (e.g. Alice) to steal their funds.
* **Impact:** Direct financial theft between accounts without victim authorization.
* **Mitigation in Code:**
  1. `JwtAuthenticationFilter` extracts and cryptographically validates the caller's JWT token.
  2. The server extracts the authenticated `Principal` and verifies that the `fromAccount` belongs to the authenticated user (or checks for `ROLE_ADMIN` permissions).
  3. Client-supplied sender claims are never blindly trusted.
* **Automated Test:** `TransactionSecurityTest.testUserCannotTransferFromAnotherUsersAccount`
  - Attempts to initiate a transfer specifying another user's account number as `fromAccount`.
  - Asserts that the request is rejected with `HTTP 403 Forbidden` or `IllegalArgumentException`.

---

### Threat 3: Replay Attacks & Network Duplicate Requests (Idempotency Failure)
* **Threat Category:** Tampering / Repudiation
* **Attack Vector:** Due to network latency or malicious packet resending, a valid fund transfer request is transmitted twice with the same idempotency key.
* **Impact:** The recipient is credited twice and the sender is debited twice for a single real-world transfer intent.
* **Mitigation in Code:**
  1. `TransactionController` accepts an optional client-generated `transactionId` (UUID).
  2. `TransactionService.processTransfer()` queries `ledgerRepo.findByTransactionId(txId)`.
  3. If an existing record is found, the system immediately returns the previous `LedgerEntry` **without re-deducting the balance**.
* **Automated Test:** `TransactionServiceTest.testIdempotentTransferDoesNotDeductBalanceTwice`
  - Submits identical transfer requests with the same `transactionId` consecutively.
  - Verifies that balance is deducted exactly once, only one ledger entry exists, and the second call safely returns the existing record.

---

### Threat 4: Audit Trail Tampering & Historic Record Alteration
* **Threat Category:** Tampering / Repudiation
* **Attack Vector:** An attacker attempts to alter transaction timestamps, modify transfer amounts, or delete incriminating transfer records to hide illicit fund movements.
* **Impact:** Loss of financial integrity, failure of legal audit compliance, inability to reconstruct account balance history.
* **Mitigation in Code:**
  1. `LedgerEntry` entity fields are declared with `updatable = false` and immutable timestamps.
  2. The REST API exposes **no update (`PUT`/`PATCH`) or delete (`DELETE`) endpoints** on `/api/transactions/**`.
  3. Balance calculations can always be verified against the linear sum of debit and credit ledger records.
* **Automated Test:** `TransactionSecurityTest.testLedgerAuditEntriesAreImmutable`
  - Validates that ledger records cannot be overwritten and that the repository only permits append operations.

---

### Threat 5: Negative, Zero, and Extreme Precision Amount Manipulation
* **Threat Category:** Tampering
* **Attack Vector:** An attacker submits transfer requests with negative amounts (`{"amount": -500.00}`) to invert the accounting logic (crediting the sender and debiting the receiver), zero amounts (`0.00`), or fractional precision exploit payloads (`0.00000001`).
* **Impact:** Inverse balance theft, database constraint exceptions, rounding loss exploitation.
* **Mitigation in Code:**
  1. Strict input validation in `TransactionService.processTransfer`:
     ```java
     if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
         throw new IllegalArgumentException("Transfer amount must be positive.");
     }
     ```
  2. Amounts are stored and processed strictly using `java.math.BigDecimal` with fixed 4-decimal precision (`precision = 19, scale = 4`), completely eliminating IEEE 754 floating-point rounding vulnerabilities.
* **Automated Test:** `TransactionSecurityTest.testNegativeOrZeroTransferRejected`
  - Submits negative and zero amounts and verifies immediate rejection with descriptive errors.

---

### Threat 6: Denial of Service (DoS) & API Brute-Force Flooding
* **Threat Category:** Denial of Service
* **Attack Vector:** High-frequency botnet scripts flood `/api/transactions/transfer` or `/api/accounts/{id}/balance` with thousands of requests per second to exhaust database connection pools and tie up row locks.
* **Impact:** System unresponsiveness, connection starvation, denial of service for legitimate customers.
* **Mitigation in Code:**
  1. Distributed Token Bucket rate limiting via `Bucket4j` and Redis in `RateLimitInterceptor`.
  2. Enforces a strict quota of **20 requests per minute** per client IP or authenticated User ID.
  3. When exceeded, the filter immediately aborts request execution and responds with **HTTP `429 Too Many Requests`** along with rate limit headers (`X-Rate-Limit-Remaining`, `X-Rate-Limit-Retry-After-Seconds`).
  4. Graceful in-memory fallback ensures protection remains active even if Redis is unreachable.
* **Automated Test:** `TransactionSecurityTest.testRateLimitingEnforced`
  - Fires rapid requests exceeding 20 req/min and verifies that the 21st request receives HTTP 429.

---

### Threat 7: Privilege Escalation & Admin Route Exposure
* **Threat Category:** Elevation of Privilege
* **Attack Vector:** A user with standard credentials (`ROLE_USER`) sends requests directly to administrative endpoints (`/admin/**` or `/api/admin/**`) or attempts to tamper with other user roles.
* **Impact:** Unauthorized administrative configuration changes, exposure of confidential user accounts.
* **Mitigation in Code:**
  1. Spring Security filter chain explicitly enforces `hasRole('ADMIN')` on all administrative paths.
  2. First-admin user is securely seeded by `DatabaseSeeder` on boot (`admin@balancevault.com`), while all self-registrations via `/api/auth/register` are hardcoded to default to `ROLE_USER`.
  3. `@EnableMethodSecurity` allows granular authorization guards on sensitive service methods.
* **Automated Test:** `TransactionSecurityTest.testRegularUserCannotAccessAdminEndpoints`
  - Authenticates as `ROLE_USER` and attempts to query `/admin` routes; asserts `HTTP 403 Forbidden`.

---

## 3. Production Environment & Secrets Defense

| Security Concern | Risk | Production Solution |
| :--- | :--- | :--- |
| **Database Credentials** | Hardcoded secrets committed to public GitHub | Read strictly from environment variable `DATABASE_URL` / `DB_PASSWORD` in `DataSourceConfig.java` |
| **JWT Signing Secret** | Weak or predictable signature compromise | 256-bit secret loaded via `${balancevault.jwt.secret}` from environment configuration |
| **CORS Policy** | Cross-Origin CSRF / API exploitation | Explicit allowed origins (`localhost:5173`, `*.onrender.com`, `*.vercel.app`) with pre-flight caching |
| **Transport Security** | Man-in-the-Middle (MitM) credential interception | Enforced HTTPS / TLS across all Render public endpoints |
