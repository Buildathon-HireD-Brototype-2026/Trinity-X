# Page 9: Multi-Domain Enterprise Reporting & Fleet Analytics (`A-08`, `A-11`)

**Screens:** Page 9 – Dedicated Multi-Domain Report Center (Trip Reports [Live/Daily/Monthly], Billing Issues, Driver Delays, Client Order Volume & SLA, Driver Payouts, Order Lifecycle, and Driver Staff Work Reports)  
**PRD Requirement IDs:** `A-08` (Fleet & Trip Reporting, Analytics Dashboard, Priority: P0), `A-11` (Contract Revenue Split Reconciliation, Priority: P0), PRD Section 4.1 (Trip Financial Lifecycle), Technical Guidelines Section 9, 11, 12  
**Current Status:** Completed, Tested & Running with Multi-Report Service Layer & Fallback Store  

---

## 1. PRD Requirements & Objectives

* **Multi-Domain Report Generation:**
  Admin Portal provides dedicated, individually generated reports selectable via interactive category navigation:
  1. **Trip Report (Live / Daily / Monthly):** Detailed trip audit ledger, financial revenue splits (Gross = Driver Payout + Commission), route locations, and live/daily/monthly frequency toggling.
  2. **Billing Issues Report:** Disputed fares, toll fee mismatches, cancellation fee penalty waivers, waiting charge disputes, and resolution status tracking.
  3. **Driver Delay Report:** Pickup punctuality metrics, scheduled vs. actual arrival times, delay durations (minutes), root cause categorization (ORR traffic, GPS loss, rain), and on-time arrival SLA percentage.
  4. **Client Order Volume & SLA Report:** Corporate account demand tracking, total bookings, completed vs. cancelled trips, SLA fulfillment percentage, gross B2B spend, and corporate account health ratings.
  5. **Driver Payout Report:** Financial settlement ledger per driver, completed trip counts, gross fares, platform commission retained (20%), net driver disbursements, settlement status (`PROCESSED`, `PENDING_CLEARANCE`), and bank/NEFT UTR reference.
  6. **Order Report:** Ingested corporate and consumer booking pool, booking types (`IMMEDIATE_DISPATCH` vs. `SCHEDULED_ADVANCE`), vehicle class demands, dispatch turnaround duration, and fulfillment status.
  7. **Driver (Staff) Work Report:** On-duty shift logs (Day, Evening, Flexible), total duty hours logged, cumulative distance traveled (KM), trip acceptance rates, driver cancellation rates, passenger star ratings, and performance tiers.

* **Export Capabilities & CWE-1236 Security:**
  * Independent CSV export for each active report type with specialized schema headers and file naming (e.g. `hired-billing-issues-2026-10-22.csv`, `hired-driver-delays-2026-10-22.csv`).
  * Automated CSV Formula Injection defense (`CWE-1236`) sanitizing cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r`.

---

## 2. UI Design Specification (What IS in the App Now)

The Reports Center module is implemented in `Trinity-X/admin-portal/src/features/reports/` and wired into `AdminShell.jsx`:

### A. Report Category Navigation Strip & Sub-Frequency Pills
* 7 dedicated interactive tabs with distinctive icons:
  * 🚗 **Trip Report**
  * ⚠️ **Billing Issues**
  * ⏱️ **Driver Delay Report**
  * 🏢 **Client Order Volume & SLA**
  * 💳 **Driver Payout Report**
  * 📦 **Order Report**
  * 👤 **Driver (Staff) Work Report**
* **Trip Report Frequency Sub-Pill:** When Trip Report is active, provides instant filtering for `All Trips`, `🔴 Live Trips` (In-Transit & Scheduled), `📅 Daily`, and `📊 Monthly`.

### B. Executive KPI Metrics Strip (Dynamic per Report)
* 4 top metric cards adapt instantly according to the chosen report category:
  * **Trip Report:** Total Trips, Gross Revenue (₹), Driver Payouts (₹), Platform Margin (₹), and Completion Rate (%).
  * **Billing Issues:** Reported Billing Exceptions, Disputed Capital (₹), Under Active Review, Settlement Resolution Rate %.
  * **Driver Delays:** Total Tracked Pickups, Delayed Arrivals (>10m), Fleet Punctuality Rate %, Average Pickup Delay (mins).
  * **Client Volume:** Active Corporate Clients, Total Corporate Bookings, Overall Fulfillment SLA %, Total Corporate Spend (₹).
  * **Driver Payouts:** Net Driver Disbursements (₹), Platform Margin (20%), Gross Trips Value (₹), Active Earning Drivers.
  * **Order Report:** Total Received Orders, Fulfilled Orders, Immediate Dispatches, Avg Dispatch Speed (mins).
  * **Driver Work:** Active Working Drivers, Total Duty Hours Logged, Fleet Acceptance Rate %, Fleet Customer Rating (★).

### C. Multi-Dimension Filter Toolbar & Universal Search
* **Date Presets:** `Today`, `Last 7 Days`, `Last 30 Days`, `This Month`, and `Custom Range` (with start $\le$ end boundary validation).
* **Corporate Client Dropdown:** Filter by specific enterprise account (e.g. Acme Technologies, Nexus Logistics, Starlight Financial) with universal matching across all report domains.
* **Vehicle Class Selector:** Filter by vehicle category (`All Vehicles`, `Sedan`, `SUV`, `Hatchback`).
* **Universal Search Input:** Real-time multi-field matching against client names, driver names, trip references, or dispute codes.
* **"Export CSV" Button:** Dynamically labelled with the active report name (e.g. `"Export Billing Issues CSV"`), with double-click lock and RBAC gating.

### D. Tailored Audit Ledgers & Table Columns
* High-contrast audit ledger table with custom schemas for each report category:
  * **Billing Issues:** Dispute ID, Trip Ref, Client, Disputed Amount, Category, Status pill, and Resolution Action.
  * **Driver Delays:** Log ID, Driver Name, Vehicle, Scheduled Time, Actual Arrival, Delay Minutes, and Root Cause.
  * **Client Volume:** Client Name, Contract Tier, Total Bookings, Completed, Cancelled, SLA Rate %, and Total Spend.
  * **Driver Payouts:** Driver Name, Vehicle Class, Completed Trips, Gross Revenue, Platform Fee, Net Payout, Status, and NEFT Ref.
  * **Order Report:** Order ID, Company, Passenger, Booking Type, Vehicle Class, Dispatch Speed, and Status.
  * **Driver Work:** Driver Name, Shift Type, Total Hours, Distance (KM), Trips, Acceptance %, Cancel %, and Star Rating.
* Role-aware PII phone number masking (`+91 98451 •••••`) on passenger and driver details for view-only sessions.

---

## 3. Current State: UI with Local Simulation & Service Architecture

> [!NOTE]
> The reports center operates in **Full Client Architecture with Live Backend Stubs**:
> - Asynchronous service layer (`reportService.js`) attempting `fetch('/api/v1/admin/reports')` with automatic fallback to an in-memory client mock store aligned with Prisma models `Trip`, `Order`, `Company`, `Driver`, and financial dispute ledgers.
> - Authentication header attachment via `getAuthHeaders()`, injecting validated `Authorization: Bearer <token>` and anti-CSRF `X-Requested-With: XMLHttpRequest` headers with session expiration checks.
> - Universal company filter matcher (`matchesCompany`) normalizing `companyId` and `companyName` across heterogeneous report datasets.
> - Defensive math guards (`Number(val || 0).toFixed(2)`) preventing rendering crashes on missing or zero-value metrics.
> - Universal CSV generator with `CWE-1236` formula injection defense across all 7 schemas.

---

## 4. Testing & Verification

A comprehensive 45-case test suite was executed and verified across 5 categories in `TestCases/tc_09_trip_reports.md`:

| Category | Total Cases | Verification Mechanism | Status |
| :--- | :---: | : | :---: |
| **2.1 Happy Path (HP)** | 19 | Workspace loading, KPI strip, date presets, corporate filtering, vehicle filter, status filter, multi-attribute search, CSV export, charts, all 7 individual reports, and sub-frequency scoping | `[✓ Passed]` |
| **2.2 Validation & Boundary (VAL)** | 8 | Custom date range bounds, invalid date range error, zero-state feedback on empty match, CSV formula injection defense (CWE-1236), floating-point rounding, query trimming, filter reset, empty export handling | `[✓ Passed]` |
| **2.3 PRD Business Rules (PRD)** | 6 | GMV & revenue split conservation ($Gross = Payout + Fee$), contract split inheritance (PRD A-11), cancelled trip exclusion, completion rate computation, real-time sync with dispatch, platform fee calculation | `[✓ Passed]` |
| **2.4 Usability & UX (UX)** | 7 | Double-click protection on CSV export, responsive grid layout, interactive financial tooltips, semantic status badges, keyboard navigation, table sorting, print-friendly styling | `[✓ Passed]` |
| **2.5 Security & Safeguards (SEC)** | 5 | Client-side fail-closed RBAC (`canExportReports`), PII phone masking for view-only roles, anti-CSRF & Bearer auth headers, Content Security Policy enforcement, sanitized timestamped filenames | `[✓ Passed]` |
| **TOTAL** | **45** | **All 45 test cases verified with zero failures or regressions** | `[✓ Passed]` |

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Blank Screen on Switching Report Categories (TypeError on undefined `.toFixed(2)`)
* **Symptom:** Clicking on "Billing Issues", "Driver Payout Report", or "Order Report" resulted in a blank white screen with a console exception: `TypeError: Cannot read properties of undefined (reading 'toFixed')`.
* **Root Cause:** Top KPI cards unconditionally invoked `.toFixed(2)` on metric values that had different property names or were nullish in sub-reports (e.g. `metrics.disputedAmount`, `metrics.netPayouts`).
* **Fix Applied:** Wrapped all arithmetic displays in defensive number coercions with fallback defaults: `Number(value || 0).toFixed(2)` and defined fallback default metrics objects for all 7 report categories in `reportService.js`.

### Bug 2: Corporate Client Filter Ignored on Sub-Reports
* **Symptom:** Filtering by a corporate client (e.g. "Acme Technologies") in sub-reports displayed records belonging to all other companies.
* **Root Cause:** Sub-report seed datasets lacked consistent `companyId` attributes, or used differing field names (`company`, `clientName`, `corporateClient`), causing the client filter condition to be bypassed.
* **Fix Applied:** Added `companyId` and `companyName` across all sub-report seed collections and implemented a universal `matchesCompany(record, companyFilter)` helper that matches on both ID and normalized name.

### Bug 3: Cancelled Order Showing Misleading 18m Dispatch Speed
* **Symptom:** In the Order Report, orders cancelled by clients displayed a misleading dispatch speed metric (e.g., "18 mins").
* **Root Cause:** Dispatch turnaround calculation did not check order status and computed the time difference between creation and cancellation for cancelled orders.
* **Fix Applied:** Updated dispatch speed formatting to return `"—"` (or `"N/A"`) for non-fulfilled or cancelled orders, displaying turnaround duration strictly for successfully converted and dispatched trips.

### Bug 4: CSV Formula Injection Vulnerability (CWE-1236)
* **Symptom:** Exporting reports containing malicious passenger names, driver notes, or corporate remarks starting with formula triggers (`=`, `+`, `-`, `@`) could execute arbitrary commands when opened in Microsoft Excel or Google Sheets.
* **Root Cause:** Unsanitized CSV cell serialization.
* **Fix Applied:** Implemented `sanitizeCsvCell(value)` across all 7 CSV export schemas in `reportService.js`, automatically prepending a single quote `'` and escaping double quotes for any cell starting with formula trigger characters.

### Bug 5: PII Phone Number Exposure in Read-Only Sessions (CWE-200)
* **Symptom:** Passenger and driver mobile numbers in the audit ledger and detail drawers were displayed in plaintext to non-administrator and auditor sessions.
* **Root Cause:** Plain contact strings were rendered directly without role inspection.
* **Fix Applied:** Integrated role-aware `maskPhone()` helper in `TripReportsPage.jsx`, masking contact numbers (`+91 98451 •••••`) for view-only roles while allowing authorized dispatchers full operational visibility.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **High-Volume BigQuery / PostgreSQL Streaming CSV Export:**
   * *Limitation:* The CSV export is currently generated client-side from the loaded JavaScript array. When historical reporting datasets exceed 100,000+ trip records across multi-year intervals, browser memory limits will be reached.
   * *Future Mitigation:* Transition to a backend asynchronous job queue (e.g. BullMQ / Celery) that queries BigQuery or PostgreSQL with streaming cursors, generates compressed CSVs in S3, and emails a secure presigned download link to the administrator.
2. **Live WebSocket Fleet Telemetry for Live Trip Scope:**
   * *Limitation:* The "🔴 Live Trips" sub-frequency tab currently filters trips with `tripStatus === 'IN_TRANSIT'` based on the last fetched state. Live vehicle speed and GPS coordinate updates require a WebSocket streaming layer.
3. **Automated Bank Disbursement Settlement Webhooks (Payouts UTR Reconciliation):**
   * *Limitation:* Driver payouts currently display mock NEFT / IMPS reference numbers. Automated bank disbursement requires integration with banking APIs (e.g. RazorpayX / Cashfree Payouts) with webhook listeners to update payout statuses from `PENDING_CLEARANCE` to `PROCESSED`.
4. **Dynamic Contracted Tier Split Rate Schedules:**
   * *Limitation:* Reports compute revenue splits based on static contract percentages (e.g. 80/20). Contracts featuring time-of-day surge commission splits or monthly volume tier discounts require dynamic ledger reconciliation in the billing engine.
