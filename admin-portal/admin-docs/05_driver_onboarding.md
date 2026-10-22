# Page 5: Driver Onboarding & Management (`A-09`, `A-07`, `D-02`)

**Screens:** Page 5 – Driver Onboarding Queue, Document Verification & Driver Directory  
**PRD Requirement IDs:** `A-09` (Priority: P0), `A-07` (Priority: P0), `D-02` (Priority: P0), PRD Section 4.1 (Status Values: `PENDING → ACTIVE` and `ACTIVE ↔ INACTIVE`)  
**Current Status:** Completed, Tested & Running with Service Layer & Fallback Store  

---

## 1. PRD Requirements & Objectives

* **PRD Scope (`A-09`):** Driver Onboarding Queue & KYC Review: Platform administrators inspect uploaded documents for new driver applicants (Driving Licence, Aadhaar Card, PAN Card, Police Clearance Certificate) and approve accounts into `ACTIVE` status for dispatch assignment.
* **PRD Scope (`A-07`):** Driver Directory & Real-Time Availability: Centralized listing of all onboarded drivers with real-time duty status monitoring (`is_online`), location tracking, and administrative account toggling (`ACTIVE` vs `INACTIVE`).
* **PRD Scope (`D-02`):** Mandatory 4-Document KYC: Drivers must submit 4 required identity and compliance documents before active duty.
* **Technical Constraints:**
  * Strict status lifecycle: `PENDING → ACTIVE` upon approval; `ACTIVE ↔ INACTIVE` via toggle.
  * Duty decoupling: Deactivating any active driver automatically transitions `is_online = false`.
  * Manual walk-in registration: Allows administrators to provision walk-in drivers directly into the queue or as direct active.

---

## 2. UI Design Specification (What IS in the App Now)

The Driver Onboarding module is implemented in `Trinity-X/admin-portal/src/features/driver-onboarding/` and wired into `AdminShell.jsx`:

### A. Top Operations Header & KPI Stat Strip
* **Title & Subtitle:** 24px bold `"Driver Onboarding & Verification"` with context subtitle outlining KYC verification and dispatch readiness.
* **Metric Stat Chips:**
  * **Total Applications:** Slate counter showing total registered driver records.
  * **Pending Review:** High-contrast amber badge (`#d97706`) with `<Clock>` icon showing unverified applicants. Clicking switches instantly to the queue tab.
  * **Active Drivers:** Emerald green badge (`#16a34a`) showing drivers eligible for corporate dispatch.
  * **Currently Online:** Blue badge (`#2563eb`) with `<Wifi>` icon showing active drivers currently on duty.
* **Primary Actions:**
  * **Refresh Button:** Triggers animated data re-fetch with spin indicator.
  * **"+ Onboard Driver" Button:** Purple brand container (`#6A379F`) with `<UserPlus>` icon; opens `AddDriverModal`. Gated by RBAC.

### B. Dual-Tab Workspace & Filter Toolbar
* **Verification Queue Tab:** Filters exclusively for `PENDING` applications with an unread amber counter badge.
* **Driver Directory Tab:** Displays full fleet roster with account status filter dropdown (`ALL`, `ACTIVE`, `PENDING`, `INACTIVE`).
* **Live Search Bar:** Real-time multi-field query matching driver name, phone number, and operational hub.
* **Empty State Graphic:** Friendly zero-state display with search reset suggestion when no records match.

### C. Driver KYC Review Modal (`DriverReviewModal.jsx`)
* **Applicant Summary Card:** 44px circular avatar with applicant initial, formatted phone, base hub, and status badge.
* **KYC Checklist Callout:** Dynamic compliance banner displaying green `Ready for Review` (4/4 complete) or amber `Incomplete Application` with missing document warning.
* **4-Document Inspection Grid:**
  1. Commercial Driving Licence (DL)
  2. Aadhaar Identity Card
  3. PAN Card
  4. Police Clearance Certificate (PCC)
  * Each card displays upload timestamp, original filename, status pill (`VERIFIED`, `SUBMITTED`, or `MISSING`), and a `"View Doc"` button.
* **Decision Controls:**
  * **Approve & Mark Active:** One-click transition updating driver status to `ACTIVE` with `isSubmitting` double-click guard.
  * **Reject Flow:** Expandable rejection reason textarea with 500-character limit and live countdown.

### D. Inline Document Viewer Modal (`DocumentViewerModal.jsx`)
* Elevated modal with backdrop blur for inspecting individual KYC artifacts.
* Official issuance simulation card showing cardholder name, masked phone (`+91 98451 •••••`), document reference ID, and file size.
* **Forensic Audit Watermark:** Red-tinted audit banner showing the reviewing administrator's email and session timestamp to mitigate unauthorized screen capture leakage.

### E. Manual Walk-In Onboarding Modal (`AddDriverModal.jsx`)
* Form for provisioning walk-in or offline applicants:
  * Full Name (minimum 2 characters).
  * Indian Mobile Number with live validation (`/^[6-9]\d{9}$/`) and auto-prefix `+91`.
  * Operational Hub dropdown (Bengaluru zones: Koramangala, Indiranagar, Whitefield, HSR Layout, etc.).
  * Initial status radio selector (`Pending` review vs `Direct Active`).

---

## 3. Current State: UI with Local Simulation & Service Architecture

> [!NOTE]
> The driver onboarding feature operates in **Full Client Architecture with Live Backend Stubs**:
> - Asynchronous service layer (`driverService.js`) attempting `fetch('/api/v1/admin/drivers')` with automatic fallback to an in-memory mock store.
> - Full session authentication injection via `getAuthHeaders()` transmitting `Authorization: Bearer <token>` and anti-CSRF headers.
> - Reactive state management reflecting instant metric updates across queue counts, active counts, and table rows without page reload.

---

## 4. Testing & Verification

Comprehensive 49-case test suite executed and verified across 6 categories in `TestCases/tc_05_driver_onboarding.md`:

| Category | Cases | Verification Mechanism | Status |
| :--- | :---: | :--- | :---: |
| **2.1 Happy Path (HP)** | 15 | Queue loading, directory tab, document preview, approval, manual walk-in, status toggle | `[✓ Passed]` |
| **2.2 Validation & Boundary (VAL)** | 8 | Empty names, invalid phone lengths, non-Indian phone formats, duplicate phone rejection | `[✓ Passed]` |
| **2.3 PRD Business Rules (PRD)** | 6 | Mandatory 4 docs review, pending to active transition, deactivated drivers forced offline | `[✓ Passed]` |
| **2.4 Usability & UX (UX)** | 10 | Double-click guards, ESC key handling, backdrop click rules, search zero-state, dark mode | `[✓ Passed]` |
| **2.5 Security & Safeguards (SEC)** | 3 | Storage path isolation, unauthenticated route protection, defensive nullish doc array guard | `[✓ Passed]` |
| **2.6 Vulnerability Remediation (VULN)** | 7 | Client RBAC check, Bearer/CSRF headers, CSP directives, forensic watermark, length bounds | `[✓ Passed]` |
| **TOTAL** | **49** | **All 49 scenarios verified with zero failures or regressions** | `[✓ Passed]` |

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Missing Documents Array Runtime Exception
* **Symptom:** Viewing driver records created through legacy stubs or partial API responses triggered a blank screen / null reference error (`Cannot read properties of undefined (reading 'map')`).
* **Root Cause:** Legacy seed objects occasionally omitted the `documents` array entirely.
* **Fix Applied:** Wrapped all document access in defensive nullish coalescing `(driver.documents || [])` across `DriverOnboardingPage` and `DriverReviewModal`.

### Bug 2: Deactivated Driver Remaining Online
* **Symptom:** When an administrator toggled an online driver to `INACTIVE`, the driver remained marked as `is_online = true`.
* **Root Cause:** Toggle service only flipped `status` without enforcing the PRD operational rule that inactive drivers cannot accept dispatches.
* **Fix Applied:** Added duty decoupling rule in `toggleDriverStatus`: setting `status = INACTIVE` automatically forces `is_online = false`.

### Bug 3: Toast Notification Timer Overwrite Race Condition
* **Symptom:** Rapid successive actions caused earlier toast timers to prematurely clear newer success or error notifications.
* **Fix Applied:** Implemented `toastTimeoutRef` using `useRef` to clear any pending timeout before dispatching a new notification.

### Bug 4: Security Hardening & PII Protection
* **Fix Applied:**
  * Added Content Security Policy (CSP) meta tag in `index.html`.
  * Implemented client-side RBAC checks gating destructive actions behind `canManageDrivers`.
  * Added dynamic forensic watermarking and phone masking (`+91 98451 •••••`) in `DocumentViewerModal`.
  * Gated mock default admin credentials in `AuthContext.jsx` behind `import.meta.env.PROD`.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **OCR Automated KYC Parsing (Pre-Backend AI Service):**
   * *Limitation:* Documents are currently visually inspected by human administrators. Automated RTO licence verification and Aadhaar OCR parsing require backend integration with identity verification APIs (e.g. Surepass/Cashfree KYC).
2. **Signed S3 Document URLs Expiration:**
   * *Limitation:* In production, private document storage links will use time-limited presigned S3 URLs (TTL 15 minutes). If an administrator leaves the review modal open past expiration, document image previews will return HTTP 403 unless auto-refreshed.
3. **High-Volume Pagination:**
   * *Limitation:* The current directory table renders the full dataset in-memory. When fleet size scales past 500+ drivers, server-side cursor pagination will be required to maintain 60fps scrolling performance.
