# Page 1: Driver Login (`D-01`)

**Screen:** Page 1 – Driver Login  
**PRD Requirement ID:** `D-01` (Priority: P0)  
**Current Status:** Completed, Tested & Running with Mock Auth Layer  

---

## 1. PRD Requirements & Chauffeur Domain Context

* **PRD Scope (`D-01`):** Driver Login: Driver logs in with 10-digit mobile number and password. Hardware-backed secure session storage on device.
* **Driver Domain Context:** Chauffeurs start shifts early in parked vehicles under harsh sunlight or dim dawn light. They require:
  * High-contrast inputs and large touch targets (52dp).
  * Auto-session login on launch without hunting for passwords every time.
  * Clear validation error messages and supportive banners if their account is awaiting admin approval.

---

## 2. UI Design Specification (What IS in the App Now)

The Login screen is implemented in `Trinity-X/driver-app/lib/features/auth/presentation/login_screen.dart`:

### A. Branding & Header
* HireD signature brand logo SVG container with rounded icon backdrop.
* Title: 24sp bold (`FontWeight.w700`) `"Welcome Back"`.
* Subtitle: 14sp medium `"Sign in to your driver account to continue"`.

### B. Form Inputs
* **10-Digit Numeric Phone Input:**
  * Auto-restricted strictly to digits (`FilteringTextInputFormatter.digitsOnly`).
  * Fixed `+91` country code prefix badge with divider.
  * Input length capped to exactly 10 digits (`LengthLimitingTextInputFormatter(10)`).
* **Password Field:**
  * Obscured text input field with lock icon prefix.
  * Interactive trailing eye icon (`Icons.visibility_rounded` / `Icons.visibility_off_rounded`) for toggling password visibility.

### C. Feedback Banners & State Messages
* **Validation Errors:** Red error banner appears dynamically above the submit button on empty inputs or invalid credentials.
* **Pending / Inactive Guidance Banner:**
  * If the driver's account is awaiting approval (`status == 'PENDING'`), a friendly amber informational banner appears: *"Your account is awaiting admin activation. Please contact dispatch support."*
* **Anti-Spam Debounce Guard:** 1200ms submission debounce to guard against duplicate button presses.

### D. Ergonomic Submit Button
* Height: **52dp** touch target designed for one-hand operation.
* Background: Brand purple accent (`#6A379F`).
* Text: `"Sign In"` in 16sp bold white text.
* Loading state: Renders circular progress indicator while authentication resolves.

---

## 3. Current State: UI with Local State Layer

> [!NOTE]
> The Login feature runs with local session state:
> - Validated against `MockAuthRepository` with pre-configured driver test accounts:
>   * `9876543210` / `Driver@123` (Active Driver: Rajesh Kumar)
>   * `9876543211` / `Driver@123` (Pending Driver: Suresh Patel)
>   * `9876543212` / `Driver@123` (Inactive Driver: Vikram Singh)
> - Real hardware-backed token persistence via `FlutterSecureStorage` (AES encrypted).
> - Instant auto-login splash routing bypassing the login form on cold reboot.

---

## 4. Testing & Verification

### A. Automated Unit & Widget Tests

Verified in `test/features/auth/login_screen_test.dart` and `test/widget_test.dart`:

| Test ID | Test Scenario | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **TC-P01-01** | Splash auto-login restores valid secure storage session directly to Home | Mocks valid secure storage token; verifies route `/home` | `[✓ Passed]` |
| **TC-P01-02** | Happy path login with phone and password saves tokens and navigates to Home | Enters phone + password; asserts token storage and route transition | `[✓ Passed]` |
| **TC-P01-03** | Phone validation triggers for numbers not matching 10 digits | Enters 7-digit phone; asserts inline validation error | `[✓ Passed]` |
| **TC-P01-04** | Invalid credentials displays clear error banner | Enters incorrect password; asserts error banner visibility | `[✓ Passed]` |
| **TC-P01-05** | Rapid multi-click debounce guards against duplicate concurrent submissions | Double-taps submit within 200ms; asserts single controller invocation | `[✓ Passed]` |
| **TC-P01-06** | Inactive or pending driver displays supportive guidance banner | Logs in with pending phone; asserts amber guidance banner | `[✓ Passed]` |
| **TC-P01-07** | Password visibility icon toggles between obscured and plain text | Taps visibility eye icon; asserts `obscureText == false` | `[✓ Passed]` |

### B. Manual Physical Device Testing (Android 15)

* **Device:** Physical Android 15 device (`10BDAY0Y1D000DT`).
* **Inspection Results:**
  1. Phone input automatically opens the numeric keypad.
  2. Password reveal toggle allows easy typo verification.
  3. 52dp button provides smooth touch response without accidental double-submits.
  4. Cold boot with saved tokens transitions smoothly from Splash to Home with zero visual flicker.

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Splash Screen Loading Flicker on Cold Boot
* **Symptom:** Opening the app caused a brief 1-frame visual flash of the login screen before routing to the Home dashboard.
* **Root Cause:** Asynchronous secure storage read was returning after the first frame rendered.
* **Fix Applied:** Configured GoRouter redirect to hold on `SplashScreen` while `AuthStatus.unknown` is resolving, transitioning directly to Home once authenticated.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Offline Token Expiry & Admin Revocation:**
   * *Limitation:* When the device has no internet connection, the app relies on cached local credentials. If a driver is deactivated by Admin in the web portal while offline, the local app will update once network connectivity restores and the token refresh / sync call executes.
2. **Server-Side Gateway Rate Limiting:**
   * *Limitation:* In-memory client debounce (1200ms) prevents local rapid clicking, but true brute-force defense relies on the backend API gateway rate limiter once live endpoints are connected.
