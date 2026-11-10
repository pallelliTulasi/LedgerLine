# 🚀 BalanceVault

![BalanceVault Dashboard UI](Screenshot%202026-11-06%20144912.png)

**BalanceVault** is an enterprise-grade, high-concurrency distributed financial ledger and transaction management system built with **Spring Boot 3**, **React**, **PostgreSQL**, and **Redis**.

It provides atomic fund transfers, pessimistic locking with overdraft protection, strict idempotency guarantees, role-based access control (RBAC), distributed rate limiting via Bucket4j & Redis, and automated health monitoring.

### 🌐 Live Demo & Deployment
- **Frontend Live (Render):** [https://ledgerline-app.onrender.com](https://ledgerline-app.onrender.com)
- **Backend API (Render):** [https://ledgerline-backend-i99t.onrender.com](https://ledgerline-backend-i99t.onrender.com)
- **Swagger Docs (Production):** [https://ledgerline-backend-i99t.onrender.com/swagger-ui.html](https://ledgerline-backend-i99t.onrender.com/swagger-ui.html)
- **Actuator Health (Production):** [https://ledgerline-backend-i99t.onrender.com/actuator/health](https://ledgerline-backend-i99t.onrender.com/actuator/health)

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
* **Design System:** BalanceVault Dark Forest Green (`#0f2d20`) & Off-White (`#f8f9f6`)
* **Layout:** Sidebar Navigation (Overview, Accounts, Statements, Account Request) + Split-Screen Auth
* **Styling:** Tailwind CSS
* **Networking:** Axios with JWT Bearer Interceptors & 429 Rate-Limit Handling

---

## 📁 Project Structure

```
├── Dockerfile                # Multi-stage production Docker build (OpenJDK 17)
├── docker-compose.yml        # PostgreSQL 15, Redis 7, and Backend orchestration
├── render.yaml               # Infrastructure-as-code Blueprint for Render cloud
│
├── frontend/                 # React + Vite frontend application
│   ├── src/
│   │   ├── App.jsx           # BalanceVault modern ledger dashboard & split-screen auth
│   │   ├── components/Navbar.jsx
│   │   └── main.jsx
│   └── index.html            # BalanceVault HTML entrypoint
│
└── ledgerline/               # Spring Boot backend application
    ├── Dockerfile            # Sub-module Dockerfile
    ├── pom.xml               # Dependencies (Actuator, OpenAPI, Redis, Bucket4j)
    ├── src/main/java/com/snovasys/ledgerline/
    │   ├── Config/
    │   │   ├── DatabaseSeeder.java        # First-admin bootstrap & demo accounts
    │   │   ├── OpenApiConfig.java         # Swagger OpenAPI 3 configuration
    │   │   ├── RateLimitInterceptor.java  # Bucket4j rate limiting (HTTP 429)
    │   │   ├── SecurityConfig.java        # Spring Security filter chain & CORS
    │   │   └── WebConfig.java             # WebMvcConfigurer (Interceptors)
    │   ├── controller/
    │   │   ├── AccountController.java     # Balance inquiry APIs
    │   │   ├── AuthController.java        # Register & JWT login endpoints
    │   │   └── TransactionController.java # Idempotent transfer & history APIs
    │   ├── entity/
    │   │   ├── Account.java               # Account entity with balance & version
    │   │   ├── LedgerEntry.java           # Immutable ledger audit records
    │   │   ├── Role.java                  # RBAC enum (ROLE_USER, ROLE_ADMIN)
    │   │   └── User.java                  # UserDetails entity
    │   ├── repository/
    │   │   ├── AccountRepository.java     # Pessimistic locking queries
    │   │   ├── LedgerEntryRepository.java
    │   │   └── UserRepository.java
    │   ├── security/
    │   │   ├── JwtAuthenticationFilter.java # OncePerRequestFilter for Bearer tokens
    │   │   └── JwtService.java            # JJWT token generation and validation
    │   └── service/
    │       ├── RateLimitingService.java   # Distributed Redis/Bucket4j rate limiter
    │       └── TransactionService.java    # Atomic idempotent transfers & locking
    └── src/test/java/
        └── com/snovasys/ledgerline/
            └── TransactionServiceTest.java # 50-thread concurrency & idempotency tests
```

---

## ✨ Key Features & Seeded Credentials

### 1. Default First-Admin & Pre-Seeded Accounts
`DatabaseSeeder` implements `CommandLineRunner` to automatically bootstrap on first boot:
| Type | Identifier / Email | Password | Role / Starting Balance |
| :--- | :--- | :--- | :--- |
| **Admin User** | `admin@balancevault.com` | `admin123` | `ROLE_ADMIN` |
| **Primary Account** | `#1001` (Alice) | N/A | `₹5,000.00` |
| **Secondary Account** | `#1002` (Bob) | N/A | `₹1,000.00` |

*New signups through the UI or `/api/auth/register` automatically default to `ROLE_USER`.*

### 2. Distributed Rate Limiting (Redis + Bucket4j)
* Configured for **20 requests per minute** per client IP or authenticated User ID.
* Intercepted via `RateLimitInterceptor` registered in `WebMvcConfigurer`.
* Automatically returns **HTTP `429 Too Many Requests`** with JSON details when the threshold is exceeded.
* Seamless graceful fallback to in-memory Bucket4j if Redis is temporarily unreachable.

### 3. Concurrency Protection & Strict Idempotency
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
* **Base URL:** `http://localhost:8085`
* **Swagger UI:** `http://localhost:8085/swagger-ui.html`
* **Actuator Health:** `http://localhost:8085/actuator/health`

### 2. Run Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
* **Frontend UI:** `http://localhost:5173`

---

## 🐳 Docker & Docker Compose

To run the full stack (PostgreSQL, Redis, and Spring Boot Backend) with a single command:
```bash
docker compose up --build -d
```

---

## ☁️ Cloud Deployment (Render.com)

The project includes pre-configured **`render.yaml`** blueprints and Dockerfiles for zero-friction deployment to Render:

### Deploy via Render Blueprint (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/) -> **New +** -> **Blueprint**.
2. Connect `https://github.com/pallelliTulasi/LedgerLine.git`.
3. Render reads `render.yaml` and deploys:
   - **PostgreSQL Database** (`balancevault-db`)
   - **Spring Boot Backend** (`balancevault-backend`)
   - **React Frontend** (`balancevault-frontend`)

### Deploy Manually on Render (Web Service)
* **Environment:** `Docker` (or `Java 17`)
* **Root Directory:** `ledgerline` (or leave blank if using root Dockerfile)
* **DockerfilePath:** `./Dockerfile` (or `./ledgerline/Dockerfile`)
* **Health Check Path:** `/health`
* **Environment Variables:**
  - `PORT`: `8085` (Render assigns its own port dynamically)
  - `DATABASE_URL`: Your Render PostgreSQL Internal Connection String (e.g. `postgresql://...`)
  - `MANAGEMENT_HEALTH_REDIS_ENABLED`: `false` (when running without managed Redis)
