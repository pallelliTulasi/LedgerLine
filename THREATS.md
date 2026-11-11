# 🛡️ Threat Model & Security Assurance Matrix

**Project:** BalanceVault (LedgerLine)  
**System Type:** Financial Ledger & Transaction Management System  
**Tech Stack:** Spring Boot 3, React, PostgreSQL, Redis, Spring Security 6

## 1. Threat Modeling Approach

While building BalanceVault, I wanted to think beyond just making the application work. Since it handles financial transactions, I also needed to consider what could go wrong if someone tried to misuse the system.

I used the **STRIDE threat modeling framework** to identify possible security risks and understand how to protect the application.

STRIDE helped me look at six main areas:

| Threat Category | What Could Go Wrong | How I Addressed It |
|---|---|---|
| **Spoofing** | Someone tries to use another person's identity. | JWT validation and authenticated user checks. |
| **Tampering** | Someone tries to modify account balances or transaction records. | Database locking and protected ledger records. |
| **Repudiation** | A user denies making a transaction. | Persistent transaction history with unique transaction IDs. |
| **Information Disclosure** | Sensitive customer information or credentials become exposed. | Environment variables, protected configuration, and CORS restrictions. |
| **Denial of Service** | Too many requests make the application unavailable. | Rate limiting using Bucket4j and Redis. |
| **Elevation of Privilege** | A normal user tries to access administrator features. | Role-based access control using Spring Security. |

The following sections explain the threats I considered, how I addressed them, and the tests used to check the protections.

---

## 2. Threat Analysis & Security Testing

### Threat 1: Concurrent Transfers and Double-Spending

**Threat Category:** Tampering / Financial Integrity

**What could happen?**

Imagine an account has only ₹1,000. Someone sends multiple transfer requests at almost the same time.

If the application checks the available balance before properly handling concurrent requests, multiple transactions might use the same initial balance. This could result in an overdraft or incorrect account balances.

**How I addressed it:**

I used database-level pessimistic locking to prevent conflicting transactions from modifying the same account simultaneously.

My implementation includes:

1. `AccountRepository.findByAccountNumberWithLock()` uses `LockModeType.PESSIMISTIC_WRITE` to lock the required account rows.
2. Accounts are locked in a consistent order based on their account numbers. This helps prevent deadlocks when two accounts transfer money to each other.
3. The transfer operation runs inside a `@Transactional(isolation = Isolation.READ_COMMITTED)` method.

**How I tested it:**

I created a concurrency test called `TransactionServiceTest.testConcurrentTransfersMaintainBalanceConsistency`.

The test simulates 50 threads attempting ₹25 transfers from an account containing ₹1,000.

It checks that:
- Exactly 40 transfers succeed.
- The remaining 10 transfers fail.
- The account never goes below zero.
- The total balance across the system remains unchanged.

---

### Threat 2: Unauthorized Account Access (IDOR)

**Threat Category:** Spoofing / Elevation of Privilege

**What could happen?**

An authenticated user might try to transfer money from someone else's account by changing the sender account number in the request.

For example:

```json
{
  "fromAccount": "1001",
  "toAccount": "1002",
  "amount": 500
}
```

If account `1001` belongs to another customer, the application must not allow the request simply because the attacker knows the account number.

**How I addressed it:**

I added ownership verification as part of the transfer process.

1. `JwtAuthenticationFilter` validates the user's JWT.
2. The backend identifies the authenticated user through the security principal.
3. Before processing the transfer, the application checks whether the sender account belongs to that user.
4. Administrative access is handled separately through `ROLE_ADMIN` permissions.

The important point is that the backend doesn't blindly trust account details received from the frontend.

**How I tested it:**

I added `TransactionSecurityTest.testUserCannotTransferFromAnotherUsersAccount`.

The test attempts to transfer money using another user's account number and checks that the request is rejected with HTTP 403 Forbidden or the expected validation error.

---

### Threat 3: Duplicate Requests and Replay Attacks

**Threat Category:** Tampering / Repudiation

**What could happen?**

Sometimes a network request fails or takes too long to return a response. The frontend or user might submit the same transfer request again.

Without proper protection, the same transaction could be processed twice, causing duplicate deductions and credits.

**How I addressed it:**

I implemented idempotency using a unique transaction ID.

1. `TransactionController` accepts a client-generated transaction ID (UUID).
2. `TransactionService.processTransfer()` checks the database using `ledgerRepo.findByTransactionId(txId)`.
3. If the transaction already exists, the application returns the existing ledger record instead of processing the transfer again.

This helps ensure that retrying the same request doesn't result in another deduction.

**How I tested it:**

I added `TransactionServiceTest.testIdempotentTransferDoesNotDeductBalanceTwice`.

The test submits the same transfer request twice with the same transaction ID and checks that:

- The balance is deducted only once.
- Only one ledger entry is created.
- The second request returns the existing transaction record.

---

### Threat 4: Transaction History Modification

**Threat Category:** Tampering / Repudiation

**What could happen?**

Someone might try to modify an existing transaction, change its timestamp or amount, or delete a record to hide an unauthorized transfer.

For a financial application, this is a serious problem because transaction history must remain reliable.

**How I addressed it:**

I designed the ledger to preserve transaction records rather than allowing users to modify or delete historical entries.

My implementation includes:

1. `LedgerEntry` fields configured with `updatable = false` where applicable.
2. No REST API update (`PUT`/`PATCH`) or delete (`DELETE`) endpoints for `/api/transactions/**`.
3. Transaction records that can be used to verify account movements through debit and credit entries.

**How I tested it:**

I added `TransactionSecurityTest.testLedgerAuditEntriesAreImmutable`.

The test checks that existing ledger records cannot be overwritten through the application's supported persistence operations.

---

### Threat 5: Invalid Transaction Amounts

**Threat Category:** Tampering / Input Validation

**What could happen?**

An attacker might submit unexpected amounts, such as:

- Negative amounts: `-500.00`
- Zero amounts: `0.00`
- Extremely small fractional values: `0.00000001`

If these values aren't validated, they could cause incorrect accounting operations or unexpected rounding behavior.

**How I addressed it:**

I added validation in `TransactionService.processTransfer()` to reject null, zero, and negative amounts.

```java
if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
    throw new IllegalArgumentException("Transfer amount must be positive.");
}
```

I also used Java's `BigDecimal` instead of floating-point types for financial calculations.

The database stores amounts with a precision of 19 digits and a scale of 4 decimal places.

This avoids common floating-point representation problems and gives better control over financial precision.

**How I tested it:**

I added `TransactionSecurityTest.testNegativeOrZeroTransferRejected`.

The test submits negative and zero amounts and verifies that the application rejects them.

---

### Threat 6: API Flooding and Denial of Service

**Threat Category:** Denial of Service

**What could happen?**

A bot or automated script could send a large number of requests to endpoints such as:

- `/api/transactions/transfer`
- `/api/accounts/{id}/balance`

Too many requests could consume database connections, increase server load, and affect normal users.

**How I addressed it:**

I implemented rate limiting using Bucket4j and Redis.

The configuration:

1. Uses a distributed Token Bucket approach.
2. Limits requests to 20 per minute per client IP or authenticated user ID.
3. Returns HTTP `429 Too Many Requests` when the limit is exceeded.
4. Provides rate-limit response headers such as `X-Rate-Limit-Remaining` and `X-Rate-Limit-Retry-After-Seconds`.
5. Includes an in-memory fallback when Redis is unavailable.

**How I tested it:**

I added `TransactionSecurityTest.testRateLimitingEnforced`.

The test sends requests beyond the configured limit and checks whether the 21st request receives HTTP 429.

---

### Threat 7: Unauthorized Admin Access

**Threat Category:** Elevation of Privilege

**What could happen?**

A normal user might try to access administrator endpoints directly by entering an admin API URL or modifying an HTTP request.

For example, a user with `ROLE_USER` should never be able to access administrative operations.

**How I addressed it:**

I used Spring Security's role-based access control to separate normal user operations from administrator operations.

My implementation includes:

1. `hasRole('ADMIN')` restrictions for administrative routes.
2. A `DatabaseSeeder` to create the initial administrator account (`admin@balancevault.com`).
3. New registrations through `/api/auth/register` receive `ROLE_USER` by default.
4. `@EnableMethodSecurity` for additional authorization checks at the method level.

**How I tested it:**

I added `TransactionSecurityTest.testRegularUserCannotAccessAdminEndpoints`.

The test authenticates as a normal user and attempts to access administrative endpoints. The expected response is HTTP 403 Forbidden.

---

## 3. Production Security & Secrets Management

Apart from application-level threats, I also considered how sensitive information and application settings should be handled during deployment.

| Security Concern | Possible Risk | How I Addressed It |
|---|---|---|
| Database Credentials | Database credentials exposed in public source code. | Read credentials from environment variables such as `DATABASE_URL` and `DB_PASSWORD` through `DataSourceConfig.java`. |
| JWT Signing Secret | Weak or exposed JWT signing key. | Load the 256-bit signing secret through `${balancevault.jwt.secret}` from environment configuration. |
| CORS Configuration | Unauthorized cross-origin requests. | Configure specific allowed origins, methods, and headers. |
| Network Communication | Credentials or transaction data intercepted during transmission. | Use HTTPS/TLS for public Render endpoints. |

### Additional Security Considerations

- Sensitive credentials are kept outside the source code.
- JWT validation is performed before protected operations.
- User and administrator permissions are handled separately.
- Transaction history is maintained in the database.
- Database locking helps protect account balances during concurrent transfers.
- Rate limiting helps control excessive API requests.

---

## 4. Final Thoughts

Working on BalanceVault made me think more carefully about the security side of backend development.

Initially, my focus was on implementing features such as user authentication, account management, and money transfers. As development progressed, I started considering questions like:

- What happens if two transfers happen at exactly the same time?
- Can one user access another user's account?
- What happens if the same request is submitted twice?
- Can someone modify an existing transaction?
- How should the application handle too many API requests?
- Can a normal user access administrator features?

These questions helped me identify potential weaknesses and improve the implementation.

I used STRIDE as a way to organize the threats, connect them to actual code-level protections, and verify the behavior through automated tests.

**My goal was not just to build a working financial application, but to understand the security risks involved and address them as part of the development process.**
