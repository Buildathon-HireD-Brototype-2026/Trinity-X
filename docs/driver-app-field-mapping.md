# HireD Driver App Field Mapping Audit (Step 5 - Part 1)

This document provides a field-by-field audit mapping every piece of data shown or sent by the HireD driver mobile application to the OpenAPI 3.0 contract (`docs/openapi.json`), the Prisma schema (`backend/prisma/schema.prisma`), and the PostgreSQL schema specification (`docs/database.md`).

---

## 1. Complete Field Mapping Table

| Screen / Feature | Dart Model & Field | API Route & JSON Key (`docs/openapi.json`) | Prisma Field (`schema.prisma`) | DB Table.Column (`docs/database.md`) | Type & Nullable Match? | Problem / Mismatch Analysis |
|---|---|---|---|---|---|---|
| **Login** | `LoginState.phone` (String) | `POST /auth/driver/login`<br>`phone_no` (string) | `Driver.phoneNo` (String) | `drivers.phone_no` (VARCHAR(20), NOT NULL) | Match | Cleaned to digits before sending. |
| **Login** | `LoginState.password` (String) | `POST /auth/driver/login`<br>`password` (string) | `Driver.passwordHash` (String) | `drivers.password_hash` (VARCHAR(255), NOT NULL) | Match | Bcrypt hashed on backend. Never stored on client. |
| **Login / Session** | `AuthTokens.accessToken` (String) | `POST /auth/driver/login`<br>`data.access_token` (string) | N/A (JWT in memory) | N/A (Stateless JWT, 15 min expiry) | Match | Stored securely in `flutter_secure_storage`. |
| **Login / Session** | `AuthTokens.refreshToken` (String) | `POST /auth/driver/login`<br>`data.refresh_token` (string) | `Session.refreshTokenHash` (String) | `sessions.refresh_token_hash` (VARCHAR(64), NOT NULL) | Match | SHA-256 hashed on backend. Stored in `flutter_secure_storage`. |
| **Profile** | `DriverModel.id` (int) | `GET /driver/profile`<br>`data.driver_id` (integer) | `Driver.driverId` (Int) | `drivers.driver_id` (INTEGER PK, NOT NULL) | Mismatch | **Key Name Mismatch**: Dart model expects `id` or `driver_id`. `DriverModel.fromJson` must parse `json['driver_id'] ?? json['id']`. |
| **Profile** | `DriverModel.name` (String) | `GET /driver/profile`<br>`data.name` (string) | `Driver.name` (String) | `drivers.name` (VARCHAR(150), NOT NULL) | Match | Full driver legal name. |
| **Profile** | `DriverModel.phone` (String) | `GET /driver/profile`<br>`data.phone_no` (string) | `Driver.phoneNo` (String) | `drivers.phone_no` (VARCHAR(20), NOT NULL) | Mismatch | **Key Name Mismatch**: Dart model uses `phone`, API returns `phone_no`. Handled in `fromJson`. |
| **Profile** | `DriverModel.status` (String) | `GET /driver/profile`<br>`data.status` (string) | `Driver.status` (String) | `drivers.status` (VARCHAR(20), NOT NULL) | Match | Enum: `PENDING`, `ACTIVE`, `INACTIVE`. |
| **Profile** | `DriverModel.isOnline` (bool) | `GET /driver/profile`<br>`data.is_online` (boolean) | `Driver.isOnline` (Boolean) | `drivers.is_online` (BOOLEAN, NOT NULL) | Match | Default `false`. |
| **Profile** | `DriverModel.photoPath` (String?) | `GET /driver/profile`<br>`data.has_photo` (boolean) | `Driver.photoURL` (String?) | `drivers.photo_url` (VARCHAR(500), NULLABLE) | Mismatch | **Type & Concept Mismatch**: DB has `photo_url` (private storage path). OpenAPI contract explicitly hides storage paths and returns `has_photo: boolean`. Dart model had `photoPath`. Must change to `hasPhoto: bool`. |
| **Profile** | `DriverModel.email` (String?) | Not returned in OpenAPI `Driver` | None on Driver | None on `drivers` | Mismatch | **Schema Non-Existent**: `drivers` table in `database.md` has no `email` column (only `phone_no`). Present in Dart model as dead mock field. |
| **Profile** | `DriverModel.rating` (double) | Not in OpenAPI `Driver` | None on Driver | None on `drivers` | Mismatch | **Client-only Display Metric**: Hardcoded mock rating in app (4.8). Not stored in PostgreSQL Phase 1. |
| **Profile** | `DriverModel.totalTrips` (int) | Not in OpenAPI `Driver` | None on Driver | Calculated via `Trip` count | Mismatch | **Client-only Display Metric**: Calculated on-the-fly or defaulted. |
| **Duty Toggle** | `isOnline` (bool) | `PATCH /driver/availability`<br>`is_online` (boolean) | `Driver.isOnline` (Boolean) | `drivers.is_online` (BOOLEAN, NOT NULL) | Match | Online/offline availability switch. |
| **Photo Upload** | File binary (Multipart) | `POST /driver/profile/photo`<br>`photo` (binary) | `Driver.photoURL` (String) | `drivers.photo_url` (VARCHAR(500), NULLABLE) | Match | Uploads image via storage adapter, sets `photo_url`, returns `Driver` with `has_photo: true`. |
| **Documents** | `DriverDocumentModel.documentId` (int) | `GET /driver/documents`<br>`document_id` (integer) | `DriverDocument.documentId` (Int) | `driver_documents.document_id` (INTEGER PK, NOT NULL) | Match | Identity PK. |
| **Documents** | `DriverDocumentModel.documentType` (String) | `GET /driver/documents`<br>`document_type` (string) | `DriverDocument.documentType` (String) | `driver_documents.document_type` (VARCHAR(30), NOT NULL) | Match | Enum: `DRIVING_LICENCE`, `AADHAAR`, `PAN`, `PCC`. |
| **Documents** | `DriverDocumentModel.originalFileName` (String) | `GET /driver/documents`<br>`original_file_name` (string) | `DriverDocument.originalFileName` (String) | `driver_documents.original_file_name` (VARCHAR(255), NOT NULL) | Match | Name uploaded by driver. |
| **Documents** | `DriverDocumentModel.mimeType` (String) | `GET /driver/documents`<br>`mime_type` (string) | `DriverDocument.mimeType` (String) | `driver_documents.mime_type` (VARCHAR(100), NOT NULL) | Match | `image/jpeg`, `image/png`, `application/pdf`. |
| **Documents** | `DriverDocumentModel.sizeBytes` (int) | `GET /driver/documents`<br>`size_bytes` (integer) | `DriverDocument.sizeBytes` (Int) | `driver_documents.size_bytes` (INTEGER, NOT NULL) | Match | Max 5 MB. |
| **Documents** | `DriverDocumentModel.uploadedAt` (DateTime) | `GET /driver/documents`<br>`uploaded_at` (string date-time) | `DriverDocument.uploadedAt` (DateTime) | `driver_documents.uploaded_at` (TIMESTAMPTZ, NOT NULL) | Match | Converted from UTC ISO-8601 to local time. |
| **Document Upload** | `documentType` + `file` | `POST /driver/documents`<br>`multipart/form-data` | `DriverDocument` row created | `driver_documents` row inserted | Match | Uploads new row. Newest row of each type represents current doc. |
| **Document Link** | `url` (String) | `GET /driver/documents/:id/link`<br>`url` (string uri) | S3 / Cloudinary / Local signed URL | None (Generated on the fly) | Match | 5-minute temporary signed link. |
| **Trips List** | `TripModel.tripId` (String / int) | `GET /driver/trips`<br>`trip_id` (integer) | `Trip.tripId` (Int) | `trips.trip_id` (INTEGER PK, NOT NULL) | Mismatch | **Type Discrepancy**: DB & OpenAPI use `integer`, Dart model used `String tripId`. Dart model must accept both int and string gracefully. |
| **Trips List** | `TripModel.status` (String) | `GET /driver/trips`<br>`status` (string) | `Trip.tripStatus` (String) | `trips.trip_status` (VARCHAR(20), NOT NULL) | Mismatch | **Column Name Mismatch**: DB column is `trip_status`, but OpenAPI and API JSON key is `status`. Values: `UNASSIGNED`, `ASSIGNED`, `ONGOING`, `CLOSED`. |
| **Trips List** | `TripModel.amount` (String?) | `GET /driver/trips`<br>`amount` (string decimal) | `Trip.amount` (Decimal) | `trips.amount` (NUMERIC(12,2), NOT NULL) | Match | Stored as NUMERIC(12,2), transmitted as decimal string `"10000.00"`. |
| **Trips List** | `TripModel.eta` (DateTime?) | `GET /driver/trips`<br>`eta` (string date-time) | `Trip.eta` (DateTime?) | `trips.eta` (TIMESTAMPTZ, NULLABLE) | Match | Estimated arrival time. |
| **Trips List** | `TripModel.expensesConfirmed` (bool) | `GET /driver/trips`<br>`expenses_confirmed` (boolean) | `Trip.expensesConfirmed` (Boolean) | `trips.expenses_confirmed` (BOOLEAN, NOT NULL) | Match | Indicates driver completed expense entry. |
| **Trips List** | `TripModel.hasSelfie` (bool) | `GET /driver/trips`<br>`has_selfie` (boolean) | `Trip.selfieURL` (String?) | `trips.selfie_url` (VARCHAR(500), NULLABLE) | Mismatch | **Field & Type Mismatch**: DB stores `selfie_url` (private storage path). OpenAPI contract and backend return `has_selfie: boolean`. Dart model matches openapi. |
| **Trips List** | `TripModel.version` (int) | `GET /driver/trips`<br>`version` (integer) | `Trip.version` (Int) | `trips.version` (INTEGER, NOT NULL) | Match | Optimistic concurrency control version. |
| **Trips List** | `TripModel.assignedAt` (DateTime?) | `GET /driver/trips`<br>`assigned_at` (string date-time) | `Trip.assignedAt` (DateTime?) | `trips.assigned_at` (TIMESTAMPTZ, NULLABLE) | Match | Timestamp driver was assigned. |
| **Trips List** | `TripModel.startedAt` (DateTime?) | `GET /driver/trips`<br>`started_at` (string date-time) | `Trip.startedAt` (DateTime?) | `trips.started_at` (TIMESTAMPTZ, NULLABLE) | Match | Timestamp trip transitioned to `ONGOING`. |
| **Trips List** | `TripModel.closedAt` (DateTime?) | `GET /driver/trips`<br>`closed_at` (string date-time) | `Trip.closedAt` (DateTime?) | `trips.closed_at` (TIMESTAMPTZ, NULLABLE) | Match | Timestamp trip closed via OTP. |
| **Trip (Order Info)**| `TripModel.pickupSpot` (String) | `GET /driver/trips/:id`<br>`pickup_spot` (string) | `Order.pickupSpot` (String) | `orders.pickup_spot` (VARCHAR(300), NOT NULL) | Match | Joined from `orders` via `trips.order_id`. |
| **Trip (Order Info)**| `TripModel.dropoffSpot` (String?) | `GET /driver/trips/:id`<br>`dropoff_spot` (string) | `Order.dropoffSpot` (String) | `orders.dropoff_spot` (VARCHAR(300), NOT NULL) | Match | Joined from `orders`. |
| **Trip (Order Info)**| `TripModel.pickupTime` (DateTime) | `GET /driver/trips/:id`<br>`pickup_time` (string date-time) | `Order.pickupTime` (DateTime) | `orders.pickup_time` (TIMESTAMPTZ, NOT NULL) | Match | Scheduled pickup date/time in UTC. |
| **Trip (Order Info)**| `TripModel.contactName` (String?) | `GET /driver/trips/:id`<br>`contact_name` (string) | `Order.contactName` (String) | `orders.contact_name` (VARCHAR(150), NOT NULL) | Match | Passenger/contact person name. |
| **Trip (Order Info)**| `TripModel.contactPhone` (String?) | `GET /driver/trips/:id`<br>`contact_phone` (string) | `Order.contactPhone` (String) | `orders.contact_phone` (VARCHAR(20), NOT NULL) | Match | Passenger/contact phone. |
| **Trip (Order Info)**| `TripModel.notes` (String?) | `GET /driver/trips/:id`<br>`notes` (string, nullable) | `Order.notes` (String?) | `orders.notes` (VARCHAR(1000), NULLABLE) | Match | Vehicle/service instructions. |
| **Start Trip** | Selfie file | `POST /driver/trips/:id/start`<br>`selfie` (binary) | `Trip.selfieURL` + `Trip.startedAt` | `trips.selfie_url`, `trips.started_at` | Match | Starts trip, sets status to `ONGOING`, uploads selfie. |
| **Trip Expenses** | `TripExpenseModel.expenseId` (int) | `GET /driver/trips/:id/expenses`<br>`expense_id` (integer) | `Expense.expenseId` (Int) | `expenses.expense_id` (INTEGER PK, NOT NULL) | Match | Identity PK. |
| **Trip Expenses** | `TripExpenseModel.tripId` (int) | `GET /driver/trips/:id/expenses`<br>`trip_id` (integer) | `Expense.tripId` (Int) | `expenses.trip_id` (INTEGER FK, NOT NULL) | Match | Linked trip ID. |
| **Trip Expenses** | `TripExpenseModel.driverId` (int) | `GET /driver/trips/:id/expenses`<br>`driver_id` (integer) | `Expense.driverId` (Int) | `expenses.driver_id` (INTEGER FK, NOT NULL) | Match | Authenticated driver ID. |
| **Trip Expenses** | `TripExpenseModel.description` (String) | `GET /driver/trips/:id/expenses`<br>`description` (string) | `Expense.description` (String) | `expenses.description` (VARCHAR(500), NOT NULL) | Match | Fuel, toll, parking note. |
| **Trip Expenses** | `TripExpenseModel.amount` (String) | `GET /driver/trips/:id/expenses`<br>`amount` (string decimal) | `Expense.amount` (Decimal) | `expenses.amount` (NUMERIC(12,2), NOT NULL) | Match | Formatted decimal string. |
| **Trip Expenses** | `TripExpenseModel.createdAt` (DateTime?) | `GET /driver/trips/:id/expenses`<br>`created_at` (string date-time) | `Expense.createdAt` (DateTime) | `expenses.created_at` (TIMESTAMPTZ, NOT NULL) | Match | UTC timestamp. |
| **Confirm Expenses**| N/A | `POST /driver/trips/:id/confirm-expenses` | `Trip.expensesConfirmed = true` | `trips.expenses_confirmed` | Match | Locks expense additions, marks confirmed. |
| **Close Trip (OTP)**| `otp` (String) | `POST /driver/trips/:id/close`<br>`otp` (string 6-digit) | `Trip.otp` compared | `trips.otp` (VARCHAR(6), NOT NULL) | Match | Verifies OTP, transitions trip to `CLOSED`, triggers payroll & wallet transaction. |
| **Driver Wallet** | `DriverWalletModel.balance` (String) | `GET /driver/wallet`<br>`balance` (string decimal) | Sum(`credit` - `debit`) | `driver_wallet_transactions` aggregate | Match | Decimal string with 2 decimals (e.g. `"1805.00"`). |
| **Wallet Tx** | `transactionId` (int) | `GET /driver/wallet`<br>`items[].transaction_id` (integer) | `DriverWalletTransaction.transactionId` (Int) | `driver_wallet_transactions.transaction_id` (PK) | Match | Identity PK. |
| **Wallet Tx** | `tripId` (int?) | `GET /driver/wallet`<br>`items[].trip_id` (integer, nullable) | `DriverWalletTransaction.tripId` (Int?) | `driver_wallet_transactions.trip_id` (FK, NULLABLE) | Match | Populated for trip credits, null for debits. |
| **Wallet Tx** | `credit` (String?) | `GET /driver/wallet`<br>`items[].credit` (string decimal) | `DriverWalletTransaction.credit` (Decimal?) | `driver_wallet_transactions.credit` (NUMERIC(12,2)) | Mismatch | **Model Structure Mismatch**: OpenAPI defines separate `credit` and `debit` fields. Dart model used unified `amount` + `transactionType`. Handled in parsing. |
| **Wallet Tx** | `debit` (String?) | `GET /driver/wallet`<br>`items[].debit` (string decimal) | `DriverWalletTransaction.debit` (Decimal?) | `driver_wallet_transactions.debit` (NUMERIC(12,2)) | Mismatch | Same as above. |
| **Wallet Tx** | `note` (String?) | `GET /driver/wallet`<br>`items[].note` (string, nullable) | `DriverWalletTransaction.note` (String?) | `driver_wallet_transactions.note` (VARCHAR(300)) | Mismatch | Named `note` in DB and OpenAPI, Dart model had `description`. |
| **Planned Leaves**| `LeaveModel.leaveId` (int) | `GET /driver/leaves`<br>`leave_id` (integer) | `DriverLeave.leaveId` (Int) | `driver_leaves.leave_id` (INTEGER PK, NOT NULL) | Match | Identity PK. |
| **Planned Leaves**| `LeaveModel.startDate` (String) | `GET /driver/leaves`<br>`start_date` (string date) | `DriverLeave.startDate` (DateTime @db.Date) | `driver_leaves.start_date` (DATE, NOT NULL) | Match | Format `YYYY-MM-DD`. |
| **Planned Leaves**| `LeaveModel.endDate` (String) | `GET /driver/leaves`<br>`end_date` (string date) | `DriverLeave.endDate` (DateTime @db.Date) | `driver_leaves.end_date` (DATE, NOT NULL) | Match | Format `YYYY-MM-DD`. |
| **Planned Leaves**| `LeaveModel.status` (String) | `GET /driver/leaves`<br>`status` (string enum) | `DriverLeave.status` (String) | `driver_leaves.status` (VARCHAR(20), NOT NULL) | Extra | **Official Extra**: Added to `driver_leaves`. Enum: `PENDING`, `APPROVED`, `REJECTED`. |
| **Planned Leaves**| `LeaveModel.reason` (String?) | `GET /driver/leaves`<br>`reason` (string, nullable) | `DriverLeave.reason` (String?) | `driver_leaves.reason` (VARCHAR(500), NULLABLE) | Extra | **Official Extra**: Added to `driver_leaves`. Optional reason text. |
| **Head Office** | `OfficeModel.officeId` (int) | `GET /driver/office`<br>`office_id` (integer) | `Office.officeId` (Int) | `offices.office_id` (INTEGER PK, NOT NULL) | Match | Head office queried via `ORDER BY office_id ASC LIMIT 1`. |
| **Head Office** | `OfficeModel.officeName` (String) | `GET /driver/office`<br>`office_name` (string) | `Office.officeName` (String) | `offices.office_name` (VARCHAR(150), NOT NULL) | Match | Name of head office. |
| **Head Office** | `OfficeModel.officeLocation` (String?) | `GET /driver/office`<br>`office_location` (string) | `Office.officeLocation` (String?) | `offices.office_location` (VARCHAR(300), NULLABLE) | Match | Location / address of head office. |
| **Live Location**| `lat`, `lng` (double) | `POST /driver/location`<br>`lat`, `lng` (number) | `DriverLocation.lat`, `DriverLocation.lng` | `driver_locations.lat`, `driver_locations.lng` | Extra | **Official Extra Table**: Live position ping coordinates. |
| **Live Location**| `speed`, `heading`, `accuracy` | `POST /driver/location` | `DriverLocation` fields | `driver_locations` columns | Extra | **Official Extra Table**: Telemetry fields. |
| **Batch Location**| `pings: [...]` | `POST /driver/locations/batch` | `DriverLocationHistory` rows | `driver_location_history` rows | Extra | **Official Extra Table**: Offline buffered breadcrumb queue. |

---

## 2. Identified Mismatches and Action Plan

### 1. `DriverModel`: `id` vs `driver_id` and Client-Only Fields
* **Issue**: In `driver_model.dart`, field is named `id`, whereas OpenAPI JSON key and database column are `driver_id`. Additionally, `rating` (4.8), `totalTrips`, and `email` are not present on the `drivers` table in `database.md`.
* **Resolution**: Keep `id` in Dart for backward-compatibility with UI widgets, but parse from `json['driver_id'] ?? json['id']`. Keep `rating` and `totalTrips` as client fallback defaults, while removing any assumption that the backend returns `email`.

### 2. `DriverModel`: `photoPath` vs `has_photo` vs `photo_url`
* **Issue**: `database.md` defines `drivers.photo_url` (VARCHAR(500)), but per OpenAPI and security rules, raw file storage paths are NEVER returned over the API. The API returns `has_photo: boolean`.
* **Resolution**: Update `DriverModel` to include `final bool hasPhoto`. When `hasPhoto == true`, the app displays the driver's verified avatar or fetches a signed view link if requested.

### 3. `TripModel`: `status` vs `trip_status`
* **Issue**: In PostgreSQL `trips` table, the column is named `trip_status`, but the OpenAPI contract explicitly exposes it as `status` with enum `UNASSIGNED`, `ASSIGNED`, `ONGOING`, `CLOSED`.
* **Resolution**: The backend service already maps `trip_status` → `status`. `TripModel` in Flutter already uses `status` and enum helpers (`isAssigned`, `isOngoing`, `isClosed`).

### 4. `TripModel`: ID Type (int vs string)
* **Issue**: PostgreSQL `trips.trip_id` is an `INTEGER`, and OpenAPI schema defines `trip_id` as `integer`. However, `TripModel` in Flutter historically declared `final String tripId`.
* **Resolution**: `TripModel.fromJson` must parse `json['trip_id']?.toString() ?? ''` so it seamlessly accommodates both integer from the API and string representation in the UI.

### 5. `TripModel`: Mock Coordinates (`pickupLat`, `dropoffLat`, etc.)
* **Issue**: The `orders` table in `database.md` only has text address spots (`pickup_spot` and `dropoff_spot`), not latitude/longitude columns.
* **Resolution**: For navigation, the app passes `pickup_spot` / `dropoff_spot` to `MapsConfig.openSearch(query)` or uses fallback geocoding. If coordinates are provided in mock/extended responses, they are consumed; otherwise, text address navigation is invoked.

### 6. `WalletTransactionModel`: Separate Credit/Debit vs Unified Amount
* **Issue**: `database.md` and OpenAPI define separate nullable columns: `credit` (NUMERIC(12,2)) and `debit` (NUMERIC(12,2)) and `note` (VARCHAR(300)). `WalletTransactionModel` in Flutter had `amount`, `transactionType`, and `description`.
* **Resolution**: Update `WalletTransactionModel` to parse `credit`, `debit`, and `note` directly from the API response:
  ```dart
  final isCredit = json['credit'] != null;
  final amount = isCredit ? json['credit'] : (json['debit'] ?? '0.00');
  final description = json['note'] ?? (isCredit ? 'Trip Payout' : 'Cash Withdrawal');
  ```

---

## 3. Informational: Unused Database Columns in Driver App

These columns exist in `docs/database.md` but are intentionally **not used** by the driver app because they belong to internal backend security, admin workflows, or B2B billing:

1. **`drivers.password_hash`**: Bcrypt hash; never returned to or handled directly by the mobile app.
2. **`drivers.failed_login_attempts` & `drivers.locked_until`**: Internal rate-limiting counters evaluated by the backend during authentication.
3. **`drivers.current_location`**: Legacy single-string location column from PRD; superseded by the dedicated `driver_locations` table.
4. **`trips.otp` & `trips.otp_attempts`**: Security requirement: the trip-close OTP is visible **only** to the partner in the B2B portal. The driver receives the OTP verbally from the passenger at dropoff and submits it via `POST /driver/trips/:id/close`.
5. **`trips.selfie_url`**: Internal private storage path; API returns `has_selfie: boolean`.
6. **`orders.company_id`**: Foreign key linking order to partner company.
7. **`orders.source`**, **`orders.reject_reason`**, **`orders.created_by_admin_id`**, **`orders.decided_by_admin_id`**, **`orders.decided_at`**: Admin order approval lifecycle fields.
8. **`trip_payrolls.driver_pct`**, **`company_pct`**, **`trip_amount`**, **`company_share`**, **`payout_status`**, **`payment_status`**, **`invoice_id`**: Financial split and billing ledger rows; the driver app only reads the net wallet payout credit.
9. **`companies`**, **`admins`**, **`invoices`**, **`notifications`**: Entire tables dedicated to Admin Portal and B2B Portal operations.
