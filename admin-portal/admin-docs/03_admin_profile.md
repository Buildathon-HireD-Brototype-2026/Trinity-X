# Page 3: Admin Profile & Credentials Management (`A-01`, `A-12`)

**Screen:** Page 3 – Admin Profile & Credentials Management  
**PRD Requirement IDs:** `A-01` (Priority: P0), `A-12` (Priority: P0)  
**Current Status:** Completed, Tested & Running with Mock State Layer  

---

## 1. PRD Requirements & Enterprise Administrator Context

* **PRD Scope (`A-01`, `A-12`):** Admin Profile & Security Authority: Displays administrator identity, contact credentials, and system privileges. Enforces role verification required for Two-Person Invoice Sign-off (`A-10`).
* **Enterprise Operations Context:** Corporate logistics platforms require transparent administrative identity and co-signatory accountability:
  * Full-page canvas access rather than disruptive popup modals, preserving executive workflow continuity.
  * Rapid one-click clipboard copying for sharing contact credentials with drivers and corporate clients.
  * Immediate profile editing capabilities for updating phone numbers, names, and contact emails.
  * Clear display of Two-Person Verification sign-off authority without exposing internal database keys (`ADM-002`).

---

## 2. UI Design Specification (What IS in the App Now)

The Admin Profile screen is implemented in `Trinity-X/admin-portal/src/features/profile/AdminProfilePage.jsx` and styled in `Trinity-X/admin-portal/src/index.css`:

### A. Top Navigation Header & Action Row
* **Back to Dashboard Button (Left):**
  * Key: `profile-back-btn`
  * Icon: `<ArrowLeft>` in primary brand purple.
  * Label: `"Back to Dashboard"`.
  * Action: Returns smoothly to `Dashboard Overview` without page reload or state loss.
* **Edit Profile Action Button (Right):**
  * Key: `profile-edit-btn`
  * Solid brand purple container (`#6A379F`) with `<Edit3>` icon and text `"Edit Profile"`.
  * In Edit Mode, transforms into a subtle outline button with `<X>` icon and label `"Cancel"`.
* **Title & Subtitle:**
  * Title: 24px bold (`FontWeight.w700`) `"Admin Profile"`.
  * Subtitle: 14px muted text `"Administrator identity, contact credentials, and system verification privileges."`

### B. Success Feedback Banner
* Dynamic emerald alert container (`rgba(16, 185, 129, 0.12)`) appearing upon saving changes.
* Icon: `<CheckCircle2>` in emerald green.
* Text: `"Profile credentials updated successfully."`
* Auto-dismisses after 3.5 seconds.

### C. Hero Identity Banner (View Mode)
* **Administrator Avatar:**
  * 60x60px circular container with rich purple gradient (`#6A379F` to `#8A4BC7`).
  * Initial Letter: Bold white initial `"N"` (for Neha Sharma).
  * Online Status Indicator: 14px emerald green dot (`#10B981`) with 2.5px border indicating active platform administrator status.
* **Administrator Name & Role Row:**
  * Admin Name: 20px bold heading (`Neha Sharma` or active admin user).
  * Role Pill Badge: High-contrast purple pill container displaying `<ShieldCheck>` icon and uppercase role `"ADMIN"`.
  * Internal ID Exclusion: The database identifier `ADM-002` is strictly removed from display per domain privacy guidelines.
* **Primary Email Subtitle:** Muted 13px medium email text (`admin2@hired.com`).

### D. Three-Column Credentials Grid (View Mode)
* **1. Admin Name Card:**
  * Icon: 42x42px purple tint container with `<User>` icon.
  * Label: Uppercase bold title `"ADMIN NAME"`.
  * Value: High-contrast text displaying administrator's full name.
* **2. Contact Phone Number Card:**
  * Icon: 42x42px purple tint container with `<Phone>` icon.
  * Label: Uppercase bold title `"PHONE NUMBER"`.
  * Value: Formatted international contact number (`+91 98765 43210`).
  * One-Click Copy Action: Trailing `<Copy>` icon copying number to clipboard with a 2-second green confirmation tag (`Copied`).
* **3. Email ID Card:**
  * Icon: 42x42px purple tint container with `<Mail>` icon.
  * Label: Uppercase bold title `"EMAIL ID"`.
  * Value: Formatted corporate email address (`admin2@hired.com`).
  * One-Click Copy Action: Trailing `<Copy>` icon with instant green confirmation tag (`Copied`).

### E. Security & Verification Authority Card (View Mode)
* **Card Header:** Section title `"Security & Verification Authority"` with `<KeyRound>` icon.
* **Sign-off Privileges:**
  * *Two-Person Verification Sign-off:* Green checkmark icon confirming authority to perform mandatory co-administrator sign-off for corporate month-end statements (PRD `A-10`).
  * *Full Platform Operations:* Authority for order acceptance, driver assignment, trip tracking, and reports.

### F. Interactive Profile Edit Mode (Form Card)
Triggered upon clicking the `"Edit Profile"` button:
* **Header:** Icon badge with `<Edit3>`, title `"Edit Administrator Profile"`, and instructional subtitle.
* **Form Inputs Grid:**
  * *Admin Name Input:* Full name field enforcing minimum 2 characters.
  * *Phone Number Input:* Contact field enforcing valid phone formatting (minimum 10 digits).
  * *Email ID Input:* Email field enforcing strict standard email format regex.
* **Field Validation States:** Red outline borders and inline warning labels (`<AlertCircle>`) appear below any invalid fields.
* **Form Action Buttons:**
  * `"Cancel"` button: Discards unsaved changes and returns to read-only view.
  * `"Save Changes"` button: Validates inputs, saves to `AuthContext` and `localStorage`, updates topbar and sidebar in real time, and renders the success banner.

---

## 3. Current State: UI with Local State Layer

> [!NOTE]
> The Profile screen connects directly to `AuthContext.jsx`:
> - Administrator identity is loaded reactively via the `useAuth()` hook.
> - Modifications persist immediately to `localStorage` (`hired_admin_user`), ensuring updates survive browser refreshes.
> - The executive topbar name and the sidebar user card automatically sync with updated credentials in real time without page reload.
> - Clipboard copy operations feature automatic degradation to `document.execCommand('copy')` if modern clipboard APIs are restricted.

---

## 4. Testing & Verification

### A. Automated Component & State Scenarios

Verified across test scenarios documented in the matrix below:

| Test ID | Test Scenario | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **TC-PROF-HP-01** | Open Profile from topbar identity pill | Clicks topbar admin profile; asserts full-page canvas render | `[✓ Passed]` |
| **TC-PROF-HP-02** | Open Profile from sidebar footer user card | Clicks sidebar card; asserts view transition and active card highlight | `[✓ Passed]` |
| **TC-PROF-HP-03** | Profile fields accurately display Name, Phone, Email, and Role | Inspects DOM; asserts all 4 credentials match session data | `[✓ Passed]` |
| **TC-PROF-HP-04** | Clipboard copy triggers on Phone and Email with confirmation tag | Clicks copy button; asserts clipboard write and `Copied` badge | `[✓ Passed]` |
| **TC-PROF-HP-05** | Return to Dashboard via Back button restores overview | Clicks Back button; asserts return to Dashboard without state loss | `[✓ Passed]` |
| **TC-PROF-HP-06** | "Edit Profile" button toggles interactive form mode | Clicks Edit Profile; asserts edit form card renders with pre-filled inputs | `[✓ Passed]` |
| **TC-PROF-HP-07** | Saving valid credentials updates state, storage, and topbar/sidebar | Submits modified credentials; asserts `localStorage` and topbar sync | `[✓ Passed]` |
| **TC-PROF-HP-08** | "Cancel" button discards edits and restores read-only mode | Modifies inputs and clicks Cancel; asserts original values restored | `[✓ Passed]` |
| **TC-PROF-VAL-01** | Safe fallback for legacy sessions missing phone property | Mocks user without phone; asserts fallback `+91 98765 43210` rendered | `[✓ Passed]` |
| **TC-PROF-VAL-04** | Input validation blocks blank name, invalid email, and short phone | Submits invalid fields; asserts red inline error labels | `[✓ Passed]` |
| **TC-PROF-SEC-01** | Internal database identifier ADM-002 strictly excluded from UI | Searches DOM; asserts text `ADM-002` is completely absent | `[✓ Passed]` |
| **TC-PROF-UI-01** | Dark / Light theme toggle maintains high contrast across all cards | Toggles theme; asserts background, card, and text tokens adapt | `[✓ Passed]` |
| **TC-PROF-UI-02** | Profile navigation triggers reliably from 68px collapsed mini rail | Collapses sidebar; clicks bottom avatar; asserts profile route | `[✓ Passed]` |

### B. Manual Viewport & Browser Testing

* **Environments:** Google Chrome, Desktop (1920x945), Tablet (768px), and Mobile (375px).
* **Inspection Results:**
  1. Profile page loads smoothly into the main canvas layout matching Orders Inbox and Driver Onboarding.
  2. Copy buttons provide instant tactile feedback without page jumps.
  3. Editing administrator credentials immediately updates the topbar and sidebar in real time.
  4. On mobile screens (375px), 3-column credential cards collapse cleanly into a 1-column stack with zero horizontal overflow.

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Disruptive Modal Overlay Experience
* **Symptom:** Admin profile originally opened as a popup modal, which disrupted multi-tasking and felt inconsistent with module page navigation.
* **Root Cause:** Initial implementation used a modal overlay.
* **Fix Applied:** Re-architected `AdminProfilePage.jsx` into a dedicated full-page view inside `<main className="admin-page-content">` matching Orders Inbox and Driver Onboarding.

### Bug 2: Accidental Exposure of Database Identifier ADM-002
* **Symptom:** Profile hero originally displayed the internal database key `ADM-002`.
* **Fix Applied:** Strictly removed `ADM-002` from all user-facing views and badges, displaying only public role credentials (`ADMIN`).

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Avatar Image Cloud Storage:**
   * *Limitation:* Administrator avatar currently renders a dynamic gradient circle with initials; custom photo upload to cloud S3 storage is slated for Phase 2 backend integration.
2. **Multi-Factor Authentication (MFA / 2FA) Setup:**
   * *Limitation:* Two-factor authentication (SMS/TOTP) self-service enrollment will be connected once the enterprise IAM backend is online.
