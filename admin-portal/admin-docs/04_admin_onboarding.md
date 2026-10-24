# Page 4: Admin Onboarding & Account Management (`A-01`, Section 2, Section 8.1)

**Screen:** Page 4 – Admin Onboarding & Account Management  
**PRD Requirement IDs:** `A-01` (Priority: P0), PRD Section 2 (Users & Roles — equal access tier, $\ge 2$ accounts required), Section 8.1 Decision 6 (Two or more admin accounts exist)  
**Current Status:** Completed, Tested & Running with Mock State Layer  

---

## 1. PRD Requirements & Enterprise Administrator Context

* **PRD Scope (`A-01`, Section 2 & 8.1):** Admin Onboarding & Team Lifecycle: Authenticated platform administrators can view all team members, provision new administrative accounts, and deactivate former team members when they quit or transition roles.
* **Corporate Mobility & Dispatch Context:** Corporate transport dispatch operations require high organizational integrity, auditability, and team continuity:
  * **Two-Person Verification Integrity (`A-10`):** Month-end corporate invoice verification strictly mandates two independent administrators. Consequently, the system must never permit deactivation if doing so would leave fewer than 2 active administrators.
  * **Flat Permission Model (Phase 1):** Every newly provisioned administrator possesses identical platform access (dispatching, order management, driver KYC approval, reports, and invoices). There are no restricted sub-tiers in Phase 1.
  * **Self-Lockout Safeguards:** Administrators must be physically and logically prevented from deactivating their own currently logged-in account.
  * **Rapid Team Provisioning:** Immediate credential generation with live password complexity feedback ensuring temporary passwords meet enterprise entropy standards.

---

## 2. UI Design Specification (What IS in the App Now)

The Admin Onboarding & Management module is implemented in `Trinity-X/admin-portal/src/features/admin-management/` and styled in `Trinity-X/admin-portal/src/index.css`:

### A. Top Operations Header & Quick Stats Bar
* **Screen Title & Breadcrumb:**
  * Title: 24px bold (`FontWeight.w700`) `"Admin Management"`.
  * Subtitle: 14px muted gray text `"Provision new administrators, audit team access, and manage operational credentials."`
* **Real-time Stat Counters:**
  * **Total Admins Pill:** Muted slate badge showing total historical accounts registered.
  * **Active Admins Pill:** High-contrast emerald badge (`#10B981`) showing currently active accounts eligible for dispatch and co-signing.
  * **Inactive Admins Pill:** Neutral gray pill showing archived/deactivated team members.
* **Primary Call-to-Action ("Add Admin"):**
  * Key: `add-admin-btn`
  * Solid brand purple container (`#6A379F`) with `<UserPlus>` icon and text `"Add Admin"`.
  * Opens the elevated `AddAdminModal` dialog with smooth backdrop blur.

### B. Admin Directory Table (`AdminTable.jsx`)
A clean, high-density operational data table providing complete team visibility:
1. **Administrator Identity Column:**
   * 40x40px avatar container with purple gradient and admin initials (e.g. `"NS"` for Neha Sharma).
   * Full admin name in bold text.
   * Self-Identity Tag: Renders a distinct purple `"You"` badge alongside the administrator's name if the row matches the currently authenticated session.
2. **Contact Email Column:**
   * Formatted lowercase corporate email address with `<Mail>` icon prefix.
3. **Contact Phone Column:**
   * Formatted contact number (`+91 98450 11223`) with `<Phone>` icon prefix.
4. **Office / Branch Column:**
   * Branch identifier badge (`OFF-001`) indicating regional dispatch assignment.
5. **Account Status Column:**
   * `ACTIVE` Badge: Emerald green container (`rgba(16, 185, 129, 0.12)`) with green dot and bold uppercase label.
   * `INACTIVE` Badge: Neutral slate container with dark dot indicating deactivated status.
6. **Date Added Column:**
   * Formatted creation timestamp (`YYYY-MM-DD`).
7. **Actions Column:**
   * **Deactivate Button:**
     * Rendered for active admins.
     * **Disabled Guard (Self):** Disabled with a tooltip if the row belongs to the currently logged-in admin (`"You cannot deactivate your own account"`).
     * **Disabled Guard (PRD Minimum):** Disabled if only 2 active admins remain across the entire system.
   * **Deactivated State:** Rows with `INACTIVE` status render a disabled `"Deactivated"` label with no actionable button.

### C. Add Admin Modal Dialog (`AddAdminModal.jsx`)
An elevated modal container (`520px` width) with `backdrop-filter: blur(8px)`:
* **Modal Header:**
  * Section title `"Add New Administrator"` with `<UserPlus>` icon badge.
  * Subtitle `"Create an active account for a platform administrator with full operations access."`
  * Close (`<X>`) button dismissing modal and clearing unsaved inputs. Keyboard `Escape` key also closes the modal safely.
* **Form Inputs & Live Validations:**
  * **1. Full Name Field:** Minimum 2 characters, maximum 50 characters, auto-trimmed.
  * **2. Corporate Email Field:** Standard email regex validation (`user@domain.tld`), maximum 50 characters, duplicate detection against existing active/inactive admins.
  * **3. Contact Phone Field:** Minimum 10 digits, numeric validation, maximum 20 characters.
  * **4. Temporary Password Field:**
    * Obscured text field with trailing `<Eye>` / `<EyeOff>` visibility toggle.
    * Enforces minimum 8 characters with enterprise password complexity.
    * **Live Password Complexity Checklist:** Four visual pill indicators dynamically turning green with checkmarks as requirements are satisfied ($\ge$ 8 chars, uppercase, lowercase, number/symbol).
* **Feedback & Anti-Duplicate Guard:**
  * Inline error messages with `<AlertCircle>` rendered beneath invalid inputs.
  * Modal-level crimson error banner for duplicate email rejection.
  * Submit button debounced and disabled during asynchronous creation to prevent double-click duplicates.
  * Success feedback animation confirming account provisioning before auto-dismissal.

### D. Deactivation Confirmation Safeguard Dialog
Triggered upon selecting `"Deactivate"` on an eligible administrator:
* **Warning Card:** High-visibility amber/red prompt confirming administrator offboarding.
* **Confirmation Message:** `"Are you sure you want to deactivate [Admin Name]? This user will immediately lose platform access and cannot co-verify invoices."`
* **Actions:**
  * `"Cancel"` button: Dismisses the prompt with zero state changes.
  * `"Confirm Deactivate"` button: Transitions admin to `INACTIVE`, updates `AuthContext` store, and displays an emerald confirmation toast.

---

## 3. Current State: UI with Local State Layer

> [!NOTE]
> The Admin Onboarding feature runs with an asynchronous local service layer managed by `adminService.js` and `AuthContext.jsx`:
> - In-memory store seeded to match platform default accounts:
>   * `ADM-001`: Admin One (`admin1@hired.com`, Status: `ACTIVE`)
>   * `ADM-002`: Neha Sharma (`admin2@hired.com`, Status: `ACTIVE`)
>   * `ADM-003`: Inactive Admin (`inactive@hired.com`, Status: `INACTIVE`)
> - Direct reactive synchronization with `AuthContext` via `registerAuthAdmin()` and `updateAuthAdminStatus()`.
> - PRD business rule guard strictly preventing deactivation if the active administrator count drops to $\le 2$.
> - Self-deactivation protection checking `currentUser.id` and `currentUser.email` to block self-lockout.

---

## 4. Testing & Verification

### A. Automated Component & State Scenarios

Verified across test scenarios documented in the matrix below:

| Test ID | Test Scenario | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **TC-ADMON-HP-01** | View admin list renders rows, credentials, and status badges | Loads page; asserts table rows, badges, and action buttons | `[✓ Passed]` |
| **TC-ADMON-HP-02** | Add new admin with valid details provisions active account | Fills valid form; asserts new row in table with `ACTIVE` badge | `[✓ Passed]` |
| **TC-ADMON-HP-03** | Deactivate active admin updates badge to INACTIVE | Confirms deactivation; asserts status changes to `INACTIVE` | `[✓ Passed]` |
| **TC-ADMON-HP-04** | INACTIVE admin account cannot authenticate | Attempts login with deactivated credentials; asserts rejection | `[✓ Passed]` |
| **TC-ADMON-HP-05** | Newly added admin can log in with full platform access | Logs in with new admin; asserts dashboard entry with full access | `[✓ Passed]` |
| **TC-ADMON-HP-06** | Status badges render correct visual styling | Inspects DOM; asserts emerald for ACTIVE, slate for INACTIVE | `[✓ Passed]` |
| **TC-ADMON-VAL-01** | Submitting empty form blocks creation and shows inline errors | Clicks save on empty form; asserts inline error labels | `[✓ Passed]` |
| **TC-ADMON-VAL-04** | Invalid email format displays validation warning | Enters `notanemail`; asserts email format error | `[✓ Passed]` |
| **TC-ADMON-VAL-05** | Duplicate email rejected case-insensitively | Enters existing email; asserts duplicate email error banner | `[✓ Passed]` |
| **TC-ADMON-PRD-01** | Deactivation blocked when only 2 active admins remain | Attempts deactivation with 2 active admins; asserts PRD guard | `[✓ Passed]` |
| **TC-ADMON-PRD-02** | All onboarded admins share equal platform privileges | Inspects permissions; asserts identical access across modules | `[✓ Passed]` |
| **TC-ADMON-PRD-04** | Self-deactivation blocked for logged-in administrator | Inspects logged-in row; asserts disabled button and "You" badge | `[✓ Passed]` |
| **TC-ADMON-UX-01** | Loading spinner displayed during asynchronous operations | Dispatches async actions; asserts loading spinner rendered | `[✓ Passed]` |
| **TC-ADMON-UX-04** | Double-click submission race condition prevented | Clicks submit rapidly twice; asserts single record created | `[✓ Passed]` |
| **TC-ADMON-UX-05** | Escape key closes Add Admin modal cleanly | Presses Escape; asserts modal dismisses and resets form | `[✓ Passed]` |
| **TC-ADMON-UX-06** | Confirmation dialog required before deactivation executes | Clicks Deactivate; asserts confirmation dialog displayed | `[✓ Passed]` |

### B. Manual Viewport & Browser Testing

* **Environments:** Google Chrome, Desktop (1920x945), Tablet (768px), and Mobile (375px).
* **Inspection Results:**
  1. Admin table renders cleanly on desktop and tablet with horizontal scrolling support where necessary.
  2. The Add Admin modal dialog centers symmetrically with smooth background dimming and high-contrast inputs.
  3. Deactivating an administrator immediately updates the active/inactive stat pills in real time without page reload.
  4. The "You" badge and disabled self-deactivation button reliably prevent logged-in administrators from locking themselves out.

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Self-Deactivation Account Lockout
* **Symptom:** An authenticated administrator could accidentally click "Deactivate" on their own row in the admin directory, immediately locking themselves out of the system.
* **Root Cause:** The deactivation action did not verify whether the selected row matched the currently authenticated administrator.
* **Fix Applied:** Implemented a self-identity check comparing `target.id === currentUser.id` and email. Added a prominent purple `"You"` tag, disabled the deactivation button in `AdminTable.jsx`, and added a guard in `adminService.deactivateAdmin()`.

### Bug 2: Violation of PRD Minimum Active Admins Rule
* **Symptom:** Admins could be deactivated until only 1 active admin remained, breaking the PRD requirement for two-person invoice verification (`A-10`).
* **Root Cause:** Deactivation logic lacked an active account threshold check.
* **Fix Applied:** Enforced `activeCount <= 2` guard in `adminService.js` that throws a clear error: *"Cannot deactivate: at least 2 active admins must exist for invoice verification"*, and disabled the button in the UI when the threshold is reached.

### Bug 3: Duplicate Record Creation on Rapid Double-Click
* **Symptom:** Rapidly double-clicking the "Save Admin" button created multiple duplicate administrator records.
* **Root Cause:** The submit handler did not disable the submit button during asynchronous creation.
* **Fix Applied:** Added `isSubmitting` state guard disabling the submit button and rendering a loading spinner immediately upon the first click.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Persistent Backend Database Synchronization:**
   * *Limitation:* Accounts are currently managed in the local asynchronous memory store (`adminService.js`) and synchronized with `AuthContext`. Real REST API integration (`GET /api/v1/admins`, `POST /api/v1/admins`, `PATCH /api/v1/admins/:id/status`) will replace the in-memory array once the backend admin management endpoints are online.
2. **Multi-Role Privilege Granularity (Phase 2):**
   * *Limitation:* Phase 1 grants all administrators identical full platform operational permissions. Role-based granular permissions (e.g., `SUPER_ADMIN` vs `OPS_ADMIN`) will be introduced in Phase 2.
3. **Audit Trail Logging on Cloud:**
   * *Limitation:* Deactivation and creation events are captured in client memory; long-term tamper-proof server audit logs are deferred to backend cloud integration.

---

*This document serves as the single source of truth for Admin Onboarding and Administrator Management in the HireD Admin Portal.*
