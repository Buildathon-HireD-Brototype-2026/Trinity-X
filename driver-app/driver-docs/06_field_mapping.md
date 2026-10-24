# Driver App Field Mapping Audit

**Topic:** Complete field-by-field audit mapping every piece of data shown or sent by the driver app to the OpenAPI contract, Prisma schema, and PostgreSQL database.  
**References:** `backend/docs/openapi.json`, `backend/prisma/schema.prisma`, `backend/docs/database.md`

---

## 1. Complete Field Mapping Table

| Screen / Feature | Dart Model & Field | API Route & JSON Key | Prisma Field | DB Column | Type Match? | Notes |
|---|---|---|---|---|---|---|
| **Login** | `LoginState.phone` (String) | `POST /auth/driver/login` → `phone_no` | `Driver.phoneNo` (String) | `drivers.phone_no` (VARCHAR(20), NOT NULL) | ✅ Match | Cleaned to digits before sending. |
| **Login** | `LoginState.password` (String) | `POST /auth/driver/login` → `password` | `Driver.passwordHash` (String) | `drivers.password_hash` (VARCHAR(255), NOT NULL) | ✅ Match | Bcrypt hashed on backend. Never stored on client. |
| **Login / Session** | `AuthTokens.accessToken` (String) | Response → `data.access_token` | N/A (JWT, 15 min) | N/A | ✅ Match | Stored in `flutter_secure_storage`. |
| **Login / Session** | `AuthTokens.refreshToken` (String) | Response → `data.refresh_token` | `Session.refreshTokenHash` | `sessions.refresh_token_hash` (VARCHAR(64)) | ✅ Match | SHA-256 hashed on backend. |
| **Profile** | `DriverModel.id` (int) | `GET /driver/profile` → `data.driver_id` | `Driver.driverId` (Int) | `drivers.driver_id` (INTEGER PK) | ⚠️ Key Mismatch | `fromJson` parses `json['driver_id'] ?? json['id']`. |
| **Profile** | `DriverModel.name` (String) | `data.name` | `Driver.name` (String) | `drivers.name` (VARCHAR(150)) | ✅ Match | Full legal name. |
| **Profile** | `DriverModel.phone` (String) | `data.phone_no` | `Driver.phoneNo` (String) | `drivers.phone_no` (VARCHAR(20)) | ⚠️ Key Mismatch | `fromJson` maps `phone_no` → `phone`. |
| **Profile** | `DriverModel.status` (String) | `data.status` | `Driver.status` (String) | `drivers.status` (VARCHAR(20)) | ✅ Match | Enum: PENDING, ACTIVE, INACTIVE. |
| **Profile** | `DriverModel.isOnline` (bool) | `data.is_online` | `Driver.isOnline` (Boolean) | `drivers.is_online` (BOOLEAN) | ✅ Match | Default false. |
| **Profile** | `DriverModel.hasPhoto` (bool) | `data.has_photo` (boolean) | `Driver.photoURL` (String?) | `drivers.photo_url` (VARCHAR(500), NULLABLE) | ⚠️ Type Mismatch | DB has URL (private path). API returns `has_photo: bool` only. |
| **Profile** | `DriverModel.email` (String?) | Not in OpenAPI | None on Driver | None on `drivers` | ❌ Non-Existent | Dead mock field — no email column on drivers table. |
| **Profile** | `DriverModel.rating` (double) | Not in OpenAPI | None | None | ℹ️ Client-only | Hardcoded mock 4.8. Not stored in PostgreSQL Phase 1. |
| **Profile** | `DriverModel.totalTrips` (int) | Not in OpenAPI | None | Calculated via Trip count | ℹ️ Client-only | Calculated or defaulted client-side. |
| **Duty Toggle** | `isOnline` (bool) | `PATCH /driver/availability` → `is_online` | `Driver.isOnline` | `drivers.is_online` | ✅ Match | Persists online/offline status. |
| **Photo Upload** | File binary (Multipart) | `POST /driver/profile/photo` → `photo` | `Driver.photoURL` | `drivers.photo_url` | ✅ Match | Sets `photo_url`, returns `has_photo: true`. |
| **Documents** | `DriverDocumentModel.documentId` (int) | `GET /driver/documents` → `document_id` | `DriverDocument.documentId` (Int) | `driver_documents.document_id` (INTEGER PK) | ✅ Match | Identity PK. |
| **Documents** | `DriverDocumentModel.documentType` (String) | `document_type` | `DriverDocument.documentType` | `driver_documents.document_type` (VARCHAR(30)) | ✅ Match | Enum: DRIVING_LICENCE, AADHAAR, PAN, PCC. |
| **Documents** | `DriverDocumentModel.originalFileName` (String) | `original_file_name` | `DriverDocument.originalFileName` | `driver_documents.original_file_name` (VARCHAR(255)) | ✅ Match | Uploaded file name. |
| **Documents** | `DriverDocumentModel.mimeType` (String) | `mime_type` | `DriverDocument.mimeType` | `driver_documents.mime_type` (VARCHAR(100)) | ✅ Match | `image/jpeg`, `image/png`, `application/pdf`. |
| **Documents** | `DriverDocumentModel.sizeBytes` (int) | `size_bytes` | `DriverDocument.sizeBytes` | `driver_documents.size_bytes` (INTEGER) | ✅ Match | Max 5 MB. |
| **Documents** | `DriverDocumentModel.uploadedAt` (DateTime) | `uploaded_at` | `DriverDocument.uploadedAt` (DateTime) | `driver_documents.uploaded_at` (TIMESTAMPTZ) | ✅ Match | UTC ISO-8601. |
| **Document Upload** | `documentType` + `file` | `POST /driver/documents` (multipart) | `DriverDocument` row created | `driver_documents` row inserted | ✅ Match | Newest row of each type = current doc. |
| **Document Link** | `url` (String) | `GET /driver/documents/:id/link` → `url` | Generated signed JWT | None (on-the-fly) | ✅ Match | 5-minute temporary signed link. |
| **Trips List** | `TripModel.tripId` (String) | `GET /driver/trips` → `trip_id` (integer) | `Trip.tripId` (Int) | `trips.trip_id` (INTEGER PK) | ⚠️ Type Mismatch | `fromJson` uses `json['trip_id']?.toString()`. |
| **Trips List** | `TripModel.status` (String) | `status` | `Trip.tripStatus` (String) | `trips.trip_status` (VARCHAR(20)) | ⚠️ Name Mismatch | Backend maps `trip_status` → `status`. Flutter uses `status`. |
| **Trips List** | `TripModel.amount` (String?) | `amount` (decimal string) | `Trip.amount` (Decimal) | `trips.amount` (NUMERIC(12,2)) | ✅ Match | Transmitted as `"10000.00"`. |
| **Trips List** | `TripModel.driverShare` (String?) | `driver_share` (decimal string) | Calculated in backend | Calculated: `amount × driverSplit%` | ✅ Match | Backend computes from `company.driverSplit`. |
| **Trips List** | `TripModel.eta` (DateTime?) | `eta` | `Trip.eta` (DateTime?) | `trips.eta` (TIMESTAMPTZ, NULLABLE) | ✅ Match | Estimated arrival time. |
| **Trips List** | `TripModel.expensesConfirmed` (bool) | `expenses_confirmed` | `Trip.expensesConfirmed` (Boolean) | `trips.expenses_confirmed` (BOOLEAN) | ✅ Match | Expense entry complete flag. |
| **Trips List** | `TripModel.hasSelfie` (bool) | `has_selfie` | `Trip.selfieURL` (String?) | `trips.selfie_url` (VARCHAR(500), NULLABLE) | ⚠️ Type Mismatch | DB stores URL. API returns `has_selfie: bool`. |
| **Trips List** | `TripModel.version` (int) | `version` | `Trip.version` (Int) | `trips.version` (INTEGER) | ✅ Match | Optimistic concurrency control. |
| **Trips List** | `TripModel.assignedAt` (DateTime?) | `assigned_at` | `Trip.assignedAt` (DateTime?) | `trips.assigned_at` (TIMESTAMPTZ) | ✅ Match | When driver was assigned. |
| **Trips List** | `TripModel.startedAt` (DateTime?) | `started_at` | `Trip.startedAt` (DateTime?) | `trips.started_at` (TIMESTAMPTZ) | ✅ Match | ONGOING transition timestamp. |
| **Trips List** | `TripModel.closedAt` (DateTime?) | `closed_at` | `Trip.closedAt` (DateTime?) | `trips.closed_at` (TIMESTAMPTZ) | ✅ Match | Trip closed via OTP. |
| **Trip (Order)** | `TripModel.pickupSpot` (String) | `pickup_spot` | `Order.pickupSpot` | `orders.pickup_spot` (VARCHAR(300)) | ✅ Match | Joined from `orders` via `trips.order_id`. |
| **Trip (Order)** | `TripModel.dropoffSpot` (String?) | `dropoff_spot` | `Order.dropoffSpot` | `orders.dropoff_spot` (VARCHAR(300)) | ✅ Match | Joined from `orders`. |
| **Trip (Order)** | `TripModel.pickupTime` (DateTime) | `pickup_time` | `Order.pickupTime` (DateTime) | `orders.pickup_time` (TIMESTAMPTZ) | ✅ Match | Scheduled pickup UTC. |
| **Trip (Order)** | `TripModel.contactName` (String?) | `contact_name` | `Order.contactName` | `orders.contact_name` (VARCHAR(150)) | ✅ Match | Passenger/contact name. |
| **Trip (Order)** | `TripModel.contactPhone` (String?) | `contact_phone` | `Order.contactPhone` | `orders.contact_phone` (VARCHAR(20)) | ✅ Match | Passenger phone. |
| **Trip (Order)** | `TripModel.notes` (String?) | `notes` | `Order.notes` (String?) | `orders.notes` (VARCHAR(1000), NULLABLE) | ✅ Match | Vehicle/service instructions. |
| **Start Trip** | Selfie file (Multipart) | `POST /driver/trips/:id/start` → `selfie` | `Trip.selfieURL` + `Trip.startedAt` | `trips.selfie_url`, `trips.started_at` | ✅ Match | Status → ONGOING. |
| **Trip Expenses** | `TripExpenseModel.expenseId` (int) | `GET /driver/trips/:id/expenses` → `expense_id` | `Expense.expenseId` (Int) | `expenses.expense_id` (INTEGER PK) | ✅ Match | Identity PK. |
| **Trip Expenses** | `TripExpenseModel.tripId` (int) | `trip_id` | `Expense.tripId` (Int) | `expenses.trip_id` (INTEGER FK) | ✅ Match | Linked trip. |
| **Trip Expenses** | `TripExpenseModel.driverId` (int) | `driver_id` | `Expense.driverId` (Int) | `expenses.driver_id` (INTEGER FK) | ✅ Match | Authenticated driver. |
| **Trip Expenses** | `TripExpenseModel.description` (String) | `description` | `Expense.description` | `expenses.description` (VARCHAR(500)) | ✅ Match | Fuel, toll, parking note. |
| **Trip Expenses** | `TripExpenseModel.amount` (String) | `amount` (decimal string) | `Expense.amount` (Decimal) | `expenses.amount` (NUMERIC(12,2)) | ✅ Match | Decimal string format. |
| **Trip Expenses** | `TripExpenseModel.createdAt` (DateTime?) | `created_at` | `Expense.createdAt` (DateTime) | `expenses.created_at` (TIMESTAMPTZ) | ✅ Match | UTC timestamp. |
| **Confirm Expenses** | N/A | `POST /driver/trips/:id/confirm-expenses` | `Trip.expensesConfirmed = true` | `trips.expenses_confirmed` | ✅ Match | Locks expense additions. |
| **Close Trip (OTP)** | `otp` (String) | `POST /driver/trips/:id/close` → `otp` | `Trip.otp` compared | `trips.otp` (VARCHAR(6)) | ✅ Match | Verifies OTP, closes trip, credits wallet. |
| **Driver Wallet** | `DriverWalletModel.balance` (String) | `GET /driver/wallet` → `balance` (decimal string) | Sum(`credit - debit`) | `driver_wallet_transactions` aggregate | ✅ Match | e.g. `"1805.00"`. |
| **Wallet Tx** | `transactionId` (int) | `items[].transaction_id` | `DriverWalletTransaction.transactionId` | `driver_wallet_transactions.transaction_id` (PK) | ✅ Match | Identity PK. |
| **Wallet Tx** | `tripId` (int?) | `items[].trip_id` | `DriverWalletTransaction.tripId` (Int?) | `driver_wallet_transactions.trip_id` (FK, NULLABLE) | ✅ Match | Null for manual debits. |
| **Wallet Tx** | `credit` (String?) | `items[].credit` | `DriverWalletTransaction.credit` (Decimal?) | `driver_wallet_transactions.credit` (NUMERIC(12,2)) | ⚠️ Model Mismatch | Old model used `amount + transactionType`. Now uses separate `credit` / `debit`. |
| **Wallet Tx** | `debit` (String?) | `items[].debit` | `DriverWalletTransaction.debit` (Decimal?) | `driver_wallet_transactions.debit` (NUMERIC(12,2)) | ⚠️ Model Mismatch | See above. |
| **Wallet Tx** | `note` (String?) | `items[].note` | `DriverWalletTransaction.note` (String?) | `driver_wallet_transactions.note` (VARCHAR(300)) | ⚠️ Name Mismatch | Old model called it `description`. Now `note`. |
| **Planned Leaves** | `LeaveModel.leaveId` (int) | `GET /driver/leaves` → `leave_id` | `DriverLeave.leaveId` (Int) | `driver_leaves.leave_id` (INTEGER PK) | ✅ Match | Identity PK. |
| **Planned Leaves** | `LeaveModel.startDate` (String) | `start_date` | `DriverLeave.startDate` (DateTime @db.Date) | `driver_leaves.start_date` (DATE) | ✅ Match | Format YYYY-MM-DD. |
| **Planned Leaves** | `LeaveModel.endDate` (String) | `end_date` | `DriverLeave.endDate` (DateTime @db.Date) | `driver_leaves.end_date` (DATE) | ✅ Match | Format YYYY-MM-DD. |
| **Planned Leaves** | `LeaveModel.status` (String) | `status` | `DriverLeave.status` (String) | `driver_leaves.status` (VARCHAR(20)) | ➕ Extra | Added field. Enum: PENDING, APPROVED, REJECTED. |
| **Planned Leaves** | `LeaveModel.reason` (String?) | `reason` | `DriverLeave.reason` (String?) | `driver_leaves.reason` (VARCHAR(500), NULLABLE) | ➕ Extra | Added field. Optional reason text. |
| **Head Office** | `OfficeModel.officeId` (int) | `GET /driver/office` → `office_id` | `Office.officeId` (Int) | `offices.office_id` (INTEGER PK) | ✅ Match | First office by `office_id ASC`. |
| **Head Office** | `OfficeModel.officeName` (String) | `office_name` | `Office.officeName` | `offices.office_name` (VARCHAR(150)) | ✅ Match | |
| **Head Office** | `OfficeModel.officeLocation` (String?) | `office_location` | `Office.officeLocation` (String?) | `offices.office_location` (VARCHAR(300), NULLABLE) | ✅ Match | |
| **Live Location** | `lat`, `lng` (double) | `POST /driver/location` → `lat`, `lng` | `DriverLocation.lat`, `.lng` | `driver_locations.lat`, `.lng` | ➕ Extra Table | Live position coords. |
| **Live Location** | `speed`, `heading`, `accuracy` | `POST /driver/location` | `DriverLocation` fields | `driver_locations` columns | ➕ Extra Table | Telemetry fields. |
| **Batch Location** | `pings: [...]` | `POST /driver/locations/batch` | `DriverLocationHistory` rows | `driver_location_history` rows | ➕ Extra Table | Offline buffered breadcrumbs. |

---

## 2. Mismatches & Resolutions

### 1. `DriverModel`: `id` vs `driver_id`
- **Issue:** Dart field `id` vs API/DB column `driver_id`.
- **Resolution:** `fromJson` parses `json['driver_id'] ?? json['id']`. UI widgets keep using `id`.

### 2. `DriverModel`: `photoPath` vs `has_photo`
- **Issue:** DB has `photo_url` (private path). API returns `has_photo: boolean` only.
- **Resolution:** `DriverModel` uses `final bool hasPhoto`. When `true`, app shows avatar or fetches signed link.

### 3. `TripModel`: `status` vs `trip_status`
- **Issue:** DB column is `trip_status`, API exposes it as `status`.
- **Resolution:** Backend service maps `trip_status` → `status`. Flutter `TripModel.status` already correct.

### 4. `TripModel`: ID type (int vs String)
- **Issue:** DB/API: `trip_id` is INTEGER. Dart had `String tripId`.
- **Resolution:** `fromJson` uses `json['trip_id']?.toString()` for seamless int-or-string handling.

### 5. Mock Coordinates (`pickupLat`, `dropoffLat`)
- **Issue:** `orders` table has only text address fields — no lat/lng columns.
- **Resolution:** App uses `pickup_spot` / `dropoff_spot` text for map navigation via `MapsConfig.openSearch()`.

### 6. `WalletTransactionModel`: Unified Amount vs Separate Credit/Debit
- **Issue:** Old Dart model used `amount + transactionType + description`. DB/API uses separate `credit`, `debit`, `note`.
- **Resolution:** Updated `fromJson`:
  ```dart
  final isCredit = json['credit'] != null;
  final amount = isCredit ? json['credit'] : (json['debit'] ?? '0.00');
  final description = json['note'] ?? (isCredit ? 'Trip Payout' : 'Cash Withdrawal');
  ```

---

## 3. Columns Intentionally Not Used in Driver App

These DB columns exist but are internal to the backend, admin, or B2B systems:

1. `drivers.password_hash` — Bcrypt hash; never sent to client.
2. `drivers.failed_login_attempts` & `drivers.locked_until` — Backend rate limiting counters.
3. `drivers.current_location` — Legacy column; superseded by `driver_locations` table.
4. `trips.otp` & `trips.otp_attempts` — OTP visible only to partner in B2B portal; driver gets it verbally from passenger.
5. `trips.selfie_url` — Private storage path; API returns `has_selfie: boolean`.
6. `orders.company_id` — FK linking order to partner company.
7. `orders.source`, `reject_reason`, `created_by_admin_id`, `decided_*` — Admin order lifecycle fields.
8. `trip_payrolls.*` columns — Financial split ledger; driver only sees net wallet payout.
9. `companies`, `admins`, `invoices`, `notifications` — Admin Portal / B2B Portal tables. Not accessed by driver app.
