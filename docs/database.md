# HIRED BUILDATHON

# HireD Database Design

**Phase 1 MVP: tables, relationships, rules and design decisions**


|                      |                                               |
| -------------------- | --------------------------------------------- |
| **Team**             | Trinity X                                     |
| **Product**          | HireD (Admin Portal, B2B Portal, Driver App)  |
| **Based on**         | HireD PRD v0.2 and HireD Technical Guidelines |
| **Database**         | PostgreSQL 17                                 |
| **ORM / migrations** | Prisma                                        |
| **Document version** | 1.1                                           |
| **Date**             | 07 Oct 2026                                   |

---

## Contents

1. Purpose and scope
2. Overview of the tables
3. Conventions
4. ER diagram
5. Tables and columns
6. Relationships and cardinality
7. Constraints and business rules
8. Status values
9. Indexes
10. Data access and security
11. Audit trail
12. Reports and the Trip Report
13. Normalization
14. Important design decisions
15. Migration strategy
16. Open points
17. Change log

---

## 1. Purpose and scope

This document describes the database for HireD Phase 1. HireD supplies drivers to B2B partner companies.

Today the process runs by hand. The new system covers the full flow: **order → trip → driver payout → month-end invoice**.

The database serves three applications through one backend:

- **Admin Portal (web):** orders, trips, drivers, companies, payroll, invoices and reports.
- **B2B Portal (web):** partners place orders, follow trips, and see reports and verified invoices.
- **Driver App (mobile):** onboarding documents, trips, expenses, OTP trip close and wallet.

The design follows the PRD data model (section 6). It adds the supporting tables the PRD needs: offices, admins, driver documents, driver leave calendar, sessions, notifications and audit log.

---

## 2. Overview of the tables

The database has **15 tables in 7 groups**.


| Group                            | Tables                                           |
| -------------------------------- | ------------------------------------------------ |
| 1. Offices and partner companies | offices, companies                               |
| 2. Orders                        | orders                                           |
| 3. Trips                         | trips, expenses                                  |
| 4. Money                         | trip_payrolls, driver_wallet_transactions, invoices |
| 5. Drivers                       | drivers, driver_documents, driver_leaves           |
| 6. Admins                        | admins                                           |
| 7. System                        | audit_logs, sessions, notifications               |

The main flow in one line: a company places an order → the admin accepts it and it becomes a trip → a driver closes the trip with the OTP → the system writes one trip_payrolls row and one wallet credit → at month end the payroll rows are grouped into one invoice → two admins approve it → the partner can see it.

---

## 3. Conventions

### Names

- This document and the ER diagram use **snake_case**, e.g. `company_id`, `trip_payrolls`. These are the names created in PostgreSQL. PostgreSQL turns every name without quotes into lowercase, so a camelCase name such as `companyId` would silently become `companyid`. snake_case avoids quoting every name in every query. It also follows the naming the Technical Guidelines recommend (section 10).
- In `schema.prisma` the fields are written in camelCase and mapped to these names with `@map` (columns) and `@@map` (tables). The rule is mechanical: put `_` before each capital letter and use lowercase. Example: `verifiedByAdminId1` → `verified_by_admin_id1`. Names are written like words, with no capital-letter acronyms, so each Prisma name maps to exactly one database name.
- **Table names are plural**: `companies`, `trips`, `audit_logs`.
- **Primary keys** are named `<entity>_id`, where the entity is the thing one row stands for: `companies.company_id`, `trip_payrolls.payroll_id`, `driver_leaves.leave_id`.
- **Columns that record when something happened end in `_at`**: `created_at`, `closed_at`, `verified_at1`. Columns that hold a planned or future time, not an event, do not end in `_at`: `orders.pickup_time` (the requested pickup) and `trips.eta` (the estimate), which keep their PRD names, and `locked_until` on `companies`, `drivers` and `admins` (when a login lock ends). The two leave dates, `driver_leaves.start_date` and `end_date`, are calendar days (type DATE), so they end in `_date`.
- **Columns that hold a file location end in `_path`**: `file_path`, `selfie_path`, `photo_path`. They store a path in private storage, not a web address.
- **Status columns are called `status`** (`orders.status`, `trips.status`, `invoices.status`). `trip_payrolls` has two kinds of status, so its columns are `payout_status` (the driver was paid) and `payment_status` (the partner paid HireD).
- **A foreign key that points to `admins` is named after the role**: `created_by_admin_id`, `decided_by_admin_id`, `verified_by_admin_id1`, `verified_by_admin_id2`.
- **"Platform" and "company".** The PRD mostly calls HireD's side of the split the "platform" share; section 8.1 of the PRD says "company %". In this database it is `platform` (`platform_share_pct`, `platform_share`), because `companies` is the table of partner companies. `driver_share_pct` and `platform_share_pct` are the PRD's own names (sections 5.4 and 6).
- **`PARTNER`** in `actor_type`, `user_type` and `recipient_type` means a user of a `companies` row. The PRD calls these users "B2B Partners".

### Keys

- Primary keys are `INTEGER GENERATED ALWAYS AS IDENTITY` (PostgreSQL creates the number). `audit_logs` uses `BIGINT`, because it grows fastest.
- **Foreign keys** have the same name as the primary key they point to, e.g. `trips.driver_id → drivers.driver_id`. Exceptions, where one table points to `admins` more than once: `orders.created_by_admin_id`, `orders.decided_by_admin_id`, `invoices.created_by_admin_id`, `invoices.verified_by_admin_id1`, `invoices.verified_by_admin_id2`.
- All foreign keys use `ON DELETE RESTRICT`. Rows with history are never deleted. Users are switched off with a `status` column instead (section 10.2).

### PostgreSQL data types


| Type                 | Used for                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `INTEGER` / `BIGINT` | IDs, foreign keys and counters                                                                    |
| `VARCHAR(n)`         | Text with a maximum length                                                                        |
| `NUMERIC(12,2)`      | Money in rupees. Never`FLOAT` or `REAL`, so there are no rounding errors.                         |
| `NUMERIC(5,2)`       | Percentages, e.g. 30.00                                                                           |
| `TIMESTAMPTZ`        | Date and time with time zone. Stored in UTC. Shown and grouped in Asia/Kolkata (see section 7.5). |
| `DATE`               | A calendar day, with no time                                                                      |
| `CHAR(7)`            | A month in the format`YYYY-MM`                                                                    |
| `BOOLEAN`            | Yes / no values                                                                                   |
| `JSONB`              | Old and new values in the audit log                                                               |
| `INET`               | IP addresses                                                                                      |

### Other rules

- **Null column:** "No" means the column is `NOT NULL`. "Yes" means it can be empty.
- **Key column:** PK = primary key, FK = foreign key, UK = unique.
- **Passwords:** only a bcrypt hash is stored (`password_hash`). The real password is never saved or logged.
- **Files:** documents and selfies are stored in private file storage. The database only keeps the storage path (`file_path`, `selfie_path`, `photo_path`). Files are never public.
- **`updated_at`:** the backend sets it on every update.
- **`version`:** tables that two admins may change at the same time (`orders`, `trips`, `invoices`) have a `version` number. See section 7.3.

---

## 4. ER diagram

The diagram is split into 7 groups: 1. Offices and partner companies, 2. Orders, 3. Trips, 4. Money: payout, wallet, invoice, 5. Drivers, 6. Admins, 7. System.

```mermaid
erDiagram
    offices ||--o{ companies : "has"
    offices ||--o{ admins : "has"
    companies ||--o{ orders : "places"
    admins o|--o{ orders : "created_by_admin_id"
    admins o|--o{ orders : "decided_by_admin_id"
    orders ||--o| trips : "becomes"
    drivers o|--o{ trips : "does"
    trips ||--o{ expenses : "has"
    drivers ||--o{ expenses : "logs"
    trips ||--o| trip_payrolls : "pays out once"
    drivers ||--o{ trip_payrolls : "is paid"
    trips o|--o| driver_wallet_transactions : "credits once"
    drivers ||--o{ driver_wallet_transactions : "has"
    invoices o|--o{ trip_payrolls : "covers"
    companies ||--o{ invoices : "gets"
    admins ||--o{ invoices : "created_by_admin_id"
    admins o|--o{ invoices : "verified_by_admin_id1"
    admins o|--o{ invoices : "verified_by_admin_id2"
    drivers ||--o{ driver_documents : "uploads"
    drivers ||--o{ driver_leaves : "marks"

    offices {
        int office_id PK
        varchar office_name
        varchar office_location
        timestamptz created_at
    }
    companies {
        int company_id PK
        varchar name
        varchar address
        varchar contact_person
        varchar phone_no
        varchar email_id UK
        varchar password_hash
        varchar status
        int failed_login_attempts
        timestamptz locked_until
        int office_id FK
        varchar company_location
        numeric platform_share_pct
        numeric driver_share_pct
        timestamptz created_at
        timestamptz updated_at
    }
    orders {
        int order_id PK
        int company_id FK
        varchar pickup_spot
        varchar dropoff_spot
        timestamptz pickup_time
        varchar contact_name
        varchar contact_phone
        varchar notes
        varchar status
        varchar source
        varchar reject_reason
        int created_by_admin_id FK
        int decided_by_admin_id FK
        timestamptz decided_at
        int version
        timestamptz created_at
        timestamptz updated_at
    }
    admins {
        int admin_id PK
        int office_id FK
        varchar admin_name
        varchar phone_no
        varchar email_id UK
        varchar password_hash
        varchar status
        int failed_login_attempts
        timestamptz locked_until
        timestamptz created_at
        timestamptz updated_at
    }
    invoices {
        int invoice_id PK
        int company_id FK
        char period_month
        varchar status
        int created_by_admin_id FK
        int verified_by_admin_id1 FK
        int verified_by_admin_id2 FK
        timestamptz verified_at1
        timestamptz verified_at2
        timestamptz published_at
        timestamptz cancelled_at
        numeric total_amount
        numeric total_driver_share
        numeric total_platform_share
        int version
        timestamptz created_at
        timestamptz updated_at
    }
    trips {
        int trip_id PK
        int order_id FK, UK
        int driver_id FK
        numeric amount
        timestamptz eta
        varchar selfie_path
        varchar otp
        int otp_attempts
        boolean expenses_confirmed
        varchar status
        int version
        timestamptz assigned_at
        timestamptz started_at
        timestamptz closed_at
        timestamptz created_at
        timestamptz updated_at
    }
    expenses {
        int expense_id PK
        int trip_id FK
        int driver_id FK
        varchar description
        numeric amount
        timestamptz created_at
        timestamptz updated_at
    }
    trip_payrolls {
        int payroll_id PK
        int trip_id FK, UK
        int driver_id FK
        int invoice_id FK
        numeric driver_share_pct
        numeric platform_share_pct
        numeric trip_amount
        numeric driver_share
        numeric platform_share
        varchar payout_status
        varchar payment_status
        timestamptz created_at
        timestamptz updated_at
    }
    driver_wallet_transactions {
        int transaction_id PK
        int trip_id FK, UK
        int driver_id FK
        numeric credit
        numeric debit
        varchar note
        timestamptz created_at
    }
    drivers {
        int driver_id PK
        varchar name
        varchar phone_no UK
        varchar password_hash
        varchar photo_path
        boolean is_online
        varchar status
        int failed_login_attempts
        timestamptz locked_until
        varchar current_location
        timestamptz created_at
        timestamptz updated_at
    }
    driver_documents {
        int document_id PK
        int driver_id FK
        varchar document_type
        varchar file_path
        varchar original_file_name
        varchar mime_type
        int size_bytes
        timestamptz uploaded_at
    }
    driver_leaves {
        int leave_id PK
        int driver_id FK
        date start_date
        date end_date
        timestamptz created_at
    }
    audit_logs {
        bigint audit_id PK
        int actor_id
        varchar actor_type
        varchar action
        varchar entity_type
        int entity_id
        jsonb old_value
        jsonb new_value
        inet ip_address
        varchar reason
        timestamptz created_at
    }
    sessions {
        int session_id PK
        varchar user_type
        int user_id
        varchar refresh_token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        inet ip_address
        timestamptz created_at
    }
    notifications {
        int notification_id PK
        varchar recipient_type
        int recipient_id
        varchar recipient_email
        varchar type
        varchar entity_type
        int entity_id
        varchar status
        int attempts
        varchar last_error
        timestamptz sent_at
        timestamptz created_at
    }
```

**Notes on the diagram:**

- `||--o{` means every child row has exactly one parent, and a parent has many children. `o|--o{` means the child's parent column can be empty. `||--o|` / `o|--o|` mean zero or one child per parent (the child column is UK).
- `audit_logs`, `sessions` and `notifications` link to users and records through a type column plus an id column (`actor_type` + `actor_id`, `user_type` + `user_id`, `recipient_type` + `recipient_id`). They have no foreign keys on purpose, because the target can be any of three user tables. They are drawn without lines.

---

## 5. Tables and columns

### 1. Offices and partner companies

#### offices

A HireD office or branch. Companies and admins belong to one office. An order's office is the office of its company.


| Column         | Type         | Key | Null | Notes           |
| -------------- | ------------ | --- | ---- | --------------- |
| office_id       | INTEGER      | PK  | No   | Identity.       |
| office_name     | VARCHAR(150) |     | No   |                 |
| office_location | VARCHAR(300) |     | Yes  |                 |
| created_at      | TIMESTAMPTZ  |     | No   | Default`now()`. |

#### companies

A B2B partner company. It also holds the partner's portal login and the payout split.


| Column              | Type         | Key | Null | Notes                                                                                |
| ------------------- | ------------ | --- | ---- | ------------------------------------------------------------------------------------ |
| company_id           | INTEGER      | PK  | No   | Identity.                                                                            |
| name                | VARCHAR(150) |     | No   |                                                                                      |
| address             | VARCHAR(300) |     | Yes  |                                                                                      |
| contact_person       | VARCHAR(150) |     | Yes  |                                                                                      |
| phone_no             | VARCHAR(20)  |     | Yes  |                                                                                      |
| email_id             | VARCHAR(254) | UK  | No   | Login name for the B2B portal. Unique, compared in lowercase.                        |
| password_hash        | VARCHAR(255) |     | No   | bcrypt hash. The real password is never stored.                                      |
| status              | VARCHAR(20)  |     | No   | ACTIVE, INACTIVE. Default ACTIVE. An INACTIVE company cannot log in or place orders. |
| failed_login_attempts | INTEGER      |     | No   | Default 0. Reset to 0 on a good login.                                               |
| locked_until         | TIMESTAMPTZ  |     | Yes  | Set after 5 failed logins (15 minutes). Login is refused until this time.            |
| office_id            | INTEGER      | FK  | No   | → offices.office_id                                                                  |
| company_location     | VARCHAR(300) |     | Yes  |                                                                                      |
| platform_share_pct          | NUMERIC(5,2) |     | No   | HireD's share in %, e.g. 70.00.                                                      |
| driver_share_pct         | NUMERIC(5,2) |     | No   | Driver's share in %, e.g. 30.00.                                                     |
| created_at           | TIMESTAMPTZ  |     | No   | Default`now()`.                                                                      |
| updated_at           | TIMESTAMPTZ  |     | No   | Default`now()`.                                                                      |

### 2. Orders

#### orders

A request for a trip. It comes from the B2B portal or is entered by an admin after a phone or WhatsApp request.


| Column           | Type          | Key | Null | Notes                                                                                           |
| ---------------- | ------------- | --- | ---- | ----------------------------------------------------------------------------------------------- |
| order_id          | INTEGER       | PK  | No   | Identity.                                                                                       |
| company_id        | INTEGER       | FK  | No   | → companies.company_id. The order's office is this company's office.                            |
| pickup_spot       | VARCHAR(300)  |     | No   |                                                                                                 |
| dropoff_spot      | VARCHAR(300)  |     | No   |                                                                                                 |
| pickup_time       | TIMESTAMPTZ   |     | No   | Requested pickup date and time.                                                                 |
| contact_name      | VARCHAR(150)  |     | No   | Contact person for this trip (PRD B-02).                                                        |
| contact_phone     | VARCHAR(20)   |     | No   |                                                                                                 |
| notes            | VARCHAR(1000) |     | Yes  | Vehicle / service notes.                                                                        |
| status           | VARCHAR(20)   |     | No   | RECEIVED, ACCEPTED, REJECTED. Default RECEIVED.                                                 |
| source           | VARCHAR(10)   |     | No   | PORTAL or ADMIN.                                                                                |
| reject_reason     | VARCHAR(500)  |     | Yes  | Filled when the order is rejected. Sent in the rejection email.                                 |
| created_by_admin_id | INTEGER       | FK  | Yes  | → admins.admin_id. The admin who typed in a phone or WhatsApp order. Empty for a portal order.  |
| decided_by_admin_id | INTEGER       | FK  | Yes  | → admins.admin_id. The admin who accepted or rejected the order. Empty while RECEIVED.          |
| decided_at        | TIMESTAMPTZ   |     | Yes  | When the order was accepted or rejected.                                                        |
| version          | INTEGER       |     | No   | Default 0. See section 7.3.                                                                     |
| created_at        | TIMESTAMPTZ   |     | No   | When the order was received. Start point of the PRD metric "order received to driver assigned". |
| updated_at        | TIMESTAMPTZ   |     | No   |                                                                                                 |

### 3. Trips

#### trips

An accepted order becomes one trip. The trip holds the driver, the amount, the OTP and the trip times.


| Column            | Type          | Key    | Null | Notes                                                                                                                                                                                                                                                                   |
| ----------------- | ------------- | ------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| trip_id            | INTEGER       | PK     | No   | Identity.                                                                                                                                                                                                                                                               |
| order_id           | INTEGER       | FK, UK | No   | → orders.order_id. One trip per order.                                                                                                                                                                                                                                  |
| driver_id          | INTEGER       | FK     | Yes  | → drivers.driver_id. Empty until a driver is assigned. Can change until the trip is CLOSED (reassignment).                                                                                                                                                              |
| amount            | NUMERIC(12,2) |        | No   | Total trip amount set by the admin. More than 0. Editable until the trip closes.                                                                                                                                                                                        |
| eta               | TIMESTAMPTZ   |        | Yes  | Estimated arrival time from the maps service. Admin can override.                                                                                                                                                                                                       |
| selfie_path         | VARCHAR(500)  |        | Yes  | Path to the driver's selfie in private storage.                                                                                                                                                                                                                         |
| otp               | VARCHAR(6)    |        | No   | Six-digit trip-close code, created with a secure random generator when the trip is created. Text, so leading zeros are kept. Stored in plain text because the partner must be able to read it in the portal. Shown only to the trip's own partner, never to the driver. |
| otp_attempts       | INTEGER       |        | No   | Default 0. Wrong codes entered. At 5 the trip is locked for OTP entry until an admin resets it.                                                                                                                                                                         |
| expenses_confirmed | BOOLEAN       |        | No   | Default false. The driver confirms the expense list is complete, even when it is empty (PRD D-09).                                                                                                                                                                      |
| status        | VARCHAR(20)   |        | No   | UNASSIGNED, ASSIGNED, ONGOING, CLOSED. Default UNASSIGNED.                                                                                                                                                                                                              |
| version           | INTEGER       |        | No   | Default 0. See section 7.3.                                                                                                                                                                                                                                             |
| assigned_at        | TIMESTAMPTZ   |        | Yes  | End point of the PRD metric "order received to driver assigned".                                                                                                                                                                                                        |
| started_at         | TIMESTAMPTZ   |        | Yes  | Compared with orders.pickup_time for the driver delay report.                                                                                                                                                                                                            |
| closed_at          | TIMESTAMPTZ   |        | Yes  | Decides which month-end invoice the trip belongs to (section 7.5).                                                                                                                                                                                                      |
| created_at         | TIMESTAMPTZ   |        | No   |                                                                                                                                                                                                                                                                         |
| updated_at         | TIMESTAMPTZ   |        | No   |                                                                                                                                                                                                                                                                         |

#### expenses

An expense the driver logs during a trip, e.g. fuel or toll. Shown in the trip report. Not part of the payout split. The driver can add, edit and delete expenses until the trip is CLOSED. After that, nothing on the expense can change.


| Column      | Type          | Key | Null | Notes               |
| ----------- | ------------- | --- | ---- | ------------------- |
| expense_id   | INTEGER       | PK  | No   | Identity.           |
| trip_id      | INTEGER       | FK  | No   | → trips.trip_id     |
| driver_id    | INTEGER       | FK  | No   | → drivers.driver_id |
| description | VARCHAR(500)  |     | No   |                     |
| amount      | NUMERIC(12,2) |     | No   | More than 0.        |
| created_at   | TIMESTAMPTZ   |     | No   |                     |
| updated_at   | TIMESTAMPTZ   |     | No   |                     |

### 4. Money

#### trip_payrolls

The payroll record for one closed trip (PRD 5.4 "Trip Payroll Record"). It copies the driver, the amount and the split at trip close, so later changes never change what was paid.


| Column        | Type          | Key    | Null | Notes                                                                                                                                                                                                                                                                                        |
| ------------- | ------------- | ------ | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| payroll_id     | INTEGER       | PK     | No   | Identity.                                                                                                                                                                                                                                                                                    |
| trip_id        | INTEGER       | FK, UK | No   | → trips.trip_id. Unique: one payroll record per trip. The partner is found through the trip's order.                                                                                                                                                                                         |
| driver_id      | INTEGER       | FK     | No   | → drivers.driver_id. Copy of trips.driver_id at trip close: the driver who was paid.                                                                                                                                                                                                          |
| invoice_id     | INTEGER       | FK     | Yes  | → invoices.invoice_id. Filled when the trip is added to a month-end invoice.                                                                                                                                                                                                                 |
| driver_share_pct     | NUMERIC(5,2)  |        | No   | Copy of companies.driver_share_pct at trip close.                                                                                                                                                                                                                                                 |
| platform_share_pct    | NUMERIC(5,2)  |        | No   | Copy of companies.platform_share_pct at trip close.                                                                                                                                                                                                                                                  |
| trip_amount    | NUMERIC(12,2) |        | No   | Copy of trips.amount at trip close.                                                                                                                                                                                                                                                          |
| driver_share   | NUMERIC(12,2) |        | No   | trip_amount × driver_share_pct / 100, rounded to 2 decimals.                                                                                                                                                                                                                                        |
| platform_share  | NUMERIC(12,2) |        | No   | trip_amount − driver_share. Using subtraction means the two shares always add up to the exact trip amount.                                                                                                                                                                                    |
| payout_status  | VARCHAR(20)   |        | No   | Driver payout: PENDING, CREDITED. Default CREDITED. The payroll row and the wallet credit are written in one transaction (section 7.4), so in Phase 1 the value is always CREDITED. PENDING is kept because the PRD defines it, and for a future design where the credit is a separate step. |
| payment_status | VARCHAR(20)   |        | No   | Partner payment to HireD: UNPAID, PAID. Default UNPAID. An admin sets PAID when the partner pays outside the platform (PRD 5.4 and risk 8.2).                                                                                                                                                |
| created_at     | TIMESTAMPTZ   |        | No   | When the trip was paid out.                                                                                                                                                                                                                                                                  |
| updated_at     | TIMESTAMPTZ   |        | No   |                                                                                                                                                                                                                                                                                              |

#### driver_wallet_transactions

Every movement in a driver's wallet. The wallet balance is the sum of credits minus debits.


| Column        | Type          | Key    | Null | Notes                                                                                                      |
| ------------- | ------------- | ------ | ---- | ---------------------------------------------------------------------------------------------------------- |
| transaction_id | INTEGER       | PK     | No   | Identity.                                                                                                  |
| trip_id        | INTEGER       | FK, UK | Yes  | → trips.trip_id. Set for a trip credit. Empty for a debit. Unique: a trip can credit the wallet only once. |
| driver_id      | INTEGER       | FK     | No   | → drivers.driver_id                                                                                        |
| credit        | NUMERIC(12,2) |        | Yes  | Driver share credited on trip close.                                                                       |
| debit         | NUMERIC(12,2) |        | Yes  | Records an offline cash-out. No in-app withdrawal in Phase 1.                                              |
| note          | VARCHAR(300)  |        | Yes  | Reason for a debit, e.g. "Cash paid at Kochi office, receipt 1042".                                        |
| created_at     | TIMESTAMPTZ   |        | No   |                                                                                                            |

Each row is either one trip credit or one debit, never both, never 0 (section 7.1). Phase 1 has no manual credits: every credit comes from a closed trip. A debit can never be larger than the balance (section 7.2).

#### invoices

The month-end statement for one company. It needs two admin approvals before the partner can see it.


| Column            | Type          | Key | Null | Notes                                                                                             |
| ----------------- | ------------- | --- | ---- | ------------------------------------------------------------------------------------------------- |
| invoice_id         | INTEGER       | PK  | No   | Identity.                                                                                         |
| company_id         | INTEGER       | FK  | No   | → companies.company_id                                                                            |
| period_month       | CHAR(7)       |     | No   | Month covered, format`YYYY-MM`, in Asia/Kolkata time (section 7.5).                               |
| status            | VARCHAR(30)   |     | No   | DRAFT, PENDING_VERIFICATION, VERIFIED, PUBLISHED, CANCELLED. Default DRAFT.                       |
| created_by_admin_id      | INTEGER       | FK  | No   | → admins.admin_id. The admin who generated it.                                                    |
| verified_by_admin_id1    | INTEGER       | FK  | Yes  | → admins.admin_id. First approval. Must be the creator (PRD 5.4).                                 |
| verified_by_admin_id2    | INTEGER       | FK  | Yes  | → admins.admin_id. Second approval. Must be a different admin.                                    |
| verified_at1       | TIMESTAMPTZ   |     | Yes  | Set together with verified_by_admin_id1.                                                                 |
| verified_at2       | TIMESTAMPTZ   |     | Yes  | Set together with verified_by_admin_id2.                                                                 |
| published_at       | TIMESTAMPTZ   |     | Yes  | When the partner could first see it.                                                              |
| cancelled_at       | TIMESTAMPTZ   |     | Yes  | Set when an admin cancels a wrong invoice before it is published. The reason is in the audit log. |
| total_amount       | NUMERIC(12,2) |     | No   |                                                                                                   |
| total_driver_share  | NUMERIC(12,2) |     | No   |                                                                                                   |
| total_platform_share | NUMERIC(12,2) |     | No   |                                                                                                   |
| version           | INTEGER       |     | No   | Default 0. See section 7.3.                                                                       |
| created_at         | TIMESTAMPTZ   |     | No   |                                                                                                   |
| updated_at         | TIMESTAMPTZ   |     | No   |                                                                                                   |

### 5. Drivers

#### drivers

A driver who uses the mobile app.


| Column              | Type         | Key | Null | Notes                                                                                       |
| ------------------- | ------------ | --- | ---- | ------------------------------------------------------------------------------------------- |
| driver_id            | INTEGER      | PK  | No   | Identity.                                                                                   |
| name                | VARCHAR(150) |     | No   |                                                                                             |
| phone_no             | VARCHAR(20)  | UK  | No   | Login name for the driver app.                                                              |
| password_hash        | VARCHAR(255) |     | No   | bcrypt hash.                                                                                |
| photo_path            | VARCHAR(500) |     | Yes  | Path in private storage.                                                                    |
| is_online            | BOOLEAN      |     | No   | Online / offline switch. Default false.                                                     |
| status              | VARCHAR(20)  |     | No   | PENDING, ACTIVE, INACTIVE. Default PENDING. Only ACTIVE drivers can log in and be assigned. |
| failed_login_attempts | INTEGER      |     | No   | Default 0.                                                                                  |
| locked_until         | TIMESTAMPTZ  |     | Yes  | Set after 5 failed logins (15 minutes).                                                     |
| current_location     | VARCHAR(300) |     | Yes  |                                                                                             |
| created_at           | TIMESTAMPTZ  |     | No   |                                                                                             |
| updated_at           | TIMESTAMPTZ  |     | No   |                                                                                             |

#### driver_documents

A document a driver uploads during onboarding or updates later. An update adds a new row. The newest row of each type is the current document, so older versions stay available to admins.


| Column           | Type         | Key | Null | Notes                                                                                                          |
| ---------------- | ------------ | --- | ---- | -------------------------------------------------------------------------------------------------------------- |
| document_id       | INTEGER      | PK  | No   | Identity.                                                                                                      |
| driver_id         | INTEGER      | FK  | No   | → drivers.driver_id                                                                                            |
| document_type     | VARCHAR(30)  |     | No   | DRIVING_LICENCE, AADHAAR, PAN, PCC (police clearance certificate).                                             |
| file_path          | VARCHAR(500) |     | No   | Path in private storage. The server gives the file a random name; the original name is kept below.             |
| original_file_name | VARCHAR(255) |     | No   | The name the driver uploaded. Shown to admins.                                                                 |
| mime_type         | VARCHAR(100) |     | No   | Checked on upload. Only`image/jpeg`, `image/png` and `application/pdf` are accepted (Technical Guidelines 14). |
| size_bytes        | INTEGER      |     | No   | Checked on upload. Maximum 5 MB.                                                                               |
| uploaded_at       | TIMESTAMPTZ  |     | No   |                                                                                                                |

#### driver_leaves

Days a driver marks as unavailable in advance. The driver can delete a leave to make the days available again (PRD D-03).


| Column    | Type        | Key | Null | Notes                                        |
| --------- | ----------- | --- | ---- | -------------------------------------------- |
| leave_id   | INTEGER     | PK  | No   | Identity.                                    |
| driver_id  | INTEGER     | FK  | No   | → drivers.driver_id                          |
| start_date | DATE        |     | No   | First day off.                               |
| end_date   | DATE        |     | No   | Last day off. Must be on or after start_date. |
| created_at | TIMESTAMPTZ |     | No   |                                              |

### 6. Admins

#### admins

A HireD admin user. All admins have the same access in Phase 1. At least two ACTIVE admins must exist for invoice approval.


| Column              | Type         | Key | Null | Notes                                                              |
| ------------------- | ------------ | --- | ---- | ------------------------------------------------------------------ |
| admin_id             | INTEGER      | PK  | No   | Identity.                                                          |
| office_id            | INTEGER      | FK  | No   | → offices.office_id                                                |
| admin_name           | VARCHAR(150) |     | No   |                                                                    |
| phone_no             | VARCHAR(20)  |     | Yes  |                                                                    |
| email_id             | VARCHAR(254) | UK  | No   | Login name for the admin portal. Unique, compared in lowercase.    |
| password_hash        | VARCHAR(255) |     | No   | bcrypt hash.                                                       |
| status              | VARCHAR(20)  |     | No   | ACTIVE, INACTIVE. Default ACTIVE. An INACTIVE admin cannot log in. |
| failed_login_attempts | INTEGER      |     | No   | Default 0.                                                         |
| locked_until         | TIMESTAMPTZ  |     | Yes  | Set after 5 failed logins (15 minutes).                            |
| created_at           | TIMESTAMPTZ  |     | No   |                                                                    |
| updated_at           | TIMESTAMPTZ  |     | No   |                                                                    |

### 7. System

#### audit_logs

A record of who changed what and when, for important actions. One table covers all record types.


| Column     | Type         | Key | Null | Notes                                                                       |
| ---------- | ------------ | --- | ---- | --------------------------------------------------------------------------- |
| audit_id    | BIGINT       | PK  | No   | Identity.                                                                   |
| actor_id    | INTEGER      |     | Yes  | The user's id. Empty when the system acts.                                  |
| actor_type  | VARCHAR(10)  |     | No   | ADMIN, PARTNER, DRIVER, SYSTEM.                                             |
| action     | VARCHAR(50)  |     | No   | e.g. DRIVER_REASSIGNED. Full list in section 11.                            |
| entity_type | VARCHAR(30)  |     | No   | Which table changed, e.g. TRIP, COMPANY, INVOICE.                           |
| entity_id   | INTEGER      |     | No   | The id of the changed row.                                                  |
| old_value   | JSONB        |     | Yes  | Only the changed fields, before the change.                                 |
| new_value   | JSONB        |     | Yes  | Only the changed fields, after the change.                                  |
| ip_address  | INET         |     | Yes  |                                                                             |
| reason     | VARCHAR(500) |     | Yes  | Optional note from the admin. Required for INVOICE_CANCELLED and OTP_RESET. |
| created_at  | TIMESTAMPTZ  |     | No   | Default`now()`.                                                             |

#### sessions

One row per login. It holds the hash of the refresh token (section 10.5).


| Column           | Type        | Key | Null | Notes                                                                     |
| ---------------- | ----------- | --- | ---- | ------------------------------------------------------------------------- |
| session_id        | INTEGER     | PK  | No   | Identity.                                                                 |
| user_type         | VARCHAR(10) |     | No   | ADMIN, PARTNER, DRIVER.                                                   |
| user_id           | INTEGER     |     | No   | admin_id, company_id or driver_id, depending on user_type.                    |
| refresh_token_hash | VARCHAR(64) | UK  | No   | SHA-256 of the refresh token. The token itself is never stored.           |
| expires_at        | TIMESTAMPTZ |     | No   | 7 days after login.                                                       |
| revoked_at        | TIMESTAMPTZ |     | Yes  | Set on logout, on password change, or when an admin deactivates the user. |
| ip_address        | INET        |     | Yes  |                                                                           |
| created_at        | TIMESTAMPTZ |     | No   |                                                                           |

#### notifications

Every email the system sends, so a failed email can be retried and an admin can see what was sent (PRD B-07).


| Column         | Type         | Key | Null | Notes                                                          |
| -------------- | ------------ | --- | ---- | -------------------------------------------------------------- |
| notification_id | INTEGER      | PK  | No   | Identity.                                                      |
| recipient_type  | VARCHAR(10)  |     | No   | PARTNER (Phase 1). ADMIN and DRIVER are allowed for later use. |
| recipient_id    | INTEGER      |     | No   | company_id, admin_id or driver_id.                                |
| recipient_email | VARCHAR(254) |     | No   | Copy of the address at send time.                              |
| type           | VARCHAR(30)  |     | No   | ORDER_ACCEPTED, ORDER_REJECTED, STATEMENT_PUBLISHED.           |
| entity_type     | VARCHAR(30)  |     | No   | ORDER or INVOICE.                                              |
| entity_id       | INTEGER      |     | No   |                                                                |
| status         | VARCHAR(10)  |     | No   | PENDING, SENT, FAILED. Default PENDING.                        |
| attempts       | INTEGER      |     | No   | Default 0. Retried up to 3 times.                              |
| last_error      | VARCHAR(500) |     | Yes  | Error message from the mail service, for debugging.            |
| sent_at         | TIMESTAMPTZ  |     | Yes  |                                                                |
| created_at      | TIMESTAMPTZ  |     | No   |                                                                |

---

## 6. Relationships and cardinality

"1 : N" means one row in the parent table links to many rows in the child table. "1 : 0..1" means one parent row links to zero or one child row. "Optional" means the child's foreign key column can be empty.


| Parent    | Child                    | Foreign key      | Cardinality        | Meaning                                                                                        |
| --------- | ------------------------ | ---------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| offices   | companies                | office_id         | 1 : N              | One office has many partner companies.                                                         |
| offices   | admins                   | office_id         | 1 : N              | One office has many admins.                                                                    |
| companies | orders                   | company_id        | 1 : N              | One company places many orders.                                                                |
| admins    | orders                   | created_by_admin_id | 1 : N, optional    | One admin types in many phone or WhatsApp orders. Empty for portal orders.                     |
| admins    | orders                   | decided_by_admin_id | 1 : N, optional    | One admin decides many orders. Empty while RECEIVED.                                           |
| orders    | trips                    | order_id          | 1 : 0..1           | An accepted order has exactly one trip. A rejected order has none.                             |
| drivers   | trips                    | driver_id         | 1 : N, optional    | One driver does many trips. A trip has one driver at a time, or none while UNASSIGNED.         |
| trips     | expenses                 | trip_id           | 1 : N              | One trip can have many expenses.                                                               |
| drivers   | expenses                 | driver_id         | 1 : N              | One driver logs many expenses.                                                                 |
| trips     | trip_payrolls             | trip_id           | 1 : 0..1           | A closed trip has exactly one payroll record.                                                  |
| drivers   | trip_payrolls             | driver_id         | 1 : N              | One driver is paid for many trips.                                                             |
| trips     | driver_wallet_transactions | trip_id           | 1 : 0..1, optional | A closed trip creates exactly one wallet credit. A debit row has no trip.                      |
| drivers   | driver_wallet_transactions | driver_id         | 1 : N              | One driver has many wallet transactions.                                                       |
| invoices  | trip_payrolls             | invoice_id        | 1 : N, optional    | One invoice covers many trip payroll records. A payroll record has no invoice until month end. |
| companies | invoices                 | company_id        | 1 : N              | One company gets one invoice per month.                                                        |
| admins    | invoices                 | created_by_admin_id     | 1 : N              | One admin creates many invoices.                                                               |
| admins    | invoices                 | verified_by_admin_id1   | 1 : N, optional    | First approval.                                                                                |
| admins    | invoices                 | verified_by_admin_id2   | 1 : N, optional    | Second approval.                                                                               |
| drivers   | driver_documents          | driver_id         | 1 : N              | One driver uploads many documents.                                                             |
| drivers   | driver_leaves             | driver_id         | 1 : N              | One driver marks many leave periods.                                                           |

`audit_logs`, `sessions` and `notifications` have no foreign keys. See the note under the ER diagram.

---

## 7. Constraints and business rules

### 7.1 Rules enforced by PostgreSQL

The database checks these rules itself. They protect the data even if the backend has a bug.


| Table                    | Rule                                                                                                                 | Why                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| companies                | `CHECK (driver_share_pct + platform_share_pct = 100)`                                                                             | The two shares always add up to 100%.                                                               |
| companies                | `CHECK (driver_share_pct BETWEEN 0 AND 100)`                                                                              | A share cannot be negative or over 100%.                                                            |
| companies, admins        | `CREATE UNIQUE INDEX ... ((lower(email_id)))`                                                                         | Two users cannot share a login name, even with different capital letters.                           |
| drivers                  | `UNIQUE (phone_no)`                                                                                                   | Two drivers cannot share a login name.                                                              |
| orders                   | `CHECK (status = 'RECEIVED' OR (decided_by_admin_id IS NOT NULL AND decided_at IS NOT NULL))`                            | An accepted or rejected order always records who decided and when.                                  |
| orders                   | `CHECK (status <> 'REJECTED' OR reject_reason IS NOT NULL)`                                                           | A rejection always has a reason for the partner's email.                                            |
| trips                    | `UNIQUE (order_id)`                                                                                                   | One order becomes at most one trip.                                                                 |
| trips                    | `CHECK (amount > 0)`                                                                                                 | A trip always has a real amount. A free trip is not a Phase 1 case.                                 |
| trips                    | `CHECK (otp_attempts BETWEEN 0 AND 5)`                                                                                | The counter cannot go past the lock limit.                                                          |
| trips                    | `CHECK (status <> 'CLOSED' OR (expenses_confirmed AND closed_at IS NOT NULL))`                                     | A trip can close only after the driver confirms the expenses (PRD D-09).                            |
| trips                    | `CHECK (status = 'UNASSIGNED' OR (driver_id IS NOT NULL AND assigned_at IS NOT NULL))`                             | An assigned, ongoing or closed trip always has a driver and an assignment time.                     |
| expenses                 | `CHECK (amount > 0)`                                                                                                 | An expense must have a real amount.                                                                 |
| trip_payrolls             | `UNIQUE (trip_id)`                                                                                                    | One payroll record per trip. Blocks double payout.                                                  |
| trip_payrolls             | `CHECK (driver_share_pct + platform_share_pct = 100)`                                                                               | The copied split is complete.                                                                       |
| trip_payrolls             | `CHECK (driver_share + platform_share = trip_amount)`                                                                    | The shares always add up to the trip amount.                                                        |
| driver_wallet_transactions | `UNIQUE (trip_id)`                                                                                                    | One wallet credit per trip. PostgreSQL allows many empty`trip_id` values, so debits are not blocked. |
| driver_wallet_transactions | `CHECK ((credit > 0 AND debit IS NULL AND trip_id IS NOT NULL) OR (debit > 0 AND credit IS NULL AND trip_id IS NULL))` | Each row is either one trip credit or one debit, never both and never 0.                            |
| invoices                 | `CREATE UNIQUE INDEX ... (company_id, period_month) WHERE status <> 'CANCELLED'`                                       | Only one live invoice per company per month. A cancelled invoice does not block a new one.          |
| invoices                 | `CHECK (period_month ~ '^[0-9]{4}-(0[1-9]\|1[0-2])$')`                                                                | The month is written `YYYY-MM` with a real month number (01 to 12).                                  |
| invoices                 | `CHECK ((verified_by_admin_id1 IS NULL) = (verified_at1 IS NULL))` and the same for 2                                        | An approver and its time are always set together.                                                   |
| invoices                 | `CHECK (verified_by_admin_id1 IS NULL OR verified_by_admin_id1 = created_by_admin_id)`                                                    | The first approval comes from the creator (PRD 5.4).                                                |
| invoices                 | `CHECK (verified_by_admin_id2 IS NULL OR verified_by_admin_id2 <> created_by_admin_id)`                                                   | The second approval comes from a different admin (Technical Guidelines 27).                         |
| invoices                 | `CHECK (status NOT IN ('VERIFIED','PUBLISHED') OR (verified_by_admin_id1 IS NOT NULL AND verified_by_admin_id2 IS NOT NULL))`      | An invoice cannot be VERIFIED or PUBLISHED without both approvals.                                  |
| invoices                 | `CHECK ((status = 'PUBLISHED') = (published_at IS NOT NULL))`                                                         | A published invoice records when, and only a published one has that time.                           |
| invoices                 | `CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL))`                                                         | Same for cancellation.                                                                              |
| driver_leaves             | `CHECK (end_date >= start_date)`                                                                                       | A leave period cannot end before it starts.                                                         |
| sessions                 | `CHECK (expires_at > created_at)`                                                                                      |                                                                                                     |
| notifications            | `CHECK (status <> 'SENT' OR sent_at IS NOT NULL)`                                                                     |                                                                                                     |
| every status column      | `CHECK (status IN (...))`                                                                                            | Only the values in section 8 can be saved.                                                          |
| all foreign keys         | `ON DELETE RESTRICT`                                                                                                 | Rows with history are never deleted.                                                                |

### 7.2 Rules checked by the backend

These rules depend on the order of steps or on other rows, so the backend checks them inside a transaction.


| Rule                                                                                                                            | How                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status moves only forward (section 8).                                                                                          | The update includes the expected current status:`UPDATE trips SET status = 'CLOSED' ... WHERE trip_id = $1 AND status = 'ONGOING'`. If no row changes, the request is refused.       |
| **`driver_id` cannot change once a trip is CLOSED.**                                                                             | `UPDATE trips SET driver_id = $1 ... WHERE trip_id = $2 AND status <> 'CLOSED'`. The payroll record also keeps its own copy of the driver, so even a bug here cannot change who was paid. |
| Trip amount can change only before the trip closes.                                                                             | `UPDATE ... WHERE status <> 'CLOSED'`.                                                                                                                                                  |
| **Expenses can be added, edited or deleted only while the trip is not CLOSED.**                                                 | Every expense write first locks the trip row and checks its status. The trip report never changes after close. Every edit and delete is written to the audit log (`EXPENSE_CHANGED`, `EXPENSE_DELETED`).                                                                              |
| A wrong OTP adds 1 to`otp_attempts`. At 5 the backend refuses all codes for that trip.                                           | An admin can reset the counter. The reset needs a reason and is written to the audit log.                                                                                                   |
| Only ACTIVE admins, companies and drivers can log in or be assigned. A locked user (`locked_until` in the future) cannot log in. | Checked at login and on every request.                                                                                                                                                      |
| **A debit can never be larger than the wallet balance.**                                                                        | The backend locks the driver's wallet rows (`SELECT ... FOR UPDATE`), computes the balance, and refuses the debit if it is larger.                                                          |
| **An invoice can be cancelled only while DRAFT or PENDING_VERIFICATION.**                                                       | A PUBLISHED or VERIFIED invoice is never cancelled. The cancel needs a reason, written to the audit log. The payroll rows get`invoice_id = NULL` again, so they can join a new invoice.      |
| A trip in a VERIFIED or PUBLISHED invoice cannot change.                                                                        | The backend refuses edits to trips whose payroll row belongs to such an invoice.                                                                                                            |
| Only ACTIVE drivers can be assigned. A driver on leave on the pickup day gets a warning, but the admin may still assign.        | Checked in the assign step.                                                                                                                                                                 |

### 7.3 Two admins changing the same row

`orders`, `trips` and `invoices` have a `version` number. Every update sends the version it read, adds 1, and also names the status it expects:

```sql
UPDATE invoices
SET    status = 'VERIFIED', verified_by_admin_id2 = $1, verified_at2 = now(),
       version = version + 1, updated_at = now()
WHERE  invoice_id = $2 AND version = $3 AND status = 'PENDING_VERIFICATION';
```

If another admin changed the row first, no row is updated. The backend then tells the user to reload. This stops one admin's change from silently overwriting another's, for example two reassignments of the same trip at the same moment.

### 7.4 Trip close: one transaction

The trip close follows Technical Guidelines section 9. All steps run in **one** PostgreSQL transaction. If any step fails, nothing is saved.

1. Lock the trip row: `SELECT ... FROM trips WHERE trip_id = $1 FOR UPDATE`.
2. Check: the trip's status is ONGOING, expenses_confirmed is true, otp_attempts is below 5, and the OTP matches.
3. Read the company's current split.
4. Set the trip to CLOSED and set closed_at.
5. Insert the `trip_payrolls` row with the copied driver, amount and split.
6. Insert the wallet credit.
7. Insert the audit rows TRIP_CLOSED and WALLET_CREDITED.
8. Commit.

If the driver's phone sends the close request twice, the second request waits at step 1. It then finds the trip already CLOSED and stops. If it somehow reached step 5, the `UNIQUE (trip_id)` rule would refuse it. So the driver is always paid exactly once.

### 7.5 Which month a trip belongs to

All times are stored in UTC. HireD works in India (UTC+5:30). A trip closed at 01:00 on 1 October in India is 19:30 on 30 September in UTC. If the month came from the UTC value, the trip would land in the wrong invoice.

**Rule:** a trip belongs to the month of `closed_at` in Asia/Kolkata time:

```sql
to_char(closed_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM') = period_month
```

Invoice generation picks every payroll row whose trip matches this and whose `invoice_id` is empty.

For speed, the backend does not convert every row. It turns the month into a start time and an end time in Asia/Kolkata and compares `closed_at` with them. This picks the same trips and lets PostgreSQL use the index on `closed_at` (section 9):

```sql
closed_at >= (to_date(period_month, 'YYYY-MM')::timestamp AT TIME ZONE 'Asia/Kolkata')
AND closed_at <  ((to_date(period_month, 'YYYY-MM') + interval '1 month')::timestamp AT TIME ZONE 'Asia/Kolkata')
```

**A trip that closes after the invoice was generated:**

- If the invoice is still DRAFT, the admin regenerates it. The totals are recalculated and the late trip is attached.
- If the invoice has gone past DRAFT, the late trip keeps `invoice_id = NULL` and is picked up by the next month's invoice. The report "Billing issues" (section 12) lists such trips, so nothing is forgotten.

---

## 8. Status values


| Column                       | Allowed values (in order)                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| orders.status                | RECEIVED → ACCEPTED or REJECTED                                                                    |
| orders.source                | PORTAL, ADMIN                                                                                       |
| trips.status             | UNASSIGNED → ASSIGNED → ONGOING → CLOSED                                                         |
| trip_payrolls.payout_status    | PENDING → CREDITED (always CREDITED in Phase 1)                                                    |
| trip_payrolls.payment_status   | UNPAID → PAID                                                                                      |
| invoices.status              | DRAFT → PENDING_VERIFICATION → VERIFIED → PUBLISHED. DRAFT or PENDING_VERIFICATION → CANCELLED. |
| companies.status             | ACTIVE ↔ INACTIVE                                                                                  |
| admins.status                | ACTIVE ↔ INACTIVE                                                                                  |
| drivers.status               | PENDING → ACTIVE, and ACTIVE ↔ INACTIVE                                                           |
| driver_documents.document_type | DRIVING_LICENCE, AADHAAR, PAN, PCC                                                                  |
| audit_logs.actor_type          | ADMIN, PARTNER, DRIVER, SYSTEM                                                                      |
| sessions.user_type            | ADMIN, PARTNER, DRIVER                                                                              |
| notifications.type           | ORDER_ACCEPTED, ORDER_REJECTED, STATEMENT_PUBLISHED                                                 |
| notifications.status         | PENDING → SENT or FAILED                                                                           |

---

## 9. Indexes

PostgreSQL creates an index for every primary key and every UNIQUE rule automatically. PostgreSQL does **not** index foreign keys automatically, so we add an index where a screen or report filters or sorts by a column. We do not index every column: each index makes writes slower and takes space, and a column such as `status` has only a few different values.

**Names:** `idx_<table>_<columns>` for a normal index and `uq_<table>_<columns>` for a unique one, in snake_case. A **partial index** covers only the rows that match a `WHERE` condition. It is smaller and faster when most rows are not interesting (for example, closed trips).

| Index name | Table | Columns | Kind | Used by |
| ---------- | ----- | ------- | ---- | ------- |
| `idx_orders_company_id_created_at` | orders | company_id, created_at | Normal | Partner portal: "My Orders" list, newest first. |
| `idx_orders_received` | orders | created_at | Partial: `WHERE status = 'RECEIVED'` | Admin inbox: new orders. |
| `idx_trips_driver_id_status` | trips | driver_id, status | Normal | Driver app: "My Trips" list. |
| `idx_trips_open_status` | trips | status | Partial: `WHERE status <> 'CLOSED'` | Admin: ongoing trips page and the list of trips still to assign. |
| `idx_trips_closed_at` | trips | closed_at | Normal | Month-end invoice: trips closed in a month (range form in section 7.5). |
| `idx_expenses_trip_id` | expenses | trip_id | Normal | Trip report: expenses of a trip. |
| `uq_trip_payrolls_trip_id` | trip_payrolls | trip_id | Unique | Also blocks double payout. |
| `idx_trip_payrolls_driver_id_created_at` | trip_payrolls | driver_id, created_at | Normal | Driver payout report. |
| `idx_trip_payrolls_invoice_id` | trip_payrolls | invoice_id | Normal | Invoice detail: its trips. |
| `idx_trip_payrolls_no_invoice` | trip_payrolls | created_at | Partial: `WHERE invoice_id IS NULL` | Invoice generation and the "Billing issues" report: payroll rows that are on no invoice. |
| `idx_trip_payrolls_unpaid` | trip_payrolls | created_at | Partial: `WHERE payment_status = 'UNPAID'` | Report: trips the partner has not paid yet. |
| `idx_driver_wallet_transactions_driver_id_created_at` | driver_wallet_transactions | driver_id, created_at | Normal | Driver app: wallet balance and history. |
| `uq_driver_wallet_transactions_trip_id` | driver_wallet_transactions | trip_id | Unique | Also blocks double wallet credit. |
| `uq_invoices_company_id_period_month_live` | invoices | company_id, period_month | Unique, partial: `WHERE status <> 'CANCELLED'` | A company's live invoice for a month. |
| `idx_invoices_status` | invoices | status | Normal | Admin: invoices waiting for approval. The table is small, so a normal index is enough. |
| `idx_driver_documents_driver_id_document_type_uploaded_at` | driver_documents | driver_id, document_type, uploaded_at | Normal | Onboarding queue: current documents of a driver. |
| `idx_driver_leaves_driver_id_start_date` | driver_leaves | driver_id, start_date | Normal | Check if a driver is free on a date. |
| `uq_companies_lower_email_id` | companies | lower(email_id) | Unique, on an expression | Login lookup. |
| `uq_admins_lower_email_id` | admins | lower(email_id) | Unique, on an expression | Login lookup. |
| `idx_sessions_user_type_user_id` | sessions | user_type, user_id | Normal | Revoke all sessions of one user. |
| `idx_sessions_expires_at` | sessions | expires_at | Normal | Clean-up of old sessions. |
| `idx_notifications_retry` | notifications | created_at | Partial: `WHERE status IN ('PENDING', 'FAILED')` | Retry queue for emails. |
| `idx_audit_logs_entity` | audit_logs | entity_type, entity_id | Normal | History of one record. |
| `idx_audit_logs_actor` | audit_logs | actor_type, actor_id | Normal | Everything one user did. |
| `idx_audit_logs_created_at` | audit_logs | created_at | Normal | Audit by date range. |

The UNIQUE rules in section 7.1 also create these indexes without extra work: `uq_drivers_phone_no`, `uq_trips_order_id` and `uq_sessions_refresh_token_hash`.

### Foreign keys without their own index

These columns are foreign keys, but no screen or report filters by them, and nobody deletes their parent rows (all foreign keys use `ON DELETE RESTRICT`). An index would only slow down writes: `companies.office_id`, `admins.office_id`, `orders.created_by_admin_id`, `orders.decided_by_admin_id`, `expenses.driver_id`, `invoices.created_by_admin_id`, `invoices.verified_by_admin_id1` and `invoices.verified_by_admin_id2`. `invoices.company_id` is covered by the partial unique index above for every invoice except a cancelled one. If a later screen filters by one of these columns, add the index in a new migration.

---

## 10. Data access and security

This section shows how the database supports the PRD security rule: "partners and drivers can only access their own data" (PRD section 7).

### 10.1 Who can see which rows

The backend reads `company_id` or `driver_id` **from the login token only**, never from the request. Every query for a partner or a driver includes that id in the `WHERE` clause.


| Table                                               | Partner can see                                                    | Driver can see                                   |
| --------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| companies                                           | Own row only, without`password_hash`                                | —                                               |
| orders                                              | `orders.company_id = own company_id`                                 | —                                               |
| trips                                               | Trips of own orders (join on`orders.company_id`), including the OTP | `trips.driver_id = own driver_id`, without the OTP |
| expenses                                            | Expenses of own trips (in the trip report)                         | `expenses.driver_id = own driver_id`               |
| drivers                                             | Name and phone of the driver on an own trip                        | Own row only                                     |
| driver_documents                                     | —                                                                 | Own documents only                               |
| driver_leaves                                        | —                                                                 | Own rows only                                    |
| driver_wallet_transactions                            | —                                                                 | Own rows only                                    |
| trip_payrolls | Rows whose `invoice_id` points to an own invoice with status PUBLISHED (the rates and shares on the statement) | — |
| invoices                                            | Own invoices**with status PUBLISHED only**                         | —                                               |
| offices, admins, audit_logs, sessions, notifications | —                                                                 | —                                               |

Admins can see all rows, as the PRD says. No user can see any `password_hash` or `refresh_token_hash`.

A partner sees the split and the shares of a trip only through a PUBLISHED month-end statement, never in the Trip Report (section 12.1).

The OTP is shown only to the trip's partner, not to the driver. The driver must get the code from the partner, which proves the partner agrees the trip happened. Admins can see the OTP because the PRD gives admins full visibility; every admin action is in the audit log.

### 10.2 Switching users off

Rows with history are never deleted. To remove access, an admin sets `status = INACTIVE` on the company, admin or driver. In the same transaction, all the user's `sessions` get `revoked_at = now()`. The backend checks the status on every request, so access stops at once. The change is written to the audit log.

### 10.3 Database roles


| PostgreSQL role | Rights                                                                                                                                                                   | Used by                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `hired_owner`   | Owns the tables. Runs migrations.                                                                                                                                        | Prisma Migrate only. Never used by the running app. |
| `hired_app`     | `SELECT, INSERT, UPDATE` on all tables. `DELETE` only on `driver_leaves`, `expenses` and `sessions`. **Only `SELECT, INSERT` on `audit_logs`.** No right to change tables. | The backend at run time.                            |

Why these three tables allow DELETE: a driver must be able to remove a leave day (PRD D-03) and fix a wrong expense before the trip closes (PRD D-08); expired sessions are cleaned up. Money rows, orders, trips and users are never deleted.

The connection details are in environment variables (`DATABASE_URL`) and never in the code repository.

### 10.4 Sensitive data

- Passwords: bcrypt hash only.
- Aadhaar, PAN and other document **numbers are not stored** in the database. Only the file path is stored, and the file stays in private storage.
- Files are served only to logged-in users who may see them, through signed links that expire after 5 minutes.
- Passwords, tokens, OTPs and document contents are never written to the audit log or the application logs.

### 10.5 Login tokens and sessions

- Login returns a **JWT access token** that lives 15 minutes and a **refresh token** that lives 7 days.
- The access token carries `user_type`, `user_id` and `session_id`. The backend checks the user's `status` and the session's `revoked_at` on every request.
- The refresh token is stored only as a SHA-256 hash in `sessions`. Logout, a password change, or deactivation by an admin sets `revoked_at`, so the token stops working within one request.
- After 5 failed logins the user's `locked_until` is set 15 minutes ahead. The attempt counter is reset on a good login.

### 10.6 Who can create or change which rows

The backend enforces these rules. It always takes `company_id` or `driver_id` from the login token, so a partner or a driver never sends their own id.

| Role | Can create or change | Cannot |
| ---- | -------------------- | ------ |
| Partner | Create an `orders` row for its own company (status RECEIVED, source PORTAL). | Edit or cancel an order after it is created (the Phase 1 PRD has no such feature). Change any other table. |
| Driver | Switch own `is_online` and change own `photo_path`. Add `driver_documents` rows. Add and delete own `driver_leaves`. Add, edit and delete `expenses` on own trip while it is not CLOSED. Set `expenses_confirmed` on own trip. Start own ASSIGNED trip (with the selfie). Close own ONGOING trip with the OTP. | Change `amount`, `driver_id` or the split. Write `trip_payrolls` or `driver_wallet_transactions` directly: the trip-close transaction writes them (section 7.4). Touch another driver's rows. |
| Admin | Everything in the admin screens: orders, trips, drivers, companies and the split, invoices, `payment_status`, user `status`, OTP reset, and a wallet debit (offline cash-out). | Edit or delete `audit_logs` (no right, section 10.3). Change the driver or amount of a CLOSED trip. Edit a trip on a VERIFIED or PUBLISHED invoice (section 7.2). Create payroll rows or wallet credits by hand. |

### 10.7 Other protection

- All database access uses Prisma or parameterized queries (`$1`, `$2`). User input is never joined into SQL text, which prevents SQL injection.
- In deployed environments the backend connects to PostgreSQL over TLS.
- Backups and disk encryption at rest come from the hosting provider and are described in `docs/deployment.md` (Technical Guidelines 22.8).
- The `hired_app` role cannot create or drop tables (section 10.3), so an attack through the application cannot change the schema.

---

## 11. Audit trail

The `audit_logs` table records important actions: who did it, what changed, which record, the old value and the new value, and when (PRD section 7).

- The backend writes the audit row **in the same transaction** as the change. Either both are saved or neither is.
- The backend writes the row, not a database trigger, because only the backend knows which user is logged in.
- The app's database role can only add and read audit rows (section 10.3).


| Action                                   | Table changed              | Source          |
| ---------------------------------------- | -------------------------- | --------------- |
| PAYOUT_SPLIT_CHANGED                     | companies                  | Required by PRD |
| TRIP_AMOUNT_CHANGED                      | trips                      | Required by PRD |
| DRIVER_ASSIGNED / DRIVER_REASSIGNED      | trips                      | Required by PRD |
| INVOICE_APPROVED                         | invoices                   | Required by PRD |
| ORDER_ACCEPTED / ORDER_REJECTED          | orders                     | Added by team   |
| TRIP_CLOSED                              | trips                      | Added by team   |
| WALLET_CREDITED (actor = SYSTEM)         | driver_wallet_transactions   | Added by team   |
| WALLET_DEBITED                           | driver_wallet_transactions   | Added by team   |
| EXPENSE_CHANGED / EXPENSE_DELETED        | expenses                   | Added by team   |
| PAYMENT_STATUS_CHANGED                   | trip_payrolls               | Added by team   |
| INVOICE_GENERATED / INVOICE_REGENERATED  | invoices                   | Added by team   |
| INVOICE_PUBLISHED                        | invoices                   | Added by team   |
| INVOICE_CANCELLED (reason required)      | invoices                   | Added by team   |
| DRIVER_ACTIVATED                         | drivers                    | Added by team   |
| USER_DEACTIVATED / USER_REACTIVATED      | companies, admins, drivers | Added by team   |
| OTP_LOCKED / OTP_RESET (reason required) | trips                      | Added by team   |

**Example row:** actor_type ADMIN, actor_id 3, action DRIVER_REASSIGNED, entity_type TRIP, entity_id 1024, old_value `{"driver_id": 1}`, new_value `{"driver_id": 5}`.

**Allowed `entity_type` values:** `ORDER`, `TRIP`, `EXPENSE`, `COMPANY`, `DRIVER`, `ADMIN`, `INVOICE`, `PAYROLL`, `WALLET_TRANSACTION`. They are constants in the backend code, not a database CHECK, so a new record type can be audited without a migration. `entity_id` is the primary key of the changed row (`order_id`, `trip_id`, and so on).

**Known limit:** the `hired_owner` role owns the table and could change audit rows. It is used only to run migrations and never by the running backend (section 10.3).

---

## 12. Reports and the Trip Report

No report is a stored table. Every report is a query over the tables above, so a report always shows the current data.

### 12.1 Trip Report (PRD B-05)

The Trip Report is for one trip. It is built from `trips`, `orders`, `drivers`, `expenses` and, for admins, `trip_payrolls`. It becomes visible to the partner when the trip's `status` is CLOSED. Because the trip and its expenses cannot change after close (section 7.2), the report is stable.

| Field | Source | Partner sees | Admin sees |
| ----- | ------ | ------------ | ---------- |
| Trip number | `trips.trip_id` | Yes | Yes |
| Pickup, drop and requested pickup time | `orders.pickup_spot`, `dropoff_spot`, `pickup_time` | Yes | Yes |
| Contact for the trip | `orders.contact_name`, `contact_phone` | Yes | Yes |
| Driver name and phone | `drivers.name`, `phone_no` | Yes | Yes |
| Started and closed time | `trips.started_at`, `closed_at` | Yes | Yes |
| Trip amount | `trips.amount` | Yes | Yes |
| Expenses (each line and the total) | `expenses.description`, `amount` | Yes | Yes |
| Driver selfie | `trips.selfie_path` | No | Yes |
| Split applied, driver share and platform share | `trip_payrolls.driver_share_pct`, `platform_share_pct`, `driver_share`, `platform_share` | No | Yes |
| Payout status and payment status | `trip_payrolls.payout_status`, `payment_status` | No | Yes |

The partner sees the split and the shares only on the PUBLISHED month-end statement, because the PRD lists them as statement contents (PRD 5.4).

The partner's Trip Report query:

```sql
SELECT t.trip_id, o.pickup_spot, o.dropoff_spot, o.pickup_time,
       d.name AS driver_name, d.phone_no AS driver_phone,
       t.started_at, t.closed_at, t.amount,
       COALESCE(SUM(e.amount), 0) AS expenses_total
FROM trips t
JOIN orders o ON o.order_id = t.order_id
LEFT JOIN drivers d ON d.driver_id = t.driver_id
LEFT JOIN expenses e ON e.trip_id = t.trip_id
WHERE t.trip_id = $1
  AND o.company_id = $2          -- the partner's own company_id, from the login token
  AND t.status = 'CLOSED'
GROUP BY t.trip_id, o.order_id, d.driver_id;
```

The admin's version leaves out the `o.company_id` line, adds `LEFT JOIN trip_payrolls p ON p.trip_id = t.trip_id` for the split, shares and statuses, and also groups by `p.payroll_id`.

### 12.2 Definitions used by the reports

The PRD names the reports but does not define these words, so this document does:

| Term | Definition |
| ---- | ---------- |
| Delay | `trips.started_at` − `orders.pickup_time`, when the result is above zero. |
| On time | The trip started no later than `pickup_time` plus 15 minutes. The 15 minutes is a setting in the backend, not a column. |
| On-time rate | On-time trips ÷ trips that have a `started_at` (ONGOING and CLOSED). |
| Success rate | CLOSED trips ÷ ACCEPTED orders. |
| Rejected share | REJECTED orders ÷ all orders. |
| Period | Rates for a period count the orders created in that period. A month is the calendar month in Asia/Kolkata time (section 7.5). |

### 12.3 The seven reports (PRD 5.5)

| PRD 5.5 report | Built from |
| -------------- | ---------- |
| Billing issues | `trip_payrolls` with empty `invoice_id` for a past month; `trip_payrolls` with `payment_status = 'UNPAID'`; invoices whose totals differ from the sum of their payroll rows. |
| Driver delay report | Delay (section 12.2) per trip, grouped by `driver_id`. |
| Client order volume and success rate | `orders` grouped by `company_id` and `status`; success rate and on-time rate as defined in section 12.2. |
| Driver payout report | `trip_payrolls` grouped by `driver_id`, with the wallet balance from `driver_wallet_transactions`. |
| Trip Report (live / daily / monthly) | Live: `trips` with `status = 'ONGOING'`. Daily or monthly: `trips` with `closed_at` in the day or month (Asia/Kolkata). |
| Order Report | `orders` with status, source and `decided_at`. |
| Driver (Staff) Work Report | `trips` per `driver_id`: count, hours between `started_at` and `closed_at`, and `driver_leaves`. |

Example: orders and success per company for one period.

```sql
SELECT o.company_id,
       COUNT(*)                                            AS orders,
       COUNT(*) FILTER (WHERE o.status = 'REJECTED')       AS rejected_orders,
       COUNT(t.trip_id) FILTER (WHERE t.status = 'CLOSED')  AS closed_trips
FROM orders o
LEFT JOIN trips t ON t.order_id = o.order_id
WHERE o.created_at >= $1 AND o.created_at < $2     -- start and end of the period
GROUP BY o.company_id;
```

---

## 13. Normalization

The design follows **third normal form (3NF)**. In simple terms: each fact is stored in one place, and every column describes only the row it belongs to.

**How we checked it**

| Form | Rule | Result |
| ---- | ---- | ------ |
| 1NF | Every column holds one value. No repeating groups. | Names, phone numbers, emails and amounts are single values. Things that repeat (documents, leaves, expenses, notifications, sessions) are separate tables with one row each. `old_value` and `new_value` in `audit_logs` are JSONB on purpose: they are history, not data the system searches by field. |
| 2NF | No column depends on only part of a key. | Every table has a single-column primary key, so a partial dependency cannot happen. |
| 3NF | No column depends on another non-key column. | Company details are stored once in `companies`, and orders and invoices store only `company_id`. An order's office is read through its company, so there is no second `office_id` that could disagree. Driver name and phone are read from `drivers`, never copied into `trips`. |

- The current driver of a trip is stored only on `trips`, not on `orders`. A reassignment changes one row.
- Driver documents and leave periods are in their own tables, because one driver has many of each.
- Expenses are in their own table, because one trip has many expenses.
- Reports are queries, not tables (section 12).

**Copies and repeated values kept on purpose (planned denormalization):**

- `trip_payrolls` copies the **driver**, the trip amount and the split percentages at trip close. The PRD says later rate changes must never change past trips. The driver copy makes sure the payroll record always names the driver who was actually paid, even if the trip row is changed by mistake later.
- `invoices` stores the monthly totals. A published invoice must not change, even if someone edits a trip later.
- `notifications.recipient_email` copies the address at send time, so the record shows where the email really went.
- `companies.driver_share_pct` and `companies.platform_share_pct` always add up to 100, so one can be worked out from the other. Both are stored so the split reads plainly in screens and in the payroll copy, and the CHECK rule in section 7.1 keeps them in line.
- `invoices.verified_by_admin_id1` always equals `created_by_admin_id` (CHECK rule in section 7.1). It is stored separately so both approvals are recorded the same way, who and when, as PRD 5.4 and Technical Guidelines 27 ask.
- `expenses.driver_id` can also be read through the trip. It is stored because a trip can be reassigned before it closes, so an expense keeps the driver who logged it, and the driver app can list a driver's own expenses without a join.

---

## 14. Important design decisions

1. **The payout split is set per company, not per driver.** `companies.driver_share_pct` and `companies.platform_share_pct` hold it, for example 30 / 70. The admin only enters the total trip amount. The system calculates both shares (PRD 5.4).
2. **Exactly one payout per trip.** The trip close is one transaction with a row lock, and `trip_id` is unique in both money tables (section 7.4).
3. **The payroll record is a frozen copy.** It holds the driver, amount and split at close. Nothing that happens to the trip, the driver or the company later can change what was paid (Technical Guidelines 26).
4. **Two-person invoice approval is enforced by the database.** CHECK rules make sure the creator gives the first approval, a different admin gives the second, and no invoice is VERIFIED or PUBLISHED without both (section 7.1).
5. **A wrong invoice can be cancelled and regenerated.** The second admin can refuse. A CANCELLED invoice frees its payroll rows and does not block a new invoice for the same month, because the unique index ignores cancelled rows. A PUBLISHED invoice is never cancelled.
6. **Months are counted in India time.** `closed_at` is stored in UTC and converted to Asia/Kolkata to pick the month (section 7.5).
7. **Driver payout and partner payment are tracked separately.** `payout_status` shows the driver was paid. `payment_status` shows whether the partner has paid HireD. `payment_status` makes the PRD's accepted risk visible in reports (PRD risk 8.2).
8. **The wallet is a list of transactions, not a stored balance.** The balance is the sum of credits minus debits. You can always trace the balance back to the trips. A debit cannot exceed the balance.
9. **Users are switched off, never deleted.** A `status` column on companies, admins and drivers removes access at once and keeps all history. Deactivation also revokes the user's sessions.
10. **The OTP is protected against guessing.** Six digits, secure random, and a lock after 5 wrong codes until an admin resets it.
11. **Changes by two admins at the same time are detected.** A `version` number on orders, trips and invoices stops silent overwrites (section 7.3).
12. **Emails are stored as notifications.** A failed email can be retried, and an admin can see what was sent (PRD B-07).
13. **One partner login per company in Phase 1.** The login fields are on `companies`. If one company later needs several users, they can move to a separate table.
14. **One audit table for all records.** `entity_type` + `entity_id` point to any table, so new actions can be audited without changing the schema.
15. **Offices.** HireD can run more than one office or branch. Companies and admins are linked to an office. An order's office is its company's office.
16. **Money is exact.** All amounts are `NUMERIC`, never floating point. `platform_share` is calculated as `trip_amount − driver_share`, so rounding can never lose or add a paisa.

---

## 15. Migration strategy

A migration is a numbered script that creates or changes tables. All changes to the database go through migrations.

- The schema is defined in `backend/prisma/schema.prisma`. Prisma Migrate generates the SQL migration files into `backend/migrations/` (Technical Guidelines 4.4). Seed scripts are in `backend/seed/`.
- Each migration folder is named with a timestamp and a short description, e.g. `20261003_create_core_tables`. Each one runs in its own transaction.
- A migration that has already run is **never edited**. A change is always a new migration.
- CHECK rules and partial unique indexes that Prisma cannot express in the schema file are added as hand-written SQL inside the same migration files, so they are versioned together.
- Only the `hired_owner` role runs migrations (section 10.3).
- The seed script creates the data needed to test and demo the system: one office, **two ACTIVE admins** (needed for the two-person invoice check), sample companies, drivers and orders. Seed passwords come from environment variables, not from the code.
- When a migration changes the schema, this document and the ER diagram are updated in the same pull request (Technical Guidelines 28).

---

## 16. Open points

These PRD questions are not decided yet. The design can handle each answer without large changes.


| Open question (PRD 8.3)                                | Effect on the database                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Are expenses paid back to the driver?                  | If yes, add a`type` column to `driver_wallet_transactions` (TRIP_CREDIT, EXPENSE_CREDIT, CASH_OUT) and an `expense_id` column, and change the unique rule to `(trip_id, type)`. Today's `UNIQUE (trip_id)` would refuse a second credit for the same trip, so this is a planned change, not a quick add. |
| Should drivers and admins also get SMS or push alerts? | The`notifications` table already allows ADMIN and DRIVER recipients. Add a `channel` column (EMAIL, SMS, PUSH).                                                                                                                                                                                     |
| What happens if no driver is free?                     | The trip stays UNASSIGNED with an empty driver_id. No change needed.                                                                                                                                                                                                                                 |
| Who sets the trip price before the admin confirms it?  | Today the admin sets trips.amount. A partner-proposed price would need one extra column on orders.                                                                                                                                                                                                  |
| How are "on time" and "success rate" measured? | The PRD does not define them. Section 12.2 uses a 15-minute grace period and CLOSED trips ÷ ACCEPTED orders. A different rule changes only the report queries, not the tables. |

---

## 17. Change log


| Version | Date        | Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1     | 02 Oct 2026 | First version.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 0.2     | 03 Oct 2026 | PostgreSQL types, lengths and NOT NULL for every column. Status columns on company, admins and drivers. OTP attempt limit. expenses_confirmed on trips. payment_status on trip_payrolls. Contact fields and reject_reason on orders. Database-level rules for invoice approval and wallet rows. version columns. Time columns renamed to end in At. New sections: data access and security, migration strategy, change log.                                                                                                                                                                                                                                                                                                                                                                |
| 1.0     | 03 Oct 2026 | After an independent review. trip_payrolls copies driver_id at close; driver cannot change after close. Invoices can be CANCELLED; unique index ignores cancelled rows. Month of a trip defined in Asia/Kolkata. Expenses and leaves can be deleted before close. ER diagram cardinality fixed for optional foreign keys. Tables renamed to plural (companies, audit_logs, driver_leaves). orders.admin_id split into created_by_admin_id and decided_by_admin_id, plus decided_at. orders.office_id removed. New tables: sessions, notifications. Login lockout columns. File metadata on driver_documents. More CHECK rules (approver pairs, split sum, decided fields, reject reason). payout_status explained and defaulted. New section 12: reports. Migration path moved to backend/migrations. |
| 1.1     | 07 Oct 2026 | After the pull request review. Naming: all table and column names in this document are written in snake_case (Prisma fields stay camelCase and are mapped with `@map`); file columns end in `_path` (`file_path`, `selfie_path`, `photo_path`); no acronyms in column names, so the snake_case rule always works; `driver_split` and `hired_split` on companies, and `driver_pct` and `company_pct` on trip_payrolls, renamed `driver_share_pct` and `platform_share_pct` (the PRD's names); `company_share` and `total_company_share` renamed `platform_share` and `total_platform_share`; invoice admin columns renamed `created_by_admin_id`, `verified_by_admin_id1` and `verified_by_admin_id2`; `trips.trip_status` renamed `status`. Normalization: 1NF, 2NF and 3NF check, and the repeated values kept on purpose. Security: rules for who can create or change rows, and other protection. Audit: allowed `entity_type` values, and audit of expense edits and deletes. Reports: Trip Report field table, definitions, example queries, and partners see payroll rows only through a PUBLISHED invoice. Indexes: names, kinds, partial indexes, and the foreign keys left without an index. Fixes: broken table row in section 7.1, heading level of section 4, month filter written as a range so the `closed_at` index is used. |
