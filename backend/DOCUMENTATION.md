# HireD Backend — Technical Documentation & Architecture Reference

**Project:** HireD — Trinity X Buildathon  
**Target Clients:**  
1. **Admin Portal** (Web) — Orders, trips, driver allocation, billing, reports, and system settings.  
2. **B2B Partner Portal** (Web) — Corporate partners place orders, track live trips, view verified monthly invoices.  
3. **Driver App** (Mobile) — Onboarding document upload, trip acceptance, OTP completion, expense logging, and wallet tracking.  
**Specification Reference:** `TrinityX_HireD_Database_Design(1).pdf` (v1.2, 03 Oct 2026).

---

## Table of Contents
1. [Technology Stack & Runtime](#1-technology-stack--runtime)
2. [Project & Directory Structure](#2-project--directory-structure)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Architecture & Schema](#4-database-architecture--schema)
   - [Core Tables (15 Domain Tables)](#core-tables-15-domain-tables)
   - [Onboarding & Security Tables (2 Tables)](#onboarding--security-tables-2-tables)
   - [Database Constraints & Custom SQL Rules](#database-constraints--custom-sql-rules)
   - [Prisma 7 Configuration & Migrations](#prisma-7-configuration--migrations)
5. [Authentication & Session Security Architecture](#5-authentication--session-security-architecture)
   - [Identity Models & Access Separation](#identity-models--access-separation)
   - [Token Lifecycle & Dual Delivery](#token-lifecycle--dual-delivery)
   - [Refresh Token Rotation & Replay Attack Defense](#refresh-token-rotation--replay-attack-defense)
   - [Brute-Force Protection & Account Lockout](#brute-force-protection--account-lockout)
   - [Secure Single-Use Password Setup Workflow](#secure-single-use-password-setup-workflow)
6. [Complete API Contracts & Endpoints](#6-complete-api-contracts--endpoints)
   - [System Endpoints](#system-endpoints)
   - [Authentication & Setup Endpoints (`/auth`)](#authentication--setup-endpoints-auth)
   - [Admin Account Management Endpoints (`/admin`)](#admin-account-management-endpoints-admin)
7. [Middleware & Authorization Guards](#7-middleware--authorization-guards)
8. [Seed Data & Initial Setup](#8-seed-data--initial-setup)
9. [Automated Testing & Verification](#9-automated-testing--verification)
10. [Useful Development Commands](#10-useful-development-commands)

---

## 1. Technology Stack & Runtime

* **Runtime:** Node.js (v24.x) using native ECMAScript Modules (`"type": "module"` in `package.json`).
* **Web Framework:** Express.js 5 with `helmet`, `cors`, and `cookie-parser`.
* **Database:** PostgreSQL 18 running on `localhost:5432`.
* **Database Access / ORM:** Prisma 7 (`^7.10.0`) configured with `@prisma/client`, `@prisma/adapter-pg`, and `pg`.
* **Password Hashing:** `bcryptjs` with 10 salt rounds.
* **Token Security:** `jsonwebtoken` (JWT) + Node.js native `crypto` module (SHA-256 and CSPRNG random bytes).

---

## 2. Project & Directory Structure

```text
backend/
├── prisma/
│   ├── migrations/
│   │   ├── 20261010171658_init_core_schema/
│   │   │   └── migration.sql             # 15 core domain tables + DB check constraints
│   │   ├── 20261010173039_add_onboarding_and_setup_tokens/
│   │   │   └── migration.sql             # Onboarding requests & setup tokens
│   │   └── migration_lock.toml
│   └── schema.prisma                     # Authoritative Prisma 7 schema definition
├── src/
│   ├── config/
│   │   └── db.js                         # PrismaClient singleton with PrismaPg adapter
│   ├── middlewares/
│   │   └── auth.middleware.js            # JWT verification, active session check, role guards
│   ├── modules/
│   │   ├── admin/
│   │   │   └── admin.controller.js       # Admin account & registration management
│   │   ├── auth/
│   │   │   ├── auth.controller.js        # Logins, logout, refresh, password setup
│   │   │   └── auth.service.js           # Multi-identity login, session rotation, lockouts
│   │   └── onboarding/
│   │       └── onboarding.service.js     # Partner registration, approvals, setup tokens
│   ├── routes/
│   │   ├── admin.routes.js               # /admin endpoints (protected)
│   │   └── auth.routes.js                # /auth endpoints (public & setup)
│   ├── shared/
│   │   └── security.js                   # Bcrypt, JWT signing, SHA-256 token hashing
│   ├── seed.js                           # Idempotent seed script (HQ office & 2 admins)
│   └── server.js                         # Express entrypoint, middlewares, healthcheck
├── tests/
│   └── auth_and_onboarding.test.js       # Comprehensive 15-scenario automated test suite
├── .env.example                          # Environment variable template
├── DOCUMENTATION.md                      # Complete system documentation (this file)
├── package.json                          # Dependencies & NPM scripts
└── prisma7.config.ts                     # Prisma 7 configuration file
```

---

## 3. Environment Configuration

Defined in `.env` (sample placeholders in `.env.example`):

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (PostgreSQL 18)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/hired_dev?schema=public"

# Authentication & Security
JWT_ACCESS_SECRET="your-256-bit-access-secret-here"
JWT_REFRESH_SECRET="your-256-bit-refresh-secret-here"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PASSWORD_SETUP_TOKEN_EXPIRES_HOURS=24
```

---

## 4. Database Architecture & Schema

### Core Tables (15 Domain Tables)

The database follows Third Normal Form (3NF) with deliberate denormalizations where financial history must freeze:

| Table | Entity / Purpose | Primary Key | Key Relationships & Foreign Keys |
| :--- | :--- | :--- | :--- |
| `offices` | HireD office branches | `office_id` (INT Identity) | 1-to-many with `companies` and `admins`. |
| `companies` | B2B Corporate Partner profiles & logins | `company_id` (INT Identity) | FK `office_id` → `offices`. Unique lowercase `email_id`. |
| `orders` | Trip booking requests | `order_id` (INT Identity) | FK `company_id` → `companies`, FK `created_by_admin_id` → `admins`, FK `decided_by_admin_id` → `admins`. |
| `trips` | Assigned and executed trips | `trip_id` (INT Identity) | Unique FK `order_id` → `orders` (1:0..1), FK `driver_id` → `drivers`. |
| `expenses` | In-trip expenses logged by driver | `expense_id` (INT Identity) | FK `trip_id` → `trips`, FK `driver_id` → `drivers`. |
| `trip_payrolls` | Frozen financial split at trip close | `payroll_id` (INT Identity) | Unique FK `trip_id` → `trips` (prevents double payout), FK `driver_id` → `drivers`, FK `invoice_id` → `invoices`. |
| `driver_wallet_transactions` | Driver ledger entries (credit/debit) | `transaction_id` (INT Identity) | Unique FK `trip_id` → `trips` (credits only, debits have NULL trip_id), FK `driver_id` → `drivers`. |
| `invoices` | Monthly billing statements | `invoice_id` (INT Identity) | FK `company_id` → `companies`, FK `created_admin`, `verified_admin1`, `verified_admin2` → `admins`. |
| `drivers` | Driver profiles & mobile credentials | `driver_id` (INT Identity) | Unique `phone_no`. 1-to-many with `trips`, `expenses`, `driver_documents`, `driver_leaves`. |
| `driver_documents` | Verification documents & files | `document_id` (INT Identity) | FK `driver_id` → `drivers`. Maximum size 5 MB. |
| `driver_leaves` | Scheduled driver unavailability | `leave_id` (INT Identity) | FK `driver_id` → `drivers`. Dates: `start_date`, `end_date`. |
| `admins` | Internal staff accounts | `admin_id` (INT Identity) | FK `office_id` → `offices`. Unique lowercase `email_id`. |
| `audit_logs` | System audit trail for critical events | `audit_id` (BIGINT Identity) | Polymorphic (`actor_type` + `actor_id`, `entity_type` + `entity_id`). Native `INET` IP. |
| `sessions` | Active user sessions & refresh token hashes | `session_id` (INT Identity) | Polymorphic (`user_type` + `user_id`). Unique SHA-256 `refresh_token_hash`. Native `INET` IP. |
| `notifications` | Outbound email notification queue | `notification_id` (INT Identity) | Polymorphic (`recipient_type` + `recipient_id`). Status: `PENDING`, `SENT`, `FAILED`. |

---

### Onboarding & Security Tables (2 Tables)

| Table | Entity / Purpose | Primary Key | Key Fields & Rules |
| :--- | :--- | :--- | :--- |
| `company_registration_requests` | Inbound partner registration submissions | `request_id` (INT Identity) | `company_name`, `email_id`, `phone_no`, `contact_person`, `status` (`PENDING`, `APPROVED`, `REJECTED`), FK `reviewed_by_admin_id` → `admins`. |
| `password_setup_tokens` | Single-use expiring password creation tokens | `token_id` (INT Identity) | `user_type` (`ADMIN`, `PARTNER`, `DRIVER`), `user_id`, unique SHA-256 `token_hash`, `expires_at`, `used_at`. |

---

### Database Constraints & Custom SQL Rules

All rules from Section 7.1 of the design specification are directly enforced inside PostgreSQL:

1. **Email Case-Insensitive Uniqueness:**
   * `CREATE UNIQUE INDEX idx_companies_email_lower ON companies (LOWER(email_id));`
   * `CREATE UNIQUE INDEX idx_admins_email_lower ON admins (LOWER(email_id));`
2. **Payout Split Integrity:**
   * `companies`: `CHECK (driver_split + hired_split = 100)`
   * `companies`: `CHECK (driver_split BETWEEN 0 AND 100)`
   * `trip_payrolls`: `CHECK (driver_pct + company_pct = 100)`
   * `trip_payrolls`: `CHECK (driver_share + company_share = trip_amount)`
3. **Order Lifecycle Consistency:**
   * `orders`: `CHECK (status IN ('RECEIVED', 'ACCEPTED', 'REJECTED'))`
   * `orders`: `CHECK (status = 'RECEIVED' OR (decided_by_admin_id IS NOT NULL AND decided_at IS NOT NULL))`
   * `orders`: `CHECK (status <> 'REJECTED' OR reject_reason IS NOT NULL)`
4. **Trip State & OTP Integrity:**
   * `trips`: `CHECK (trip_status IN ('UNASSIGNED', 'ASSIGNED', 'ONGOING', 'CLOSED'))`
   * `trips`: `CHECK (amount > 0)`
   * `trips`: `CHECK (otp_attempts BETWEEN 0 AND 5)`
   * `trips`: `CHECK (trip_status <> 'CLOSED' OR (expenses_confirmed = true AND closed_at IS NOT NULL))`
   * `trips`: `CHECK (trip_status = 'UNASSIGNED' OR (driver_id IS NOT NULL AND assigned_at IS NOT NULL))`
5. **Wallet Credit/Debit XOR Rule:**
   * `driver_wallet_transactions`: `CHECK ((credit > 0 AND debit IS NULL AND trip_id IS NOT NULL) OR (debit > 0 AND credit IS NULL AND trip_id IS NULL))`
6. **Two-Person Invoice Approval & Partial Unique Index:**
   * `invoices`: `CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')`
   * `invoices`: `CHECK (verified_admin1 IS NULL OR verified_admin1 = created_admin)` (First approval must be creator)
   * `invoices`: `CHECK (verified_admin2 IS NULL OR verified_admin2 <> created_admin)` (Second approval must be different admin)
   * `invoices`: `CHECK (status NOT IN ('VERIFIED', 'PUBLISHED') OR (verified_admin1 IS NOT NULL AND verified_admin2 IS NOT NULL))`
   * `invoices`: `CHECK ((status = 'PUBLISHED') = (published_at IS NOT NULL))`
   * `invoices`: `CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL))`
   * Partial Index: `CREATE UNIQUE INDEX idx_invoices_company_period_active ON invoices (company_id, period_month) WHERE status <> 'CANCELLED';` (A cancelled invoice does not block month regeneration).
7. **Driver Validation:**
   * `driver_leaves`: `CHECK (end_date >= start_date)`
   * `driver_documents`: `CHECK (document_type IN ('DRIVING_LICENCE', 'AADHAAR', 'PAN', 'PCC'))`
   * `driver_documents`: `CHECK (size_bytes > 0 AND size_bytes <= 5242880)` (5MB maximum)
8. **Onboarding & Token Constraints:**
   * `company_registration_requests`: `CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))`
   * `company_registration_requests`: `CHECK (status = 'PENDING' OR (reviewed_by_admin_id IS NOT NULL AND reviewed_at IS NOT NULL))`
   * `company_registration_requests`: `CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL)`
   * `password_setup_tokens`: `CHECK (user_type IN ('ADMIN', 'PARTNER', 'DRIVER'))`
   * `password_setup_tokens`: `CHECK (expires_at > created_at)`

---

### Prisma 7 Configuration & Migrations

Prisma 7 is configured in `prisma7.config.ts`:
```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

The database driver adapter is instantiated as a singleton in [src/config/db.js](file:///c:/brototype/buildathon/Hire_D/Trinity-X/backend/src/config/db.js):
```javascript
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
```

---

## 5. Authentication & Session Security Architecture

### Identity Models & Access Separation
The platform serves three distinct user classes with dedicated tables:
* **Admin** → Authenticates via `admins.email_id` + bcrypt password.
* **Partner** → Authenticates via `companies.email_id` + bcrypt password.
* **Driver** → Authenticates via `drivers.phone_no` + bcrypt password.

### Token Lifecycle & Dual Delivery
1. **Access Token:** Short-lived JWT (15 minutes). Sent in the `Authorization: Bearer <token>` header for stateless authorization.
2. **Refresh Token:** Long-lived JWT (7 days) wrapping a cryptographically secure random token (`crypto.randomBytes(40)`).
3. **Dual Delivery:**
   * Returned in the JSON response body (`accessToken`, `refreshToken`, `expiresIn`, `user`).
   * Simultaneously attached as an HTTP-only secure cookie (`refreshToken`).
   * **Why dual delivery?** Mobile clients (Driver App) store tokens in native OS Keychains; Web Portals (Admin & Partner) can use HTTP-only cookies to resist XSS attacks.

### Refresh Token Rotation & Replay Attack Defense
When a client requests `POST /auth/refresh`:
1. The server verifies the JWT signature and extracts `{ sessionId, token }`.
2. The database session is checked. If `session.revokedAt` is already set, **a replay attack is detected**; access is immediately denied.
3. The server compares the SHA-256 hash of the presented token with `session.refreshTokenHash`.
4. Inside an atomic transaction (`prisma.$transaction`):
   - The old session is revoked (`revokedAt = now()`).
   - A brand new random refresh token and session row are generated.
5. New tokens are returned to the client.

### Brute-Force Protection & Account Lockout
* Tracked via `failed_login_attempts` and `locked_until` on each identity table.
* **Failed Attempt:** Increments counter.
* **Threshold (5 failures):** Sets `locked_until = now() + 15 minutes`. Further login attempts return HTTP `403 Forbidden`.
* **Successful Login:** Immediately resets `failed_login_attempts = 0` and clears `locked_until`.
* **Account Enumeration Defense:** Generic `"Invalid credentials."` is returned on unknown identifiers or bad passwords.

### Secure Single-Use Password Setup Workflow
Accounts are never created with default or plaintext passwords:
1. When an admin creates an Admin, Partner, or Driver, or approves a Partner registration:
   * The account is created with an unmatchable bcrypt string (`$2b$10$UNSET_<random>`).
   * A single-use 32-byte cryptographic token is generated.
   * Only the SHA-256 hash is saved in `password_setup_tokens` (expires in 24 hours).
   * The plain token is returned to be delivered via secure link.
2. The user submits `POST /auth/{role}/password/setup` with `{ token, password }`:
   * The token is validated and marked `usedAt = now()`.
   * The user's `password_hash` is updated to `bcrypt.hash(password, 10)`.
   * Reusing the token returns `400 Bad Request`.

---

## 6. Complete API Contracts & Endpoints

### System Endpoints

#### `GET /health`
* **Auth:** None (Public)
* **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "database": "connected",
    "uptime": 12.34,
    "timestamp": "2026-10-10T17:30:00.000Z",
    "environment": "development"
  }
  ```

---

### Authentication & Setup Endpoints (`/auth`)

#### 1. Admin Login
* **Method & Path:** `POST /auth/admin/login`
* **Request Body:**
  ```json
  {
    "email": "admin1@hired.com",
    "password": "Admin@12345"
  }
  ```
* **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi...",
      "expiresIn": 900,
      "user": {
        "adminId": 1,
        "officeId": 1,
        "adminName": "Lead Admin Savio",
        "emailId": "admin1@hired.com",
        "status": "ACTIVE",
        "userType": "ADMIN"
      }
    }
  }
  ```

#### 2. Partner Login
* **Method & Path:** `POST /auth/partner/login`
* **Request Body:**
  ```json
  {
    "email": "partner@apexlogistics.com",
    "password": "Partner@12345"
  }
  ```
* **Response `200 OK`:** Returns access/refresh tokens and sanitized company profile (`userType: "PARTNER"`).

#### 3. Driver Login
* **Method & Path:** `POST /auth/driver/login`
* **Request Body:**
  ```json
  {
    "phoneNo": "+919123456789",
    "password": "Driver@12345"
  }
  ```
* **Response `200 OK`:** Returns access/refresh tokens and sanitized driver profile (`userType: "DRIVER"`).

#### 4. Refresh Token Rotation
* **Method & Path:** `POST /auth/refresh`
* **Request Body (or HTTP-only Cookie):**
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
* **Response `200 OK`:** Returns a new `accessToken` and rotated `refreshToken`.

#### 5. Logout
* **Method & Path:** `POST /auth/logout`
* **Request Body (or Cookie):** `{ "refreshToken": "eyJhbGciOi..." }`
* **Response `200 OK`:** `{ "status": "ok", "message": "Logged out successfully." }`

#### 6. Authenticated User Profile
* **Method & Path:** `GET /auth/me`
* **Headers:** `Authorization: Bearer <accessToken>`
* **Response `200 OK`:**
  ```json
  {
    "status": "ok",
    "data": {
      "user": {
        "adminId": 1,
        "adminName": "Lead Admin Savio",
        "emailId": "admin1@hired.com",
        "userType": "ADMIN"
      },
      "sessionId": 42
    }
  }
  ```

#### 7. Public Partner Registration
* **Method & Path:** `POST /auth/partner/register`
* **Request Body:**
  ```json
  {
    "companyName": "Apex Logistics Ltd",
    "address": "100 Harbor Road, Kochi",
    "contactPerson": "Karan Sharma",
    "phoneNo": "+919988776655",
    "emailId": "partner@apexlogistics.com",
    "companyLocation": "Kochi Port",
    "notes": "Fleet operator"
  }
  ```
* **Response `201 Created`:**
  ```json
  {
    "status": "ok",
    "message": "Partner registration request submitted successfully. Our team will review your application shortly.",
    "data": { "requestId": 1 }
  }
  ```

#### 8. Partner Password Setup
* **Method & Path:** `POST /auth/partner/password/setup`
* **Request Body:**
  ```json
  {
    "token": "4a7b8f9e012c...",
    "password": "SecurePassword@123"
  }
  ```
* **Response `200 OK`:** `{ "status": "ok", "message": "Password established successfully. You may now log in with your credentials." }`

#### 9. Driver Password Setup
* **Method & Path:** `POST /auth/driver/password/setup`
* **Request Body:** `{ "token": "4a7b8f9e012c...", "password": "DriverPassword@123" }`
* **Response `200 OK`:** `{ "status": "ok", "message": "Password established successfully..." }`

---

### Admin Account Management Endpoints (`/admin`)

*All routes require `Authorization: Bearer <accessToken>` with `userType === 'ADMIN'`.*

#### 1. Create Admin Account
* **Method & Path:** `POST /admin/admins`
* **Request Body:**
  ```json
  {
    "adminName": "Operations Admin",
    "emailId": "ops@hired.com",
    "phoneNo": "+919876543299",
    "officeId": 1
  }
  ```
* **Response `201 Created`:** Returns admin profile and generated single-use `setupToken`.

#### 2. Create Partner Directly
* **Method & Path:** `POST /admin/partners`
* **Request Body:**
  ```json
  {
    "name": "Global Cargo Movers",
    "contactPerson": "Anil Verma",
    "phoneNo": "+919811223344",
    "emailId": "contact@globalcargo.com",
    "officeId": 1,
    "hiredSplit": 70.00,
    "driverSplit": 30.00
  }
  ```
* **Response `201 Created`:** Returns company profile and generated `setupToken`.

#### 3. Create Driver Account
* **Method & Path:** `POST /admin/drivers`
* **Request Body:**
  ```json
  {
    "name": "Rahul Nair",
    "phoneNo": "+919123456789",
    "currentLocation": "Edappally, Kochi"
  }
  ```
* **Response `201 Created`:**
  ```json
  {
    "status": "ok",
    "data": {
      "driver": {
        "driverId": 1,
        "name": "Rahul Nair",
        "phoneNo": "+919123456789",
        "status": "PENDING"
      },
      "message": "Driver account created in PENDING status. Proceed to document verification before activation."
    }
  }
  ```

#### 4. Activate Driver
* **Method & Path:** `PATCH /admin/drivers/:driverId/activate`
* **Response `200 OK`:** Activates driver (`status: "ACTIVE"`) and returns single-use `setupToken`.

#### 5. List Partner Registrations
* **Method & Path:** `GET /admin/partner-registrations?status=PENDING`
* **Response `200 OK`:** Returns array of registration requests with submitter info and review timestamps.

#### 6. Approve Partner Registration
* **Method & Path:** `PATCH /admin/partner-registrations/:requestId/approve`
* **Request Body:**
  ```json
  {
    "officeId": 1,
    "hiredSplit": 70.00,
    "driverSplit": 30.00
  }
  ```
* **Response `200 OK`:** Creates active company, marks request `APPROVED`, and returns `setupToken`.

#### 7. Reject Partner Registration
* **Method & Path:** `PATCH /admin/partner-registrations/:requestId/reject`
* **Request Body:**
  ```json
  {
    "reason": "Incomplete GST documentation."
  }
  ```
* **Response `200 OK`:** Updates request to `REJECTED` with reason recorded.

---

### Admin Account Management Endpoints (`/api/v1/admin/admins`)
*All endpoints require Bearer token with `userType === 'ADMIN'`. All admins possess equal management permissions.*

1. **List Admin Accounts:** `GET /api/v1/admin/admins?status=ACTIVE&page=1&limit=20`
   - Returns paginated list of admin accounts with safe attributes (`admin_id`, `office_id`, `admin_name`, `phone_no`, `email_id`, `status`, `created_at`, `updated_at`). Never exposes password hashes or session secrets.
2. **Get Admin Details:** `GET /api/v1/admin/admins/:admin_id`
   - Returns single admin object; 404 if not found.
3. **Create Admin Account:** `POST /api/v1/admin/admins`
   - Body: `{ admin_name, email_id, password, office_id, phone_no }`
   - Validates required fields, password length >= 8, valid email, and office existence. Enforces case-insensitive uniqueness on `email_id` (409 `DUPLICATE_EMAIL`). Hashes password with bcrypt. Audits action as `ADMIN_CREATED`.
4. **Update Admin Profile:** `PATCH /api/v1/admin/admins/:admin_id`
   - Body: `{ admin_name, phone_no, email_id, office_id, password }`
   - Updates permitted admin profile fields. If `password` is provided, enforces length >= 8, hashes with bcrypt, and revokes prior active sessions. Audits action as `ADMIN_UPDATED`.
5. **Change Admin Status:** `PATCH /api/v1/admin/admins/:admin_id/status`
   - Body: `{ status: "ACTIVE" | "INACTIVE", reason }`
   - Business Rules:
     - **Self-Deactivation Prevention:** An admin cannot deactivate their own account (`400 CANNOT_DEACTIVATE_SELF`).
     - **Minimum Active Admins Rule:** Enforces the database design requirement to maintain at least two active admins in the system for critical operations such as invoice verification (`422 MINIMUM_ACTIVE_ADMINS_REQUIRED`).
     - **Session Revocation:** Setting status to `INACTIVE` revokes all active sessions for that admin in the same transaction.
     - Audits action as `USER_DEACTIVATED` / `USER_REACTIVATED`.

---

### Company Management Endpoints (`/api/v1/admin/companies`)
*All endpoints require Bearer token with `userType === 'ADMIN'`.*

1. **List Companies:** `GET /api/v1/admin/companies?status=ACTIVE&page=1&limit=20`
   - Returns paginated list of company profiles with payout splits.
2. **Create Company & Login:** `POST /api/v1/admin/companies`
   - Body: `{ name, email_id, password, office_id, driver_share_pct, platform_share_pct, address, contact_person, phone_no, company_location }`
   - Enforces `driver_share_pct + platform_share_pct = 100`, case-insensitive unique email. Password hashed with bcrypt.
3. **Get Company Details:** `GET /api/v1/admin/companies/:company_id`
   - Returns single company object; 404 if not found.
4. **Update Company Details:** `PATCH /api/v1/admin/companies/:company_id`
   - Updates editable company profile fields without modifying payout split or status.
5. **Update Payout Split:** `PATCH /api/v1/admin/companies/:company_id/payout-split`
   - Body: `{ driver_share_pct, platform_share_pct }`
   - Validates sum = 100, preserves historical payroll records, audits action as `PAYOUT_SPLIT_CHANGED` in the same transaction.
6. **Change Company Status:** `PATCH /api/v1/admin/companies/:company_id/status`
   - Body: `{ status: "ACTIVE" | "INACTIVE", reason }`
   - Setting `INACTIVE` revokes all active partner sessions in the same transaction; audits action as `USER_DEACTIVATED` / `USER_REACTIVATED`.

---

### Driver Management Endpoints (`/api/v1/admin/drivers`)
*All endpoints require Bearer token with `userType === 'ADMIN'`.*

1. **List Drivers:** `GET /api/v1/admin/drivers?status=ACTIVE&is_online=true&available_on=YYYY-MM-DD&page=1&limit=20`
   - Supports filtering by status, online switch, and date availability (excludes drivers with active leave on that date).
2. **Get Driver Detail:** `GET /api/v1/admin/drivers/:driver_id`
   - Returns full driver detail including newest document of each type (`DRIVING_LICENCE`, `AADHAAR`, `PAN`, `PCC`) and scheduled leaves.
3. **List Driver Documents History:** `GET /api/v1/admin/drivers/:driver_id/documents`
   - Returns all historical document records for the driver.
4. **Generate Signed Document Link:** `GET /api/v1/admin/drivers/:driver_id/documents/:document_id/link`
   - Generates a secure HMAC/JWT-signed link with 5-minute expiry. Private file paths are never exposed.
5. **Change Driver Status:** `PATCH /api/v1/admin/drivers/:driver_id/status`
   - Body: `{ status: "ACTIVE" | "INACTIVE", reason }`
   - Strictly enforces allowed state transitions:
     - `PENDING -> ACTIVE` (audited as `DRIVER_ACTIVATED`)
     - `ACTIVE -> INACTIVE` (revokes all active driver sessions in same transaction, audited as `USER_DEACTIVATED`)
     - `INACTIVE -> ACTIVE` (audited as `USER_REACTIVATED`)
     - Disallows arbitrary/invalid status transitions with 409 `INVALID_STATUS`.
6. **Driver Wallet View:** `GET /api/v1/admin/drivers/:driver_id/wallet?page=1&limit=20`
   - Returns aggregate balance (`sum(credits) - sum(debits)`) and paginated transaction ledger.
7. **Record Offline Wallet Debit:** `POST /api/v1/admin/drivers/:driver_id/wallet-debits`
   - Body: `{ debit: "2000.00", note }`
   - Validates debit <= current balance (rejects excess with 422 `INSUFFICIENT_BALANCE`); audits as `WALLET_DEBITED`.

---

## 7. Middleware & Authorization Guards

Located in [src/middlewares/auth.middleware.js](file:///c:/brototype/buildathon/Hire_D/Trinity-X/backend/src/middlewares/auth.middleware.js) & [src/middlewares/error.middleware.js](file:///c:/brototype/buildathon/Hire_D/Trinity-X/backend/src/middlewares/error.middleware.js):

* **`authenticate`**: Verifies Bearer JWT, validates active session in `sessions`, checks user status is `ACTIVE` and account is not locked.
* **`requireAdmin`**: Authorization guard enforcing admin role.
* **`errorHandler`**: Centralized error middleware ensuring standard OpenAPI error structure: `{ "success": false, "error": { "code": "...", "message": "...", "details": [] } }`.

---

## 8. Seed Data & Initial Setup

The database can be seeded at any time using:
```powershell
node src/seed.js
```
The script is idempotent:
1. Creates default HQ Office: `Trinity X HQ Kochi` (`office_id: 1`).
2. Creates Admin 1: `admin1@hired.com` (password: `Admin@12345`).
3. Creates Admin 2: `admin2@hired.com` (password: `Admin@12345`), satisfying the two-person verification requirement for invoices.

---

## 9. Automated Testing & Verification

Comprehensive automated test suites:
- `tests/auth_and_onboarding.test.js`: 15 integration scenarios for authentication, session rotation, lockouts, and partner/driver setup.
- `tests/admin_company_driver.test.js`: 21 integration scenarios testing OpenAPI Company and Driver management endpoints.
- `tests/admin_account_management.test.js`: 16 integration scenarios testing Admin Account Management endpoints, validations, self-deactivation prevention, session revocations, and the minimum 2 active admins requirement.

Run all 52 tests via:
```powershell
npm test
```

---

## 10. Useful Development Commands

```powershell
# Start development server with file-watcher (nodemon)
npm run dev

# Start server directly
npm start

# Run all 15 automated integration tests
npm test

# Seed initial office and admins
node src/seed.js

# Validate Prisma schema
npx prisma validate

# Re-generate Prisma Client
npx prisma generate

# Check migration status
npx prisma migrate status

# Check server health endpoint
curl http://localhost:5000/health
```
