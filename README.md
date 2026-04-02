# FDS - Financial Data System

A RESTful API for financial ledger management built with Express, TypeScript, TypeORM, and PostgreSQL. Features JWT-based cookie authentication, role-based access control, Zod input validation, and a full transaction audit trail.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [API Routes](#api-routes)
- [Role Permissions](#role-permissions)
- [Input Validation](#input-validation)
- [Setup](#setup)
- [Testing](#testing)
- [API Latency Report](#api-latency-report)

---

## Architecture

### System Overview

![Architecture Diagram](./public/image.png)

### Request Lifecycle

![Request Lifecycle](./public/imagecopy.png)


---

## Tech Stack

| Layer          | Technology              |
|----------------|-------------------------|
| Runtime        | Node.js + TypeScript    |
| Framework      | Express.js              |
| ORM            | TypeORM                 |
| Database       | PostgreSQL (Neon)       |
| Authentication | JWT (HTTP-only cookies) |
| Validation     | Zod                     |
| Password Hash  | bcryptjs                |

---

## Project Structure

```
src/
├── index.ts                              # Entry point
├── config/
│   └── data-source.ts                    # TypeORM DataSource (PostgreSQL connection)
├── entities/
│   ├── User.ts                           # User model
│   ├── Record.ts                         # Ledger balance model
│   └── Transaction.ts                    # Transaction audit log model
├── validators/
│   ├── auth.validators.ts                # Zod schemas for register and login
│   └── transaction.validators.ts         # Zod schemas for deposit, withdraw, filters
├── middlewares/
│   ├── auth.middleware.ts                # JWT cookie verification
│   ├── role.middleware.ts                # Role-based access guard
│   └── validate.middleware.ts            # Generic Zod validation middleware
├── controllers/
│   ├── auth.controller.ts                # Register, login, logout logic
│   ├── transaction.controller.ts         # Deposit, withdraw, delete, filter logic
│   └── dashboard.controller.ts           # Summary and recent transaction views
└── routes/
    ├── auth.routes.ts                    # /auth/*
    ├── transaction.routes.ts             # /transactions/*
    └── dashboard.routes.ts               # /dashboard/*
```

---

## Database Schema

### Users

| Column     | Type         | Constraints                        |
|------------|--------------|------------------------------------|
| id         | UUID         | Primary Key, auto-generated        |
| username   | VARCHAR(100) | Unique, not null                   |
| email      | VARCHAR(255) | Unique, not null                   |
| password   | VARCHAR(255) | Hashed with bcrypt, not null       |
| role       | ENUM         | viewer / analyst / admin (default: viewer) |
| created_at | TIMESTAMP    | Auto-generated                     |
| updated_at | TIMESTAMP    | Auto-updated                       |

### Records

| Column          | Type | Constraints                 |
|-----------------|------|-----------------------------|
| id              | INT  | Primary Key, auto-increment |
| current_balance | INT  | Default: 0                  |

Single-row table representing the current ledger balance.

### Transactions

| Column     | Type         | Constraints                           |
|------------|--------------|---------------------------------------|
| id         | UUID         | Primary Key, auto-generated           |
| type       | ENUM         | income / withdrawal                   |
| amount     | INT          | Indexed for fast search               |
| amt_before | INT          | Balance before this transaction       |
| amt_after  | INT          | Balance after this transaction        |
| timestamp  | TIMESTAMP    | Auto-generated with date and time     |
| done_by    | VARCHAR(100) | Username of the user who performed it |
| is_deleted | BOOLEAN      | Default: false (soft-delete flag)     |
| recordId   | FK           | References Records table              |

---

## Authentication

The API uses JWT tokens stored in HTTP-only cookies.

- On login, a JWT is signed with the user's id, username, email, and role, then set as an HTTP-only cookie named `token`.
- On every authenticated request, the `auth.middleware` reads the cookie, verifies the JWT, and attaches the decoded payload to `req.user`.
- On logout, the cookie is cleared.
- No Authorization header is needed. Cookies are sent automatically by the browser and Postman.

---

## API Routes

### 1. Identity and Session Management

Access: Public

| Method | Route            | Description                                                                 |
|--------|------------------|-----------------------------------------------------------------------------|
| POST   | /auth/register   | Creates a new user. Checks for duplicate email/username. Defaults to viewer role. |
| POST   | /auth/login      | Authenticates credentials and issues an HTTP-only cookie containing the JWT. |
| POST   | /auth/logout     | Clears the authentication cookie.                                           |

### 2. Financial Ledger Management

Access: Admin Only

These actions automatically update the `current_balance` in the Records table and create an entry in the Transactions table.

| Method | Route                          | Description                                                              |
|--------|--------------------------------|--------------------------------------------------------------------------|
| POST   | /transactions/deposit          | Increases the balance. Creates a transaction record with type `income`.   |
| POST   | /transactions/withdraw         | Decreases the balance. Creates a transaction record with type `withdrawal`. Returns 400 if insufficient balance. |
| PATCH  | /transactions/:id/soft-delete  | Sets the `is_deleted` flag to true. Record stays in DB for audit but is hidden from views. |
| DELETE | /transactions/:id              | Permanently removes a transaction record from the database.              |

### 3. Dashboard and Quick Insights

Access: All Roles (Admin, Analyst, Viewer)

| Method | Route                        | Description                                                       |
|--------|------------------------------|-------------------------------------------------------------------|
| GET    | /dashboard/summary           | Returns `current_balance` plus the 10 most recent transactions.   |
| GET    | /dashboard/recent-deposits   | Returns `current_balance` plus the last 10 income transactions.   |
| GET    | /dashboard/recent-withdrawals| Returns `current_balance` plus the last 10 withdrawal transactions.|

### 4. Advanced Data Analysis

Access: Admin and Analyst Only

| Method | Route                         | Description                                                                  |
|--------|-------------------------------|------------------------------------------------------------------------------|
| GET    | /transactions/filter/min/:amt | Fetches all transactions where amount is greater than the specified value.   |
| GET    | /transactions/filter/max/:amt | Fetches all transactions where amount is less than the specified value.      |
| GET    | /transactions/search/:amt     | Exact match search on the amount column. Uses database indexing for speed.   |

---

## Role Permissions

| Route Group                     | Viewer | Analyst | Admin |
|---------------------------------|--------|---------|-------|
| Auth (/auth/*)                  | Yes    | Yes     | Yes   |
| Dashboard (/dashboard/*)       | Yes    | Yes     | Yes   |
| Filters (/transactions/filter/*, /transactions/search/*) | No | Yes | Yes |
| Ledger (/transactions/deposit, withdraw, delete)         | No | No  | Yes |

---

## Input Validation

All request bodies and route parameters are validated using Zod schemas before reaching the controller.

**Register** - username (min 3 chars), email (valid format), password (min 6 chars), role (optional enum)

**Login** - email (valid format), password (non-empty)

**Deposit / Withdraw** - amount (positive integer, coerced from string if needed)

**Filter / Search params** - :amt (positive number, coerced from string)

Invalid inputs return a `400` response with structured error messages:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

---

## Setup

1. Clone the repository

```bash
git clone <repo-url>
cd fds
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
PORT=3000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1d
```

4. Start the development server

```bash
npm run dev
```

The server will connect to the database, auto-sync the schema, and start listening on the configured port.

---

## Testing

All endpoints are tested using the included Postman collection.

**Collection file:** `FDS_API.postman_collection.json`

### How to Run

1. Import the collection into Postman
2. Start the server with `npm run dev`
3. Click **Run Collection** in Postman
4. All 38 requests execute sequentially with 64 automated test assertions

The collection is fully idempotent. It generates unique usernames and emails per run using timestamps, tracks balance changes with relative assertions, and auto-captures transaction IDs for delete operations. It can be run unlimited times on the same database without cleanup.

### Test Coverage

| Category              | Tests                                                             |
|-----------------------|-------------------------------------------------------------------|
| Registration          | Success (3 roles), duplicate rejection (409), validation errors (400) |
| Login                 | Success with cookie, bad credentials (401)                        |
| Deposits              | Balance increase, bad input rejection, negative amount rejection  |
| Withdrawals           | Balance decrease, insufficient funds (400)                        |
| Soft Delete           | Flag set, record hidden from dashboard                            |
| Hard Delete           | Record permanently removed                                       |
| Filters               | Min filter, max filter, exact search                              |
| Role Access (Viewer)  | Dashboard allowed (200), deposits blocked (403), filters blocked (403) |
| Role Access (Analyst) | Dashboard allowed (200), filters allowed (200), deposits blocked (403) |
| No Auth               | All protected routes return 401                                   |

---

## API Latency Report

Measured from the Postman Collection Runner. Server running locally against a remote Neon PostgreSQL instance.

### Auth Routes

| # | Request                              | Method | Status | Latency (ms) |
|---|--------------------------------------|--------|--------|---------------|
| 1 | /auth/register (admin)               | POST   | 201    | 2790          |
| 2 | /auth/register (analyst)             | POST   | 201    | 1032          |
| 3 | /auth/register (viewer)              | POST   | 201    | 1031          |
| 4 | /auth/register (duplicate)           | POST   | 409    | 251           |
| 5 | /auth/register (bad input)           | POST   | 400    | 3             |
| 6 | /auth/login                          | POST   | 200    | 307           |
| 7 | /auth/login (bad credentials)        | POST   | 401    | 307           |

### Transaction Routes

| #  | Request                              | Method | Status | Latency (ms) |
|----|--------------------------------------|--------|--------|---------------|
| 8  | /transactions/deposit (5000)         | POST   | 201    | 1948          |
| 9  | /transactions/deposit (3000)         | POST   | 201    | 1930          |
| 10 | /transactions/deposit (1500)         | POST   | 201    | 1941          |
| 11 | /transactions/withdraw (2000)        | POST   | 201    | 1927          |
| 12 | /transactions/withdraw (500)         | POST   | 201    | 1930          |
| 13 | /transactions/withdraw (insufficient)| POST   | 400    | 246           |
| 14 | /transactions/deposit (bad input)    | POST   | 400    | 3             |
| 15 | /transactions/deposit (negative)     | POST   | 400    | 3             |
| 16 | /transactions/deposit (for soft-del) | POST   | 201    | 1933          |
| 17 | /transactions/deposit (for hard-del) | POST   | 201    | 1928          |

### Dashboard Routes

| #  | Request                        | Method | Status | Latency (ms) |
|----|--------------------------------|--------|--------|---------------|
| 18 | /dashboard/summary             | GET    | 200    | 495           |
| 19 | /dashboard/recent-deposits     | GET    | 200    | 487           |
| 20 | /dashboard/recent-withdrawals  | GET    | 200    | 487           |

### Filter Routes

| #  | Request                          | Method | Status | Latency (ms) |
|----|----------------------------------|--------|--------|---------------|
| 21 | /transactions/filter/min/2000    | GET    | 200    | 248           |
| 22 | /transactions/filter/max/2000    | GET    | 200    | 246           |
| 23 | /transactions/search/5000        | GET    | 200    | 244           |

### Delete Routes

| #  | Request                                | Method | Status | Latency (ms) |
|----|----------------------------------------|--------|--------|---------------|
| 24 | /transactions/:id/soft-delete          | PATCH  | 200    | 1209          |
| 25 | /dashboard/summary (verify soft-del)   | GET    | 200    | 488           |
| 26 | /transactions/:id (hard delete)        | DELETE | 200    | 1208          |

### Role Access Tests

| #  | Request                           | Method | Status | Latency (ms) |
|----|-----------------------------------|--------|--------|---------------|
| 27 | /auth/logout                      | POST   | 200    | 4             |
| 28 | /auth/login (viewer)              | POST   | 200    | 310           |
| 29 | Viewer -> /dashboard/summary      | GET    | 200    | 483           |
| 30 | Viewer -> /transactions/deposit   | POST   | 403    | 5             |
| 31 | Viewer -> /transactions/filter    | GET    | 403    | 2             |
| 32 | /auth/logout                      | POST   | 200    | 2             |
| 33 | /auth/login (analyst)             | POST   | 200    | 312           |
| 34 | Analyst -> /dashboard/summary     | GET    | 200    | 485           |
| 35 | Analyst -> /transactions/filter   | GET    | 200    | 244           |
| 36 | Analyst -> /transactions/deposit  | POST   | 403    | 3             |
| 37 | /auth/logout                      | POST   | 200    | 4             |
| 38 | No Auth -> /dashboard/summary     | GET    | 401    | 2             |

### Summary

| Metric                  | Value    |
|-------------------------|----------|
| Total Requests          | 38       |
| Total Test Assertions   | 64       |
| Passed                  | 64       |
| Failed                  | 0        |
| Total Execution Time    | 26.48s   |
| Avg Latency (DB write)  | ~1900ms  |
| Avg Latency (DB read)   | ~400ms   |
| Avg Latency (validation only) | ~3ms |

Note: Higher latencies on write operations are due to the remote Neon PostgreSQL instance (US East). Local PostgreSQL would yield significantly lower latencies.

---

## License

See [LICENSE](LICENSE) for details.
