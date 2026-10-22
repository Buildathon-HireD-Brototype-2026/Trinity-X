# Page 7: Orders Inbox & Manual Booking Management (`A-02`, `A-03`, `A-04`, `A-05`)

**Screens:** Page 7 – Corporate Transport Inquiries, Phone/WhatsApp Manual Booking, Trip Conversion & Rejection  
**PRD Requirement IDs:** `A-02` (Priority: P0), `A-03` (Priority: P0), `A-04` (Priority: P0), `A-05` (Priority: P0), PRD Section 4.1 (Order Lifecycle: `RECEIVED → ACCEPTED | REJECTED`), `PRD B-07` (Rejection Reason Logging)  
**Current Status:** Completed, Tested & Running with Service Layer & Fallback Store  

---

## 1. PRD Requirements & Objectives

* **PRD Scope (`A-02`):** Orders Inbox: Centralized operational workspace for incoming corporate transport inquiries (`model Order`) with real-time status indicators, corporate client identification, journey route details, scheduled pickup times, and live status/source filtering.
* **PRD Scope (`A-03`):** Manual Order Placement: Provisioning manual booking inquiries received over phone calls or WhatsApp channels on behalf of registered, active corporate clients (`model Company`), capturing route spots, scheduled times, passenger contacts, and estimated fares.
* **PRD Scope (`A-04`):** Order Details Review: Deep-dive inspection of booking requests, journey coordinates (pickup → dropoff), requested vehicle category, passenger contact information, special driver notes, and client account profile.
* **PRD Scope (`A-05`):** Accept Order & Convert to Live Trip: Administrative validation and price confirmation (`tripAmount`), transitioning order status to `ACCEPTED` and generating an associated dispatch `Trip` record ready for driver allocation.
* **PRD Scope (`PRD Section 4.1` & `B-07`):** Order Rejection Flow: Administrative rejection of unserviceable bookings with mandatory audit reason logging (`rejectReason`) to maintain operational transparency with corporate clients.
* **Technical & Operational Constraints:**
  * Terminal state immutability: Once an order is transitioned to `ACCEPTED` or `REJECTED`, actions are locked to prevent duplicate trip conversions or state divergence.
  * Active corporate client gating: Manual phone/WhatsApp bookings can only be placed on behalf of `ACTIVE` corporate client companies.
  * Role-based access control (RBAC): Read-only / auditor sessions are prevented from creating manual bookings, accepting orders, or declining inquiries.

---

## 2. UI Design Specification (What IS in the App Now)

The Orders Inbox module is implemented in `Trinity-X/admin-portal/src/features/orders-inbox/` and wired into `AdminShell.jsx`:

### A. Top Operations Header & KPI Metric Strip
* **Title & Subtitle:** 24px bold `"Orders & Bookings Inbox"` with contextual subtitle describing corporate travel requests, manual booking entries, and trip fare confirmation.
* **KPI Metric Cards:**
  * **Pending Review:** High-visibility amber card (`#d97706`) with `<Clock>` icon displaying incoming inquiries awaiting dispatch action.
  * **Converted Trips:** Emerald green card (`#16a34a`) with `<CheckCircle2>` icon displaying orders successfully converted into live trips.
  * **Rejected Inquiries:** Soft red card (`#ef4444`) with `<XCircle>` icon tracking declined corporate requests.
  * **Total Inquiries:** Clean slate card displaying the cumulative booking volume across all channels.
* **Action Controls:**
  * **Refresh Button:** Quick data refetch with continuous spinning icon animation without layout shift.
  * **"+ Log Phone / WhatsApp Order" Button:** Purple brand container (`#6A379F`) with `<PlusCircle>` icon; opens `CreateOrderModal`. Gated by administrator privileges.

### B. Filter Toolbar & Multi-Field Search
* **Status Filter Pills:** Segmented pill controls for instant filtering: `All Inquiries`, `Pending Review` (amber badge), `Accepted` (green badge), and `Rejected` (red badge).
* **Source Channel Dropdown:** Dropdown selector filtering by origin channel: `All Channels`, `B2B Portal`, `Phone Call`, and `WhatsApp`.
* **Live Search Bar:** Real-time multi-attribute search matching Order Ref ID (`ORD-xxxx`), Passenger Name, Contact Phone, and Corporate Client Name.
* **Empty State Graphic:** Context-aware zero-state graphic with `<Inbox>` icon and helper suggestions when query yields no results.
* **View-Only Banner:** Displays for non-admin / auditor sessions notifying them that write actions are disabled.

### C. Order Review & Conversion Modal (`OrderDetailModal.jsx`)
* **Header & Order Badge:** Order reference header (`#ORD-xxxx`), booking submission timestamp, and current lifecycle status pill.
* **Corporate Client Card:** Corporate account profile banner displaying client company name, contact phone (privacy masked for read-only roles), and client contract status.
* **Passenger & Schedule Details:** Passenger name, contact telephone, requested vehicle category (`Sedan`, `SUV`, `Executive`), and formatted scheduled pickup time.
* **Visual Journey Route:** High-legibility origin-to-destination path with emerald pickup pin (`pickupSpot`) and crimson dropoff destination (`dropoffSpot`).
* **Trip Fare & Financials (`PRD A-05`):**
  * Number input displaying confirmed or adjusted trip fare (`tripAmount`) in Indian Rupees (₹).
  * Informational revenue split indicator (80% Driver / 20% Platform).
  * Positive fare validation ensuring amount is greater than ₹0.00.
* **Decision Controls:**
  * **Accept & Convert to Trip:** Primary action with `isSubmitting` double-click guard; persists confirmed fare, transitions order to `ACCEPTED`, and provisions a dispatch `Trip` record.
  * **Reject Order Flow:** Danger action button opening an inline decline dialog requiring a non-empty administrative rejection reason with a 500-character boundary and real-time counter.
  * **Terminal State View:** Once accepted or rejected, action buttons are replaced with an audit banner displaying trip conversion details or recorded decline reason.

### D. Manual Phone/WhatsApp Booking Modal (`CreateOrderModal.jsx`)
* **Channel Source Toggle:** Switcher selecting between `Phone Call` and `WhatsApp Booking` channel tags.
* **Corporate Client Dropdown:** Dynamic `<select>` component filtered strictly to `ACTIVE` corporate client accounts (`Acme Technologies`, `Nexus Logistics`, `Starlight Financial`).
* **Passenger Information:**
  * Passenger Name (minimum 2 characters, trimmed).
  * 10-Digit Indian Contact Mobile Number (`/^[6-9]\d{9}$/`) with auto-formatted `+91` prefix.
* **Route & Scheduling:**
  * Pickup Spot address input (required, trimmed).
  * Dropoff Destination address input (required, trimmed).
  * Scheduled Pickup Time picker defaulting smoothly to 2 hours in the future to avoid manual date entry friction.
  * Vehicle Category dropdown (`Sedan`, `SUV`, `Executive`, `Hatchback`).
* **Financials & Notes:**
  * Estimated Trip Fare (positive amount validation).
  * Special trip instructions / passenger flight details notes textarea.

### E. Orders Roster Table
* **Order Reference:** Monospace identifier tag (`ORD-1001`) with clickable detail review trigger.
* **Company:** Corporate client name and verified business badge.
* **Passenger:** Passenger name and role-aware privacy masked phone number (`+91 98451 •••••`).
* **Journey Route:** Visual route indicators showing pickup spot and dropoff destination.
* **Pickup Time:** Formatted calendar date and time.
* **Channel Source:** Visual channel badges (`Portal`, `WhatsApp`, `Phone`).
* **Status Badge:** Semantic status indicator (`Pending Review`, `Converted to Trip`, `Rejected`).
* **Row Action:** `"Review"` button opening the modal.

---

## 3. Current State: UI with Local Simulation & Service Architecture

> [!NOTE]
> The orders inbox module operates in **Full Client Architecture with Live Backend Stubs**:
> - Asynchronous service layer (`orderService.js`) attempting `fetch('/api/v1/admin/orders')` with automatic fallback to an in-memory client mock store aligned with Prisma models `Order`, `Company`, and `Trip`.
> - Authentication header attachment via `getAuthHeaders()`, injecting validated `Authorization: Bearer <token>` and anti-CSRF `X-Requested-With: XMLHttpRequest` headers with session expiration checks.
> - Reactive state management reflecting instant metric updates across pending inquiries, accepted trips, and rejected orders without full-page reloads.

---

## 4. Testing & Verification

A comprehensive 44-case test suite was executed and verified across 5 categories in `TestCases/tc_07_orders_inbox.md`:

| Category | Total Cases | Verification Mechanism | Status |
| :--- | :---: | :--- | :---: |
| **2.1 Happy Path (HP)** | 15 | Inbox workspace, order detail review, trip conversion with fare, order rejection with reason, phone booking, WhatsApp booking, status filtering, channel dropdown, live search, data refresh, read-only inspection | `[✓ Passed]` |
| **2.2 Validation & Boundary (VAL)** | 10 | All fields blank, missing corporate client, invalid phone format, missing route spots, zero/negative fare, empty rejection reason, whitespace-only reason, text trimming, future pickup schedule | `[✓ Passed]` |
| **2.3 PRD Business Rules (PRD)** | 6 | Active corporate account filter, trip entity generation on conversion, rejection audit reason persistence, terminal state immutability, booking source badges, KPI counts consistency | `[✓ Passed]` |
| **2.4 Usability & UX (UX)** | 8 | Double-click protection on creation, double-click protection on conversion, Escape key dismissal, backdrop dismissal when idle, backdrop locked during submit, empty search zero-state, modal ARIA attributes, dark mode contrast | `[✓ Passed]` |
| **2.5 Security & Safeguards (SEC)** | 5 | Client-side RBAC gating, anti-CSRF & Bearer authorization headers, PII phone masking for view-only roles, Content Security Policy enforcement, 500-char rejection length limit | `[✓ Passed]` |
| **TOTAL** | **44** | **All 44 test cases verified with zero failures or regressions** | `[✓ Passed]` |

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Datetime-Local Picker Manual Formatting Friction
* **Symptom:** Opening the manual order modal required users to manually type a complete ISO/local date-time string into the HTML5 `<input type="datetime-local">`, causing validation errors when browsers had varying locale formats.
* **Root Cause:** `INITIAL_FORM` initialized `pickupTime` to an empty string `''`.
* **Fix Applied:** Implemented `getDefaultPickupTime()` which pre-calculates and populates a valid future schedule (`Date.now() + 2 hours`) formatted as `YYYY-MM-DDTHH:mm`. Users can still adjust the time effortlessly while eliminating submission errors.

### Bug 2: PII Phone Number Exposure in Read-Only Sessions
* **Symptom:** Passenger contact phone numbers were displayed in plaintext to non-administrator / auditor users.
* **Root Cause:** Plain `order.contactPhone` was rendered without role inspection.
* **Fix Applied:** Implemented role-aware `maskPhone()` in both `OrdersInboxPage.jsx` and `OrderDetailModal.jsx`, masking middle and last digits (`+91 98451 •••••`) for view-only or auditor sessions while allowing administrators full operational visibility.

### Bug 3: Double-Click Concurrent Trip Conversion Risk
* **Symptom:** Rapidly clicking "Accept & Convert to Trip" could dispatch multiple concurrent trip generation requests, risking duplicate `Trip` records for a single `Order`.
* **Root Cause:** Submit button did not lock synchronously before asynchronous promise resolution.
* **Fix Applied:** Bound `isSubmitting` state to immediately disable the button and show loading indicators (`"Converting to Trip..."`) on the first click, with backdrop dismissals blocked until the operation completes.

### Bug 4: Unbounded Rejection Reason Textarea Boundary Limit
* **Symptom:** Administrators could enter excessively long rejection explanations that could cause payload size errors or overflow database column boundaries.
* **Root Cause:** Rejection textarea lacked an explicit character length cap.
* **Fix Applied:** Added `maxLength={500}` constraint to the rejection textarea alongside a dynamic countdown indicator (`500 - rejectReason.length characters left`), preventing payload abuse.

### Bug 5: Order State Machine Race Condition & Terminal State Mutation (CWE-372)
* **Symptom:** Neither `acceptOrder()` nor `rejectOrder()` verified if an order was currently in the `RECEIVED` status. A network retry, replayed request, or concurrent operator action could overwrite an already `ACCEPTED` order into `REJECTED` or vice-versa, corrupting the associated `Trip` audit trail.
* **Root Cause:** Missing state machine transition guard in `orderService.js`.
* **Fix Applied:** Enforced strict status validation in both `acceptOrder()` and `rejectOrder()`: `if (_orders[idx].status !== 'RECEIVED') throw new Error('Order is already in a terminal state and cannot be modified.')`.

### Bug 6: Inactive Corporate Client Gating Bypass in Manual Orders (CWE-862)
* **Symptom:** While the UI dropdown only listed active companies, the service layer itself defaulted to a generic `{ name: 'Corporate Client' }` if an unknown or inactive `companyId` was passed, allowing suspended companies to book rides.
* **Root Cause:** Missing server-side/service-layer validation of company status.
* **Fix Applied:** Added explicit validation in `createManualOrder()` confirming the corporate account exists in `_activeCompanies` with `status === 'ACTIVE'`, rejecting bookings for inactive or suspended accounts.

### Bug 7: Missing Upper Bound on Trip Fare & Price Range Tampering (CWE-20)
* **Symptom:** Both estimated fare and confirmed trip fare only verified `fare > 0`, allowing arbitrary multi-million or negative numbers to be submitted.
* **Root Cause:** Absence of upper operational boundary checks on financial inputs.
* **Fix Applied:** Imposed a strict upper ceiling of ₹5,00,000.00 (`max="500000"` in inputs and `fare > 500000` validation in service layer and modals) preventing arithmetic overflow and payment gateway rejection.

### Bug 8: Unbounded Free-Text Input / Client Memory Exhaustion (CWE-400)
* **Symptom:** Passenger name, contact phone, pickup spot, and dropoff spot inputs in `CreateOrderModal.jsx` lacked length bounds and HTML `maxLength` attributes, allowing arbitrary mega-byte string submissions.
* **Root Cause:** Missing length constraints on text fields.
* **Fix Applied:** Added `maxLength={100}` on `contactName`, `maxLength={15}` on `contactPhone`, `maxLength={250}` on `pickupSpot` and `dropoffSpot`, and validated string lengths in `validate()`.

### Bug 9: Fail-Open Default Parameter for RBAC in Order Detail Modal (CWE-276)
* **Symptom:** `OrderDetailModal.jsx` defined `canManageOrders = true` as its default prop parameter. If rendered without passing the prop, it would fail open and expose passenger phone numbers and action buttons to unauthorized sessions.
* **Root Cause:** Insecure default parameter.
* **Fix Applied:** Changed the default parameter to `canManageOrders = false` (strict fail-closed security).

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Automated Geocoding & Route Distance Calculation:**
   * *Limitation:* Pickup and dropoff points are currently entered as textual addresses. Automated trip fare estimation based on actual road distance (km) and expected duration requires backend integration with Google Maps Distance Matrix API or OpenStreetMap Routing Service.
2. **Real-Time Driver Fleet Proximity Matching:**
   * *Limitation:* Accepting an order provisions a `Trip` with `ASSIGNMENT_PENDING` status. Automated dispatch matching based on available drivers' real-time GPS locations within a specified radius (e.g., 5km) requires WebSocket fleet telemetry integration.
3. **Automated WhatsApp Business Webhook Integration:**
   * *Limitation:* WhatsApp orders are currently logged manually by dispatchers via the "+ Log Phone / WhatsApp Order" modal. Direct ingestion of customer chat requests requires integration with Meta's WhatsApp Cloud API and webhook listeners.
4. **Corporate Client Monthly Credit Limit Enforcement:**
   * *Limitation:* Manual bookings can be created for any `ACTIVE` corporate account. Real-time checking against the client's pre-approved monthly credit limit or postpaid balance requires synchronization with the corporate billing ledger.
