# LIBFLOW Backend Service — Foundation (Phase 17.1)

Welcome to the **LIBFLOW** Backend Service, built with Node.js, Express, and TypeScript. This service provides the API foundation for the LIBFLOW Smart Library Management Platform.

---

## 1. Architectural Highlights

- **Language & Runtime:** Node.js (ESM) with TypeScript (`ES2022`, `NodeNext`).
- **Framework:** Express 4.x with strict type safety.
- **Security:**
  - `helmet` security headers enabled by default.
  - Environment-driven `cors` configuration (wildcards `*` prohibited in production).
  - Configurable JSON & URL-encoded request body size ceilings (default: `1mb`).
- **API Response Envelope:** Conforms strictly to `ARCHITECTURE.md` Section 8:
  - Success: `{ success: true, message: string, data?: T, meta?: ApiResponseMeta }`
  - Failure: `{ success: false, message: string, error: { code: string, details?: unknown, stack?: string } }`
- **Error Handling:** Centralized middleware intercepting operational `ApiError` instances, payload overflow (413), malformed JSON (400), and unknown endpoints (404).

---

## 2. Directory Structure

```text
server/
├── .env.example              # Environment variables template
├── .env                      # Local environment configuration (git-ignored)
├── package.json              # Backend scripts and dependencies
├── tsconfig.json             # TypeScript configuration (NodeNext ESM)
├── README.md                 # Setup and operational documentation
├── tests/
│   └── health.test.mjs       # Health, routing, error handling & unit test suite
├── src/
│   ├── app.ts                # Express application factory & middleware chain
│   ├── server.ts             # HTTP server listener & graceful shutdown handlers
│   ├── config/
│   │   └── env.ts            # Validated environment configuration
│   ├── middleware/
│   │   ├── errorHandler.ts   # Centralized error handler
│   │   └── notFound.ts       # 404 catch-all middleware
│   ├── routes/
│   │   └── health.routes.ts  # Health check & telemetry routes
│   └── utils/
│       ├── ApiError.ts       # Structured operational error class
│       └── ApiResponse.ts    # Standardized response envelope class
└── dist/                     # Compiled JavaScript output (git-ignored)
```

---

## 3. Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (tested on Node v24.18.0)
- **npm**: v9.0.0 or later

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

Review and adjust variables in `.env` as required:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | `5000` | Port for the Express HTTP server |
| `API_PREFIX` | `/api/v1` | Global API route prefix |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin(s); comma-separated for multiple |
| `CLIENT_URL` | `http://localhost:5173` | Primary frontend web application URL |
| `REQUEST_LIMIT` | `1mb` | Max allowable request body size |
| `LOG_LEVEL` | `info` | Logging verbosity |

> **Note:** In `production` mode (`NODE_ENV=production`), wildcard origin (`*`) is automatically rejected and overridden with strict localhost fallback for security.

---

## 4. Available Scripts

All scripts should be executed from within the `server/` directory:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts server in development mode with hot-reloading using `tsx watch` |
| `npm run build` | Compiles TypeScript source files into JavaScript in `dist/` |
| `npm start` | Runs the compiled production server from `dist/server.js` |
| `npm test` | Runs the automated backend test suite using Node.js native test runner |

---

## 5. API Endpoints

### 1. Root Endpoint
- **URL:** `GET /`
- **Description:** Verifies service availability and links to API documentation and health endpoint.
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

### 2. Health & Telemetry
- **URL:** `GET /api/v1/health`
- **Description:** Returns system status, uptime, node version, and memory usage.
- **Example Response:**
```json
{
  "success": true,
  "message": "LIBFLOW Backend Service is healthy",
  "data": {
    "status": "UP",
    "service": "libflow-api",
    "version": "1.0.0",
    "environment": "development",
    "timestamp": "2026-10-09T06:44:24.966Z",
    "uptimeSeconds": 42,
    "nodeVersion": "v24.18.0",
    "memory": {
      "rssMb": 58.37,
      "heapTotalMb": 16.98,
      "heapUsedMb": 9.98
    }
  }
}
```

### 3. Unknown Route Handling (404)
- **URL:** `GET /api/v1/any-invalid-endpoint`
- **Example Response:**
```json
{
  "success": false,
  "message": "Cannot GET /api/v1/any-invalid-endpoint — route not found on this server.",
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "details": {
      "method": "GET",
      "path": "/api/v1/any-invalid-endpoint"
    }
  }
}
```

---

## 6. Next Roadmap Milestones

- **Phase 17.2:** MongoDB Connection & Mongoose Data Layer Integration
- **Phase 17.3:** Authentication & RBAC Service (JWT, Cookie handling)
- **Phase 17.4:** Books, Circulation & Reservations REST Endpoints
