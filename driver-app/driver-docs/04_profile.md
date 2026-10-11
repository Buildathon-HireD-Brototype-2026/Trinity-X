# Page 12: Driver Profile & Operations (`D-12`, `D-02`, `D-11`)

**Screen:** Page 12 – Driver Profile & Operations  
**PRD Requirement IDs:** `D-12` (Priority: P0), `D-02` (Priority: P0), `D-11` (Priority: P2)  
**Current Status:** Completed, Tested & Running with Mock State Layer  

---

## 1. PRD Requirements & Chauffeur Domain Context

* **PRD Scope (`D-12`):** Driver Profile: Displays chauffeur identity, contact details, operational zone, and administrative shortcuts.
* **PRD Scope (`D-02`, `D-11`):** Document Shortcut: Provides direct navigation to the KYC Documents screen with a live verification badge.
* **B2B Mobility Context:** HireD chauffeurs operate corporate fleet vehicles assigned to enterprise accounts. Drivers need instant access to their compliance status, operational dispatch zone, work leave requests, and visual theme comfort across shift hours (bright day vs dark night).

---

## 2. UI Design Specification (What IS in the App Now)

The Profile screen is implemented in `Trinity-X/driver-app/lib/features/profile/presentation/profile_screen.dart` adhering strictly to HireD's Material 3 corporate design system:

### A. Top App Bar Controls
* **Side Menu Drawer Button (Left):** 26dp `Icons.menu_rounded` icon triggering the floating frosted glass taskbar.
* **Dark / Light Mode Theme Toggle (Right):**
  * Key: `Key('theme_mode_toggle_button')`
  * Circular 38x38dp elevated container with border and drop shadow.
  * Toggles between `Icons.dark_mode_outlined` (moon) and `Icons.light_mode_outlined` (sun).
  * Immediately switches app-wide themes via Riverpod `themeModeProvider`.

### B. Driver Profile Card (Elevation & Visual Tokens)
* **Chauffeur Avatar:**
  * 86x86dp circular container with 3.5dp solid purple accent border (`#6A379F`).
  * Fallback initial letter ("R") in bold white on primary purple background if photo fails.
* **Driver Name:** 22sp bold (`FontWeight.w700`) high-contrast text (`Rajesh Kumar`).
* **HireD Partner Status Pill:**
  * Background: Subtle purple tint (`#F3EDF9`).
  * Text: 12sp semi-bold purple accent (`#6A379F`) displaying `"HireD Partner"`.
* **Partner ID Subtitle:** 13sp medium text (`ID: #HD-00101 • Active Partner`).
* **Horizontal Divider:** Clean 1dp boundary separating identity from contact tiles.
* **Two-Column Contact & Operational Zone Row:**
  * **Contact Tile (Left):** 42x42dp purple tint container with phone icon (`Icons.phone_rounded`), label `"Contact"`, and driver mobile number (`+91 98765 43210`).
  * **Vertical Divider (Center):** 40dp height divider.
  * **Zone Tile (Right):** 42x42dp purple tint container with location pin (`Icons.location_on_rounded`), label `"Zone"`, and dispatch hub name (`Electronic City, BLR`).

### C. OPERATIONS Card
* **Section Header:** 13sp bold uppercase title `"OPERATIONS"` with 0.5 letter-spacing.
* **Apply for Leave Row:**
  * Icon: 44x44dp purple container with flight takeoff icon (`Icons.flight_takeoff_rounded`).
  * Title: 15sp semi-bold `"Apply for Leave"`.
  * Trailing: Chevron right icon.
* **Documents Compliance Row:**
  * Icon: 44x44dp purple container with document icon (`Icons.description_rounded`).
  * Title: 15sp semi-bold `"Documents"`.
  * **Live Reactive Badge:**
    * If incomplete: Amber badge (`0/4 Uploaded` up to `3/4 Uploaded`).
    * If all uploaded: Emerald green badge (`Verified`).
  * Navigation: Tapping navigates directly to `/documents` (`RouteNames.documents`).

### D. Side Taskbar Drawer (60% Frosted Glass Panel)
* **Width:** Compact 60% of device screen width (`MediaQuery.of(context).size.width * 0.60`).
* **Frosted Glass Styling:**
  * `ClipRRect` with 28dp right border radius.
  * `BackdropFilter` with 20px blur (`sigmaX: 20, sigmaY: 20`).
  * Semi-transparent gradient background (`0xF6FFFFFF` to `0xF2F6EDFD` in light mode; `0xF21E293B` in dark mode).
* **Navigation Items:**
  1. *My Trips* (`Icons.directions_car_rounded`)
  2. *Earnings & Wallet* (`Icons.account_balance_wallet_rounded`)
  3. *My Documents* (`Icons.description_rounded` → navigates to `/documents`)
  4. *Support & Help* (`Icons.headset_mic_rounded`)
* **Bottom-Left Logout Button:**
  * Positioned at the bottom-left of the drawer.
  * 19dp power icon (`Icons.power_settings_new_rounded`) with `"Logout"` label.
  * Action: Clears JWT session tokens via `authControllerProvider.notifier.logout()` and redirects to `/login`.

### E. Persistent Bottom Navigation Bar
* 3 primary tabs: **Home**, **Trips**, and **Wallet**.

---

## 3. Current State: UI with Local State Layer

> [!NOTE]
> The Profile screen is connected to local Riverpod state providers:
> - Driver identity is loaded reactively via `driverProfileProvider`.
> - Document badge syncs reactively with `driverDocumentsProvider` local cache.
> - Theme mode persists across hot reloads and app sessions via `themeModeProvider`.
> - Logout securely clears device-stored session tokens from `FlutterSecureStorage`.

---

## 4. Testing & Verification

### A. Automated Widget & Unit Tests

The Profile screen is verified with automated tests covering layout, reactivity, theme toggling, and drawer interaction:

| Test ID | Test Scenario | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **TC-P12-01** | Profile card correctly renders driver avatar, name, partner ID, phone, and operational zone | Checks presence of text widgets and avatar container | `[✓ Passed]` |
| **TC-P12-02** | Operations card displays Documents row with live reactive badge (`0/4 Uploaded` or `Verified`) | Observes `driverDocumentsProvider` state transitions | `[✓ Passed]` |
| **TC-P12-03** | Tapping Documents row triggers navigation to `/documents` | Verifies `GoRouter` route transition to `/documents` | `[✓ Passed]` |
| **TC-P12-04** | Theme toggle button switches app theme between light and dark instantly | Taps `Key('theme_mode_toggle_button')` and asserts `themeModeProvider` | `[✓ Passed]` |
| **TC-P12-05** | Top-left 3-bar menu icon opens the 60% frosted glass side drawer | Verifies `_scaffoldKey.currentState?.isDrawerOpen == true` | `[✓ Passed]` |
| **TC-P12-06** | Drawer logout button clears session tokens and redirects driver to `/login` | Triggers logout action and asserts `AuthStatus.unauthenticated` | `[✓ Passed]` |

### B. Manual Physical Device Testing (Android 15)

* **Device:** Physical Android 15 device (`10BDAY0Y1D000DT`).
* **Inspection Results:**
  1. Profile card renders cleanly with high contrast under sunlight and low light.
  2. Frosted glass drawer opens smoothly with hardware acceleration (no frame drops).
  3. Dark mode theme switch instantly updates background, cards, text colors, and drawer without flickering.
  4. Documents badge updates immediately from `0/4 Uploaded` to `1/4 Uploaded` upon capturing a photo in the Documents screen.

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Document Upload Badge Not Updating Immediately
* **Symptom:** Uploading a document in Documents screen and returning to Profile kept showing the old count until app restart.
* **Fix Applied:** Connected `profile_screen.dart` to directly observe `driverDocumentsProvider`, ensuring instant badge updates upon popping back.

### Bug 2: Dark Mode Contrast Glitches
* **Symptom:** Certain text elements and dividers became unreadable when switching between Light and Dark themes.
* **Fix Applied:** Replaced hardcoded color values with semantic `context.appColors` (`AppThemeColors`).

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Avatar Image Cloud Sync:**
   * *Limitation:* Driver avatar currently renders from local session data or network image asset; remote camera upload to cloud S3 bucket is pending backend profile API.
2. **Zone Reassignment While Offline:**
   * *Limitation:* If an admin reassigns a driver to a different dispatch zone in the web portal while the driver is offline, the update will reflect once the app reconnects to the network and refreshes.
