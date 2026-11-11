# 🚀 BalanceVault

![BalanceVault Dashboard UI](Screenshot%202026-11-11%20173320.png)

**BalanceVault** is a financial ledger and transaction management application built using Spring Boot 3, React, PostgreSQL, and Redis.

I built this project to understand how financial applications handle money transfers, account balances, security, and multiple transactions happening at the same time.

The application supports atomic fund transfers, database-level locking, overdraft protection, idempotency, JWT authentication, role-based access control, distributed rate limiting, and health monitoring.

## 🌐 Live Demo & Deployment

- **Frontend:** [BalanceVault Live](https://ledgerline-abfd.onrender.com)
- **Backend API:** [Backend API](https://ledgerline-backend-i99t.onrender.com)
- **Swagger Documentation:** [API Documentation](https://ledgerline-backend-i99t.onrender.com/swagger-ui.html)
- **Actuator Health:** [Health Check](https://ledgerline-backend-i99t.onrender.com/actuator/health)

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Java 17+ | Backend development |
| Spring Boot 3 | REST API development |
| Spring Security 6 | Authentication and authorization |
| JWT | Stateless user authentication |
| Spring Data JPA | Database operations |
| Hibernate | ORM and database interaction |
| PostgreSQL | Persistent data storage |
| Redis | Distributed rate limiting |
| Bucket4j | Request rate limiting |
| Spring Boot Actuator | Application health monitoring |
| Springdoc OpenAPI | API documentation |
| JUnit 5 | Automated testing |

### Frontend

| Technology | Purpose |
|---|---|
| React.js | User interface |
| Vite | Frontend development and build |
| Tailwind CSS | Styling and responsive layouts |
| Axios | Backend API communication |
| JWT Interceptors | Authentication headers |

### UI Design

The application uses a dark forest green (`#0f2d20`) and off-white (`#f8f9f6`) color scheme.

The dashboard includes:

- Sidebar navigation
- Overview dashboard
- Account management
- Transaction statements
- Account request section
- Split-screen authentication pages

---

## 🏗️ Project Architecture

The project has two main applications:

1. **Frontend:** Handles user interaction, authentication screens, dashboard navigation, and API communication.
2. **Backend:** Handles authentication, account operations, fund transfers, transaction history, database operations, and security.

The backend communicates with PostgreSQL for persistent storage and Redis for distributed rate limiting.

---

## 📁 Project Structure

```text
LedgerLine/
│
├── Dockerfile
├── docker-compose.yml
├── render.yaml
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   └── main.jsx
│   └── index.html
│
└── ledgerline/
    ├── Dockerfile
    ├── pom.xml
    │
    └── src/
        ├── main/
        │   └── java/com/snovasys/ledgerline/
        │       ├── Config/
        │       │   ├── DatabaseSeeder.java
        │       │   ├── OpenApiConfig.java
        │       │   ├── RateLimitInterceptor.java
        │       │   ├── SecurityConfig.java
        │       │   └── WebConfig.java
        │       │
        │       ├── controller/
        │       │   ├── AccountController.java
        │       │   ├── AuthController.java
        │       │   └── TransactionController.java
        │       │
        │       ├── entity/
        │       │   ├── Account.java
        │       │   ├── LedgerEntry.java
        │       │   ├── Role.java
        │       │   └── User.java
        │       │
        │       ├── repository/
        │       │   ├── AccountRepository.java
        │       │   ├── LedgerEntryRepository.java
        │       │   └── UserRepository.java
        │       │
        │       ├── security/
        │       │   ├── JwtAuthenticationFilter.java
        │       │   └── JwtService.java
        │       │
        │       └── service/
        │           ├── RateLimitingService.java
        │           └── TransactionService.java
        │
        └── test/
            └── java/com/snovasys/ledgerline/
                └── TransactionServiceTest.java
```

---

## ✨ Key Features

### 1. User Authentication and Role-Based Access

I implemented JWT-based authentication using Spring Security.

- Users can register and log in.
- JWT tokens are used to authenticate protected API requests.
- `ROLE_USER` and `ROLE_ADMIN` have separate permissions.
- New registrations receive the `ROLE_USER` role by default.
- Administrative endpoints are protected from normal users.

### 2. Account Management

The application supports account-related operations such as viewing account details and checking available balances.

The backend validates account ownership before allowing users to perform protected operations.

### 3. Secure Fund Transfers

One of the main parts of this project is the money transfer functionality.

I implemented:

- Atomic database transactions using `@Transactional`.
- Pessimistic locking using `PESSIMISTIC_WRITE`.
- Balance validation before processing transfers.
- Protection against overdrafts.
- Transaction history using the `LedgerEntry` entity.

These measures help maintain consistent account balances during transfers.

### 4. Transaction Idempotency

A transfer request might be submitted more than once because of network delays or retries.

To handle this, I implemented idempotency using a transaction ID (UUID).

When the backend receives a request with an existing transaction ID, it checks the ledger and returns the existing transaction instead of processing the same transfer again.

This helps prevent duplicate balance deductions.

### 5. Transaction Audit Trail

Every processed transfer is recorded in the ledger.

The `LedgerEntry` entity stores information such as:

- Transaction ID
- Sender account
- Receiver account
- Amount
- Transaction status
- Timestamp

The application does not expose update or delete APIs for transaction history.

### 6. Distributed Rate Limiting

I used Bucket4j and Redis to control the number of API requests.

- Configured limit: 20 requests per minute.
- Rate limiting is applied per client IP or authenticated user ID.
- Excess requests receive HTTP `429 Too Many Requests`.
- Rate-limit information is returned through response headers.
- An in-memory fallback is included when Redis is unavailable.

### 7. Application Health Monitoring

I integrated Spring Boot Actuator to monitor application health.

Available endpoints include:

- `/actuator/health`
- `/actuator/info`

A separate `/health` endpoint is also configured for deployment health checks.

---

## 🔐 Default Admin & Demo Accounts

The `DatabaseSeeder` class initializes the administrator and demo accounts when the application starts, if they don't already exist.

| Account | Identifier | Password | Role / Balance |
|---|---|---|---|
| Admin | `admin@balancevault.com` | `admin123` | `ROLE_ADMIN` |
| Alice | `#1001` | N/A | ₹5,000.00 |
| Bob | `#1002` | N/A | ₹1,000.00 |

New users registering through the application receive `ROLE_USER` by default.

**Security note:** These are development/demo credentials. Do not use default passwords in a production environment. Change or disable demo accounts before public use.

---

## 🧪 Automated Testing

I used JUnit 5 to test important transaction scenarios, particularly concurrency and idempotency.

### Run Tests

Navigate to the backend directory:

```bash
cd ledgerline
./mvnw test
```

### Test Scenarios

**1. Concurrent Transfer Test**

`testConcurrentTransfersMaintainBalanceConsistency`

- Simulates 50 simultaneous transfer requests.
- Starts with an account balance of ₹1,000.
- Each transfer attempts to send ₹25.
- Verifies that exactly 40 transfers succeed and 10 fail due to insufficient funds.
- Checks that no overdraft occurs and the total system balance remains unchanged.

**2. Idempotency Test**

`testIdempotentTransferDoesNotDeductBalanceTwice`

- Submits the same transfer request twice.
- Uses the same transaction ID for both requests.
- Checks that the balance is deducted only once.
- Verifies that only one ledger entry is created.

---

## 🚀 Run the Project Locally

### Prerequisites

Make sure you have the following installed:

- Java 17 or later
- Node.js and npm
- PostgreSQL
- Redis (if using distributed rate limiting)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/pallelliTulasi/LedgerLine.git
cd LedgerLine
```

### 2. Start the Backend

```bash
cd ledgerline
./mvnw spring-boot:run
```

On Windows, use:

```bash
mvnw.cmd spring-boot:run
```

Backend URLs:

- **Base URL:** `http://localhost:8085`
- **Swagger UI:** `http://localhost:8085/swagger-ui.html`
- **Health:** `http://localhost:8085/actuator/health`

Configure your database and environment variables before starting the backend if required.

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

`http://localhost:5173`

---

## 🐳 Run Using Docker

The project includes Docker configuration for running the backend along with PostgreSQL and Redis.

To start the services:

```bash
docker compose up --build -d
```

To check running containers:

```bash
docker compose ps
```

To stop the services:

```bash
docker compose down
```

---

## ☁️ Cloud Deployment – Render

I configured the project for deployment using Render and included a `render.yaml` Blueprint.

### Deploy Using a Blueprint

1. Open the [Render Dashboard](https://dashboard.render.com/).
2. Select **New + → Blueprint**.
3. Connect the LedgerLine GitHub repository.
4. Render reads the `render.yaml` file.
5. Review the services and environment variables before deployment.
6. Deploy the application.

The Blueprint is intended to configure:

- PostgreSQL database
- Spring Boot backend
- React frontend

### Important Environment Variables

Configure the required values in the Render dashboard:

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port |
| `DATABASE_URL` | PostgreSQL connection URL |
| `DB_PASSWORD` | Database password, if required by the configuration |
| `balancevault.jwt.secret` | JWT signing secret |
| `MANAGEMENT_HEALTH_REDIS_ENABLED` | Redis health indicator configuration |

Use the actual variable names expected by your application configuration. Never commit production credentials or JWT secrets to GitHub.

---

## 📚 What I Learned

Building BalanceVault helped me understand several backend development concepts through practical implementation.

Some of the main things I worked on were:

- Implementing JWT authentication and role-based access control.
- Managing financial transactions using Spring Boot.
- Understanding database transactions and pessimistic locking.
- Preventing duplicate requests using idempotency.
- Handling concurrent requests and race conditions.
- Using PostgreSQL and Redis together.
- Implementing API rate limiting.
- Writing automated tests for transaction consistency.
- Building Docker images and deploying applications on Render.

The biggest takeaway for me was that building a financial application isn't just about transferring money between accounts. It also requires careful handling of security, data consistency, and concurrent operations.

---

## 📄 Additional Documentation

- [AI Prompts & Development Journey](PROMPTS.md)
- [Threat Model & Security Assurance Matrix](THREATS.md)

---

## 👩‍💻 Author

**Pallelli Lakshmi Tulasi**

- GitHub: [@pallelliTulasi](https://github.com/pallelliTulasi)
- LinkedIn: [Pallelli Lakshmi Tulasi](https://linkedin.com/in/pallelli-lakshmi-tulasi-450960325)

---

**BalanceVault – Building a financial ledger with a focus on security, consistency, and reliability.**
