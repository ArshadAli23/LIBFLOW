# LIBFLOW Backend Service — Database Migration (Phase 17.2: MySQL 8+)

Welcome to the **LIBFLOW** Backend Service, built with Node.js, Express, TypeScript, and MySQL 8+. This service provides the enterprise circulation, inventory, and relational data layer foundation for the LIBFLOW Smart Library Management Platform.

---

## 1. Architectural Highlights

- **Language & Runtime:** Node.js (ESM) with TypeScript (`ES2022`, `NodeNext`).
- **Framework:** Express 4.x with strict type safety.
- **Database Engine:** MySQL 8+ with `mysql2/promise` connection pooling.
- **Relational Integrity:**
  - Strict foreign keys, cascade/restrict rules, and compound tenant uniqueness constraints (`tenant_id`).
  - Strict separation of bibliographic master records (`books`) and serialized physical units (`book_copies`).
  - Separation of login identities (`users`) from patron circulation profiles (`members`). Passwords are never stored in `members`.
  - Append-only immutable compliance auditing (`audit_logs`).
  - Deterministic state machine enforcement for reservations (`WAITING` → `READY_FOR_PICKUP` → `CLAIMED` / `EXPIRED`).
  - Centralized overdue fine calculation engine with configurable grace periods, daily rates, and maximum fine caps.
- **Security:**
  - `helmet` security headers enabled by default.
  - Environment-driven `cors` configuration (wildcards `*` prohibited in production).
  - Sanitized database error handling and telemetry (passwords are never logged or exposed via APIs).
- **API Response Envelope:** Conforms strictly to `ARCHITECTURE.md` Section 8:
  - Success: `{ success: true, message: string, data?: T, meta?: ApiResponseMeta }`
  - Failure: `{ success: false, message: string, error: { code: string, details?: unknown, stack?: string } }`

---

## 2. Directory Structure

```text
server/
├── .env.example                  # Environment variables template (MySQL 8+)
├── .env                          # Local environment configuration (git-ignored)
├── package.json                  # Backend scripts and dependencies (mysql2, tsx, express)
├── tsconfig.json                 # TypeScript configuration (NodeNext ESM)
├── README.md                     # Setup, migration, and operational documentation
├── tests/
│   ├── database.unit.test.ts     # Offline unit tests for env validation, DDL, and FKs
│   ├── domain.unit.test.ts       # Offline unit tests for fine formulas and queue transitions
│   ├── health.test.mjs           # HTTP API health telemetry and security header tests
│   └── mysql.integration.test.ts # Live MySQL integration tests (cleanly skipped if offline)
├── src/
│   ├── app.ts                    # Express application factory & middleware chain
│   ├── server.ts                 # HTTP server listener & graceful shutdown handlers
│   ├── config/
│   │   ├── env.ts                # Validated environment configuration & credential masking
│   │   └── database.ts           # Reusable MySQL connection pool & transaction manager
│   ├── db/
│   │   ├── index.ts              # Unified database module exports
│   │   ├── migrator.ts           # Version-controlled schema migration runner
│   │   └── migrations/
│   │       └── 001_initial_schema.sql # Complete relational schema DDL
│   ├── models/                   # Relational domain entity definitions and row mappers
│   │   ├── User.ts               # Login credentials and roles
│   │   ├── Book.ts               # Bibliographic master titles
│   │   ├── BookCopy.ts           # Physical asset copies & lifecycle events
│   │   ├── Member.ts             # Library patron profiles (no passwords)
│   │   ├── Loan.ts               # Circulation borrowing contracts
│   │   ├── Reservation.ts        # FIFO hold queue & state machine
│   │   ├── Fine.ts               # Financial fines, payments, and audited waivers
│   │   ├── Notification.ts       # Role & patron telemetry alert records
│   │   ├── AuditLog.ts           # Immutable append-only audit trail
│   │   ├── LibrarySettings.ts    # Institutional policy parameters
│   │   └── index.ts              # Export index
│   ├── services/
│   │   ├── FineService.ts        # Centralized overdue penalty & waiver arithmetic
│   │   └── ReservationQueueService.ts # State machine transitions & FIFO queue reordering
│   ├── middleware/
│   │   ├── errorHandler.ts       # Centralized error handler
│   │   └── notFound.ts           # 404 catch-all middleware
│   ├── routes/
│   │   └── health.routes.ts      # Health check & MySQL database telemetry routes
│   └── utils/
│       ├── ApiError.ts           # Structured operational error class
│       └── ApiResponse.ts        # Standardized response envelope class
└── dist/                         # Compiled JavaScript output (git-ignored)
```

---

## 3. Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (tested on Node v24.18.0)
- **npm**: v9.0.0 or later
- **MySQL Server**: 8.0 or later (Community Server or Enterprise)

### MySQL Installation & Database Setup

1. Install MySQL Server 8+ from [mysql.com](https://dev.mysql.com/downloads/installer/) or via package managers:
   ```bash
   # Windows (Chocolatey)
   choco install mysql

   # macOS (Homebrew)
   brew install mysql
   brew services start mysql

   # Ubuntu / Debian
   sudo apt update
   sudo apt install mysql-server
   sudo systemctl start mysql
   ```

2. Open the MySQL interactive shell and create the application database and user:
   ```sql
   CREATE DATABASE libflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'libflow_user'@'localhost' IDENTIFIED BY 'your_secure_password';
   GRANT ALL PRIVILEGES ON libflow_db.* TO 'libflow_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Installation

From the repository root, change directory into `server/` and install dependencies:

```bash
cd server
npm install
```

### Environment Configuration

Copy the example environment template to create your local `.env`:

```bash
# On Windows PowerShell
Copy-Item .env.example .env

# On Unix / macOS
cp .env.example .env
```

Configure your local database credentials in `server/.env`:

```env
# Application Environment (development, test, production)
NODE_ENV=development

# Server Port
PORT=5000

# API Versioning Prefix
API_PREFIX=/api/v1

# Allowed CORS Origins
CORS_ORIGIN=http://localhost:5173

# Frontend Application Base URL
CLIENT_URL=http://localhost:5173

# Request Body Size Limit
REQUEST_LIMIT=1mb

# Log Level (error, warn, info, debug)
LOG_LEVEL=info

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=libflow_user
DB_PASSWORD=your_secure_password
DB_NAME=libflow_db
DB_CONNECTION_LIMIT=10
```

> **Security Note:** Never commit `.env` containing credentials. The `.env` file is excluded in `.gitignore`.

---

## 4. Database Migrations

LIBFLOW uses version-controlled SQL migrations located in `src/db/migrations/`.

| Command | Action |
| :--- | :--- |
| `npm run migrate` | Executes all pending SQL migrations within a transaction |
| `npm run migrate:status` | Displays migration version status against the database |

---

## 5. Available Scripts

All scripts are executed from within `server/`:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts server in development mode with hot-reloading using `tsx watch` |
| `npm run build` | Compiles TypeScript source files into JavaScript in `dist/` |
| `npm start` | Runs the compiled production server from `dist/server.js` |
| `npm test` | Runs the full test suite (unit tests + live integration tests) |
| `npm run test:unit` | Runs offline unit tests (no MySQL required) |
| `npm run test:integration` | Runs live MySQL integration tests |

---

## 6. API Endpoints

### 1. Root Welcome
- **URL:** `GET /`
- **Description:** Verifies service availability.
- **Example Response:**
```json
{
  "success": true,
  "message": "LIBFLOW Smart Library Management Platform API",
  "data": {
    "apiPrefix": "/api/v1",
    "healthEndpoint": "/api/v1/health",
    "documentation": "https://github.com/libflow/platform"
  }
}
```

### 2. Health & MySQL Telemetry
- **URL:** `GET /api/v1/health`
- **Description:** Returns system health, node memory, and MySQL database connection status.
- **Example Response (Database Connected):**
```json
{
  "success": true,
  "message": "LIBFLOW Backend Service is healthy",
  "data": {
    "status": "UP",
    "service": "libflow-api",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-10-15T14:30:00.000Z",
    "uptimeSeconds": 12,
    "nodeVersion": "v24.18.0",
    "memory": {
      "rssMb": 48.21,
      "heapTotalMb": 18.52,
      "heapUsedMb": 11.23
    },
    "database": {
      "status": "CONNECTED",
      "connected": true,
      "host": "localhost",
      "port": 3306,
      "name": "libflow_db",
      "error": null
    }
  }
}
```

- **Example Response (Database Degraded in Development / Offline):**
```json
{
  "success": true,
  "message": "LIBFLOW Backend Service is healthy",
  "data": {
    "status": "UP",
    "service": "libflow-api",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-10-15T14:30:00.000Z",
    "uptimeSeconds": 3,
    "nodeVersion": "v24.18.0",
    "memory": {
      "rssMb": 38.45,
      "heapTotalMb": 15.22,
      "heapUsedMb": 9.45
    },
    "database": {
      "status": "DISCONNECTED",
      "connected": false,
      "host": "localhost",
      "port": 3306,
      "name": "libflow_db",
      "error": "connect ECONNREFUSED 127.0.0.1:3306"
    }
  }
}
```

---

## 7. Next Roadmap Milestones

- **Phase 17.3:** Authentication & RBAC Service (JWT, bcrypt/Argon2, Cookie handling)
- **Phase 17.4:** Books, Circulation & Reservations REST Endpoints
