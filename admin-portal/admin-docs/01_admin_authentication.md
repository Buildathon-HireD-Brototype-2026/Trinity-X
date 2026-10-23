# Page 1: Admin Login (`A-01`)

**Screen:** Page 1 – Admin Login  
**PRD Requirement ID:** `A-01` (Priority: P0)  
**Current Status:** Completed, Tested & Running with Mock Auth Layer  

---

## 1. PRD Requirements & Enterprise Administrator Context

* **PRD Scope (`A-01`):** Admin Login: Admin logs in with secure email and password. Hardware-backed secure session storage on web client with role-based dashboard redirection.
* **Administrator Domain Context:** Corporate mobility dispatchers operate under fast-paced desk environments monitoring real-time logistics. They require:
  * High-contrast, clean typography to prevent visual fatigue during long dispatch shifts.
  * Instant auto-session retention across browser tabs without repeated sign-ins throughout the work day.
  * Clear validation error messages and supportive banners if an admin account is deactivated or credentials fail.
  * Fast keyboard submission (`Enter` key) for rapid navigation.

---

## 2. UI Design Specification (What IS in the App Now)

The Admin Login screen is implemented in `Trinity-X/admin-portal/src/features/auth/LoginPage.jsx` and styled in `Trinity-X/admin-portal/src/index.css`:

### A. Branding & Header
* **Brand Logo:** HireD corporate logo vector graphic rendered via `logo.svg` (`login-logo`).
* **Title:** Bold heading displaying `"Admin Portal"`.
* **Subtitle:** 14px medium text `"Sign in to manage the HireD fleet and operations"`.
* **Card Container:** Centered elevated card (`440px` max-width) with subtle border (`1px solid var(--border)`), 18px border radius, and smooth drop shadow.

### B. Form Inputs
* **Administrator Email Input:**
  * Label: `"Admin Email"`.
  * Prefix Icon: `<Mail>` icon in muted gray (`#94A3B8`).
  * Auto-trimming: Removes inadvertent leading/trailing whitespace automatically before evaluation.
  * Validation: Format validation enforcing standard email structure (`user@domain.tld`).
  * Placeholder: `"admin@hired.com"`.
  * Inline Error: Displays `"Email address is required."` or `"Please enter a valid email address."` below the field.
* **Password Field:**
  * Label: `"Password"`.
  * Prefix Icon: `<Lock>` icon.
  * Obscured text input field by default (`type="password"`).
  * Interactive trailing eye toggle button (`<Eye>` / `<EyeOff>`) allowing quick visual typo inspection.
  * Inline Error: Displays `"Password is required."` below the field on empty submission.
  * Keyboard Submission: Pressing `Enter` in the password field submits the form instantly.

### C. Feedback Banners & State Messages
* **Global Error Banner:** High-visibility crimson alert box (`<AlertCircle>`) displaying authentication failures:
  * Invalid credentials: `"Invalid email or password. Please try again."`
  * Deactivated account: `"Your account is deactivated. Please contact support."`
  * Network offline: `"Unable to connect to server. Please check your connection."`
  * Account lockout: `"Too many failed attempts. Please try again in 15 minutes."`
* **Anti-Spam Debounce Guard:** Form disables during submission with an animated loading spinner (`<Loader2>`) to prevent duplicate clicks.

### D. Submit Button
* Height: **46px** touch target designed for desktop and tablet precision.
* Background: Brand purple accent (`#6A379F`) with smooth hover transition.
* Text: `"Sign In to Dashboard"` in bold white text.
* Loading state: Displays animated `<Loader2>` spinner with label `"Signing In..."`.

### E. Demo Account Quick-Fill Chips
* Placed below the form in `.test-credentials-box`:
  * Label: `"Demo Credentials:"`
  * Interactive Chip 1: `"admin1@hired.com"` — Fills `admin1@hired.com` and `Password@123`.
  * Interactive Chip 2: `"admin2@hired.com"` — Fills `admin2@hired.com` and `Password@123`.
  * Clicking automatically populates the form and clears any existing validation errors.

---

## 3. Current State: UI with Local State Layer

> [!NOTE]
> The Login feature runs with local session state managed by `AuthContext.jsx`:
> - Validated against seeded administrator test accounts:
>   * `admin1@hired.com` / `Password@123` (Active Admin: Admin One, Phone: `+91 98450 11223`)
>   * `admin2@hired.com` / `Password@123` (Active Admin: Neha Sharma, Phone: `+91 98765 43210`)
>   * `inactive@hired.com` / `Password@123` (Inactive Admin: Inactive Admin, Status: `INACTIVE`)
> - Real session persistence via `localStorage` (`hired_admin_user`) storing user profile, token, and role.
> - Instant route guard in `App.jsx` automatically rendering `<AdminShell />` when authenticated and `<LoginPage />` when unauthenticated.

---

## 4. Testing & Verification

### A. Automated Component & State Scenarios

Verified across test scenarios documented in the matrix below:

| Test ID | Test Scenario | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **TC-AUTH-HP-01** | Happy path login with email and password stores token and routes to Dashboard | Enters valid credentials; asserts `hired_admin_user` in localStorage and redirect | `[✓ Passed]` |
| **TC-AUTH-HP-02** | Keyboard submission via Enter key triggers authentication | Presses Enter in password field; asserts form submission | `[✓ Passed]` |
| **TC-AUTH-HP-03** | Password visibility toggle switches between masked and plain text | Clicks eye toggle icon; asserts `type="text"` switch | `[✓ Passed]` |
| **TC-AUTH-HP-04** | Session persistence keeps user logged in on browser refresh | Refreshes browser (`F5`); asserts active session retained | `[✓ Passed]` |
| **TC-AUTH-VAL-01** | Blank fields submission blocks API and renders inline errors | Submits empty form; asserts inline error labels | `[✓ Passed]` |
| **TC-AUTH-VAL-04** | Invalid email format displays validation warning | Enters `admin@`; asserts format warning message | `[✓ Passed]` |
| **TC-AUTH-VAL-05** | Leading/trailing whitespace in email trimmed automatically | Enters `  admin2@hired.com  `; asserts clean authentication | `[✓ Passed]` |
| **TC-AUTH-ERR-01** | Incorrect password displays generic credentials failure banner | Enters wrong password; asserts error banner visibility | `[✓ Passed]` |
| **TC-AUTH-ERR-03** | Deactivated admin account displays suspended account guidance | Logs in as `inactive@hired.com`; asserts deactivated alert | `[✓ Passed]` |
| **TC-AUTH-NET-01** | Double-click prevention blocks duplicate submissions | Clicks submit rapidly twice; asserts loading lock disables button | `[✓ Passed]` |

### B. Manual Viewport & Browser Testing

* **Environments:** Google Chrome, Desktop (1920x945), Tablet (768px), and Mobile (375px).
* **Inspection Results:**
  1. Login card centers symmetrically with responsive padding across desktop and mobile screens.
  2. Input fields maintain high visual contrast in both Light and Dark themes.
  3. Autofill demo credential chips render cleanly and fill inputs instantly on click.
  4. Successful authentication transitions immediately into the executive dashboard without layout shifts.

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Email Whitespace Authentication Failure
* **Symptom:** Copy-pasting admin emails with trailing spaces caused credential lookup failures.
* **Root Cause:** Raw string comparisons were performed without string trimming.
* **Fix Applied:** Added `.trim().toLowerCase()` sanitization inside `LoginPage.jsx` and `AuthContext.jsx` prior to authentication check.

### Bug 2: Double-Click Race Condition on Form Submission
* **Symptom:** Rapidly clicking the "Sign In" button could initiate duplicate async state updates.
* **Fix Applied:** Implemented `loading` state guard disabling the submit button and rendering a loading spinner upon first click.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Multi-Tab Session Desynchronization:**
   * *Limitation:* If an admin signs out in Tab A, Tab B retains active in-memory state until the next user action or route transition verifies `localStorage`.
2. **Server-Side Brute-Force Rate Limiting:**
   * *Limitation:* Client-side loading lock and failed attempts tracking guard against local rapid clicks, but IP-level rate limiting requires the backend API gateway once live REST services are connected.
