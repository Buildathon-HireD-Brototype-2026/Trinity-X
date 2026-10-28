# Page 6: Company Directory & Onboarding Management (`A-08`, `A-10`, `A-11`)

**Screens:** Page 6 – B2B Client Company Directory, Registration Requests Queue & Revenue Split Configuration  
**PRD Requirement IDs:** `A-08` (Priority: P0), `A-10` (Priority: P0), `A-11` (Priority: P0), PRD Section 4.1 (Company Lifecycle: `PENDING → ACTIVE` and `ACTIVE ↔ INACTIVE`)  
**Current Status:** Completed, Tested & Running with Service Layer & Fallback Store  

---

## 1. PRD Requirements & Objectives

* **PRD Scope (`A-08`):** B2B Client Company Directory: Centralized administrative view of all corporate client accounts (`model Company`) with operational status monitoring, primary contact details, operational hub association, and account lifecycle controls (`ACTIVE` vs `INACTIVE`).
* **PRD Scope (`A-10`):** Corporate Partner Registration Review: Queue management for incoming B2B partner registration requests (`model CompanyRegistrationRequest`), allowing administrators to inspect corporate applicant details and either approve & onboard the account or reject it with mandatory reason tracking.
* **PRD Scope (`A-11`):** Revenue Payout Split Configuration: Per-company revenue split customization governing platform commissions (`hiredSplit`) versus driver partner earnings (`driverSplit`), strictly defaulting to 20.00% HireD / 80.00% Driver and requiring a strict 100.00% sum validation.
* **Technical & Operational Constraints:**
  * Strict status lifecycle: Registration requests transition `PENDING → APPROVED` or `PENDING → REJECTED`. Directory accounts toggle `ACTIVE ↔ INACTIVE`.
  * Order dispatch restriction: Deactivating any corporate company account suspends transport booking dispatch orders for that client.
  * Manual walk-in registration: Allows administrators to provision enterprise clients directly into the directory as active or queue them for standard review.

---

## 2. UI Design Specification (What IS in the App Now)

The Company Directory module is implemented in `Trinity-X/admin-portal/src/features/company-directory/` and wired into `AdminShell.jsx`:

### A. Top Operations Header & KPI Stat Strip
* **Title & Subtitle:** 24px bold `"Company Directory & Accounts"` with contextual description detailing corporate fleet accounts, onboarding review, and revenue split settings.
* **Metric Stat Chips:**
  * **Total Accounts:** Neutral slate counter showing total registered enterprise accounts.
  * **Active Clients:** Emerald green badge (`#16a34a`) with `<CheckCircle2>` icon displaying clients eligible for transport booking dispatch.
  * **Pending Requests:** High-contrast amber badge (`#d97706`) with `<Clock>` icon showing unreviewed B2B registration requests. Clicking switches instantly to the request queue.
  * **Inactive Accounts:** Slate badge indicating deactivated client companies whose booking permissions are suspended.
* **Primary Actions:**
  * **Refresh Button:** Triggers animated data re-fetch with spin indicator without layout shift.
  * **"+ Onboard Company" Button:** Purple brand container (`#6A379F`) with `<PlusCircle>` icon; opens `AddCompanyModal`. Gated by RBAC.

### B. Dual-Tab Workspace & Filter Toolbar
* **Company Directory Tab:** Displays full corporate client roster with account status filter dropdown (`ALL`, `ACTIVE`, `INACTIVE`).
* **Registration Requests Tab:** Displays incoming B2B applications queue with status badge (`PENDING`, `APPROVED`, `REJECTED`) and review triggers.
* **Live Search Bar:** Real-time multi-field query matching company name, primary contact person, email address, phone digits, and operational zone.
* **Empty State Graphic:** Context-aware zero-state graphic with reset suggestions when query matches no records.
* **View-Only Banner:** Displays for non-admin / auditor sessions notifying them of read-only access.

### C. Company Registration Review Modal (`CompanyReviewModal.jsx`)
* **Header & Company Avatar:** 42px corporate avatar with company initial, company name, registration reference ID (`REQ-xxx`), and status badge.
* **Applicant Information Card:**
  * Contact Person, Corporate Email, and Contact Phone (automatically masked for read-only roles).
  * Operational hub / base location and application submission timestamp.
  * Fleet notes / custom transport requirements callout.
* **Decision Controls:**
  * **Approve & Onboard:** One-click transition updating request status to `APPROVED` and provisioning an `ACTIVE` company account into the directory with double-click guard.
  * **Reject Flow:** Inline expandable rejection reason textarea with strict 500-character boundary and real-time character decrement counter.

### D. Company Profile & Revenue Payout Split Modal (`CompanyDetailsModal.jsx`)
* **Header & Account Overview:** Displays company name, corporate ID (`CMP-xxx`), and operational status pill (`Eligible for Dispatch` vs `Suspended`).
* **Corporate Details Grid:** Primary contact name, corporate email, phone number (role-aware privacy masked), operational hub, and registered address.
* **Inactive Account Warning Banner:** High-contrast warning alerting administrators that transport booking dispatches are suspended for deactivated accounts.
* **Revenue Payout Split Editor (`PRD A-11`):**
  * Visual side-by-side comparison of `HIRED PLATFORM SPLIT` and `DRIVER EARNING SPLIT`.
  * Inline editor with preset buttons (`20% HireD / 80% Driver`, `15% HireD / 85% Driver`, `25% HireD / 75% Driver`).
  * Live arithmetic sum validation ensuring splits equal exactly 100.00% with two decimal place precision.

### E. Manual Walk-In Onboarding Modal (`AddCompanyModal.jsx`)
* Form for provisioning walk-in or contract-negotiated enterprise clients:
  * Company Legal Name (minimum 2 characters).
  * Primary Contact Person.
  * Corporate Email Address (format and case-insensitive uniqueness validated).
  * 10-Digit Indian Mobile Number (`/^[6-9]\d{9}$/`) with auto-formatted `+91` prefix.
  * Base Operational Hub dropdown (Bengaluru zones: Whitefield, Electronic City, Koramangala, Indiranagar, HSR Layout, etc.).
  * Revenue Split Configuration inputs with default pre-fill (20.00% / 80.00%).
  * Registration Mode selector (`Direct Active` vs `Queue for Review`).

---

## 3. Current State: UI with Local Simulation & Service Architecture

> [!NOTE]
> The company directory feature operates in **Full Client Architecture with Live Backend Stubs**:
> - Asynchronous service layer (`companyService.js`) attempting `fetch('/api/v1/admin/companies')` and `fetch('/api/v1/admin/partner-registrations')` with automatic fallback to an in-memory mock store aligned with Prisma models `Company` and `CompanyRegistrationRequest`.
> - Authentication header attachment via `getAuthHeaders()`, injecting validated `Authorization: Bearer <token>` and anti-CSRF `X-Requested-With: XMLHttpRequest` headers.
> - Reactive state management reflecting instant metric updates across total accounts, active clients, pending requests, and table rows without page reload.

---

## 4. Testing & Verification

A comprehensive 44-case test suite was executed and verified across 5 categories in `TestCases/tc_06_company_directory.md`:

| Category | Total Cases | Verification Mechanism | Status |
| :--- | :---: | :--- | :---: |
| **2.1 Happy Path (HP)** | 15 | Directory loading, request review, approval provisioning, walk-in onboarding, deactivation/reactivation, split editing, live search & filtering | `[✓ Passed]` |
| **2.2 Validation & Boundary (VAL)** | 10 | Required fields, name lengths, invalid email formats, duplicate email rejection, Indian phone format, 100% split sum rule, whitespace trimming | `[✓ Passed]` |
| **2.3 PRD Business Rules (PRD)** | 6 | Default 20/80 split ratio, inactive dispatch suspension warning, approved request directory sync, audit reason persistence, regional hub link | `[✓ Passed]` |
| **2.4 Usability & UX (UX)** | 8 | Double-click guards, Escape key dismissal, backdrop click rules, search zero-state graphic, ARIA dialog accessibility, dark mode readability | `[✓ Passed]` |
| **2.5 Security & Safeguards (SEC)** | 5 | Client-side RBAC gating, anti-CSRF / Bearer headers, PII phone masking, CSP meta enforcement, 500-char rejection length boundary | `[✓ Passed]` |
| **TOTAL** | **44** | **All 44 test cases verified with zero failures or regressions** | `[✓ Passed]` |

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Permissive RBAC Fallback (Fail-Open Risk)
* **Symptom:** Unauthenticated sessions or sessions with loading user context could temporarily view administrative write buttons (`+ Onboard Company`, `Deactivate`, `Approve`).
* **Root Cause:** Permission condition evaluated `!user || user.role === 'Admin' ...`, defaulting to true when `user` was null.
* **Fix Applied:** Changed to strict fail-closed enforcement: `Boolean(user && ['Admin', 'SuperAdmin', 'Operations'].includes(user.role))`, displaying an explicit `View-Only Mode` notice banner for read-only roles.

### Bug 2: PII Phone Number Exposure in Detail Modals
* **Symptom:** Primary contact phone numbers were masked in the directory table (`+91 98450 •••••`), but opening `CompanyDetailsModal` or `CompanyReviewModal` displayed unmasked phone numbers to non-admin / auditor sessions.
* **Fix Applied:** Added role-aware `displayPhone()` helper across both modals, ensuring phone numbers remain masked for view-only sessions.

### Bug 3: Row-Level Action Concurrent Race Conditions
* **Symptom:** Rapid successive clicks on `Activate` / `Deactivate` or `Approve` buttons could trigger multiple concurrent API requests and corrupt state.
* **Fix Applied:** Added `processingCompanyId` and `processingRequestId` mutex locks, disabling target buttons with dynamic loading indicators (`"Updating..."` / `"Approving..."`) while mutations settle.

### Bug 4: Expired Token Transmission in Service Layer
* **Symptom:** `getAuthHeaders()` extracted tokens from `sessionStorage` without inspecting the expiration timestamp, potentially sending expired tokens to backend endpoints.
* **Fix Applied:** Implemented token freshness check (`Date.now() > parsed.expiresAt`), attaching the Bearer token only when strictly valid and unexpired.

### Bug 5: Floating-Point Split Rounding Drift
* **Symptom:** Custom split percentages entered with multiple decimals could introduce floating-point arithmetic errors.
* **Fix Applied:** Normalized split percentages using `.toFixed(2)` prior to submission and persistence.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Automated MCA / GSTIN Verification API:**
   * *Limitation:* B2B corporate client registrations are currently reviewed manually by administrators based on submitted text notes. Automated GSTIN tax verification and Ministry of Corporate Affairs (MCA) entity validation require backend integration with a corporate KYC API (e.g. Karza / Cashfree / Surepass).
2. **Dynamic Volume-Based Payout Split Tiers:**
   * *Limitation:* Revenue payout splits are currently configured at a fixed percentage per company contract (e.g. 20% / 80%). High-volume enterprise clients often negotiate tiered splits based on monthly ride volumes (e.g., 20% for first 1,000 trips, 15% thereafter).
3. **Multi-Location Sub-Account Hierarchy:**
   * *Limitation:* Large enterprise clients often require parent-child company accounts (e.g. Infosys Electronic City vs Infosys Whitefield) with separate billing contacts under a unified enterprise contract.
4. **Large-Scale Directory Server-Side Cursor Pagination:**
   * *Limitation:* Directory search and filtering currently operate in-memory on the loaded dataset. When the corporate client roster scales beyond 1,000+ companies, server-side paginated queries will be needed to ensure high responsiveness.
