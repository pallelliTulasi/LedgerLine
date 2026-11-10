# 🚀 BalanceVault

![BalanceVault Dashboard UI](Screenshot%202026-11-06%20144912.png)

**BalanceVault** is an enterprise-grade, high-concurrency distributed financial ledger and transaction management system built with **Spring Boot 3**, **React**, **PostgreSQL**, and **Redis**.

It provides atomic fund transfers, pessimistic locking with overdraft protection, strict idempotency guarantees, role-based access control (RBAC), distributed rate limiting via Bucket4j & Redis, and automated health monitoring.

### 🌐 Live Demo & Deployment
- **Frontend Live (Render):** [https://ledgerline-app.onrender.com](https://ledgerline-app.onrender.com)
- **Backend API (Render):** [https://ledgerline-backend-i99t.onrender.com](https://ledgerline-backend-i99t.onrender.com)

---

## 🛠️ Architecture & Tech Stack

### Backend
* **Framework:** Spring Boot 3 / 4.x (Java 17+)
* **Database & ORM:** PostgreSQL & Hibernate JPA with Pessimistic Locking (`PESSIMISTIC_WRITE`)
* **Security & RBAC:** Spring Security 6+ with Stateless JWT Tokens (`ROLE_USER`, `ROLE_ADMIN`)
* **Caching & Rate Limiting:** Redis & Bucket4j (20 req/min limit per IP or User ID)
* **API Documentation:** Springdoc OpenAPI / Swagger UI (`/swagger-ui.html`)
* **Observability:** Spring Boot Actuator (`/actuator/health`, `/actuator/info`)
* **Automated Testing:** JUnit 5 with multithreaded Concurrency & Idempotency verification

### Frontend
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS
* **Networking:** Axios with JWT Interceptors & 429 Rate-Limit Handling

---

## 📁 Project Structure

```
├── frontend/             # React + Vite frontend application
│   ├── src/
│   │   ├── App.jsx       # BalanceVault modern ledger dashboard
│   │   └── main.jsx
│   └── index.html        # BalanceVault HTML entrypoint
│
└── ledgerline/           # Spring Boot backend application
    ├── src/main/java/com/snovasys/ledgerline/
    │   ├── Config/
    │   │   ├── DatabaseSeeder.java      # First-admin bootstrap & account seeding
    │   │   ├── OpenApiConfig.java       # Swagger OpenAPI 3 configuration
    │   │   ├── RateLimitInterceptor.java# Bucket4j rate limiting (HTTP 429)
    │   │   ├── SecurityConfig.java      # Spring Security filter chain & RBAC
    │   │   └── WebConfig.java           # WebMvcConfigurer (CORS + Interceptors)
    │   ├── controller/
    │   │   ├── AccountController.java   # Balance inquiry APIs
    │   │   ├── AuthController.java      # Register & JWT login endpoints
    │   │   └── TransactionController.java # Idempotent transfer & history APIs
    │   ├── entity/
    │   │   ├── Account.java             # Account entity with balance & version
    │   │   ├── LedgerEntry.java         # Immutable ledger audit records
    │   │   ├── Role.java                # RBAC enum (ROLE_USER, ROLE_ADMIN)
    │   │   └── User.java                # UserDetails entity
    │   ├── repository/
    │   │   ├── AccountRepository.java   # Pessimistic locking queries
    │   │   ├── LedgerEntryRepository.java
    │   │   └── UserRepository.java
    │   ├── security/
    │   │   ├── JwtAuthenticationFilter.java # OncePerRequestFilter for Bearer tokens
    │   │   └── JwtService.java          # JJWT token generation and validation
    │   └── service/
    │       ├── RateLimitingService.java # Distributed Redis/Bucket4j rate limiter
    │       └── TransactionService.java  # Atomic idempotent transfers & locking
    └── src/test/java/
        └── com/snovasys/ledgerline/
            └── TransactionServiceTest.java # 50-thread concurrency & idempotency tests
```

---

## ✨ Key Features

### 1. Role-Based Access Control (RBAC) & First-Admin Bootstrap
* **Entities:** User model with `ROLE_USER` and `ROLE_ADMIN`. New user registrations automatically default to `ROLE_USER`.
* **DatabaseSeeder:** Implements `CommandLineRunner`. Automatically checks if an admin exists upon startup; if not, bootstraps the initial superadmin:
  * **Email:** `admin@balancevault.com`
  * **Password:** `admin123`
* **JWT Tokens:** Signed with HMAC-SHA256, carrying user subject and role claims.

### 2. Distributed Rate Limiting (Redis + Bucket4j)
* Configured for **20 requests per minute** per client IP or authenticated User ID.
* Intercepted via `RateLimitInterceptor` registered in `WebMvcConfigurer`.
* Automatically returns **HTTP `429 Too Many Requests`** with JSON details when the threshold is exceeded.
* Seamless graceful fallback to in-memory Bucket4j if Redis is temporarily unreachable.

### 3. Production Health Monitoring & OpenAPI Docs
* **Actuator:** Exposes `/actuator/health` and `/actuator/info` with database and Redis health indicators.
* **Swagger UI:** Interactive OpenAPI 3 interface with Bearer token authentication at `/swagger-ui.html`.

### 4. Concurrency Protection & Strict Idempotency
* **Pessimistic Locking:** `findByAccountNumberWithLock` acquires row-level locks in deterministic account-number order to eliminate deadlocks and prevent overdrafts.
* **Idempotency:** Accepts an optional client-supplied `transactionId`. If a duplicate request is re-transmitted (e.g. network retry), the system detects the existing record and **never deducts the balance twice**.

---

## 🧪 Automated Testing (JUnit 5)

Run backend tests using the Maven wrapper:
```bash
cd ledgerline
./mvnw test
```

### Verified Test Scenarios (`TransactionServiceTest`):
1. **Concurrency Stress Test (`testConcurrentTransfersMaintainBalanceConsistency`):**
   * Simulates **50 concurrent transfer requests** against a single sender account with ₹1000 balance using `ExecutorService` and `CountDownLatch`.
   * Exactly 40 transfers succeed (40 × ₹25 = ₹1000) and 10 are rejected with insufficient funds.
   * Guarantees zero overdraft and confirms that total system balance remains strictly conserved.
2. **Idempotency Test (`testIdempotentTransferDoesNotDeductBalanceTwice`):**
   * Submits identical transfer requests with the same `transactionId` twice.
   * Confirms the balance is only deducted once and only one ledger entry is generated.

---

## 🚀 How to Run Locally

### 1. Run Backend (Spring Boot)
```bash
cd ledgerline
./mvnw spring-boot:run
```
* **Base URL:** `http://localhost:8080`
* **Swagger UI:** `http://localhost:8080/swagger-ui.html`
* **Actuator Health:** `http://localhost:8080/actuator/health`

### 2. Run Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
* **Frontend UI:** `http://localhost:5173`
