# Page 4: Home Dashboard & Duty Management (`D-03`, `D-04`)

**Screen:** Page 4 – Home Dashboard  
**PRD Requirement IDs:** `D-03` (Priority: P1), `D-04` (Priority: P0)  
**Current Status:** Completed, Tested & Running with Mock State Layer  

---

## 1. PRD Requirements & Objectives

* **PRD Scope (`D-03`):** Availability Management: (a) real-time online/offline duty toggle; (b) calendar availability marking.
* **PRD Scope (`D-04`):** Trip List: Shows assigned corporate trips to this driver with immediate access to trip details.
* **Chauffeur Domain Context:** The Home Dashboard is the chauffeur's central shift command center. In varying outdoor glare and vehicle environments, the driver needs:
  * Instant visual confirmation of duty state (`Now online` in green vs `Offline` in slate).
  * High-visibility shift milestone tracking (Today's Roster 4-step stepper).
  * Direct one-tap resolution of missing KYC compliance documents.
  * Clear assigned trip pickup coordinates and route map preview.

---

## 2. UI Design Specification (What IS in the App Now)

The Home Dashboard is implemented in `Trinity-X/driver-app/lib/features/home/presentation/home_dashboard_screen.dart`:

### A. Top Header & Duty Control Row
* **Driver Avatar Button (Left):**
  * Key: `Key('driver_profile_avatar_button')`
  * 52x52dp circular avatar with 2dp purple accent border (`#6A379F`).
  * Tapping navigates directly to the Driver Profile screen (`/profile`).
* **Partner Badge & Driver Name:**
  * Official pill badge: `"HireD Partner"` in purple tint container (`#F3EDF9`).
  * Driver Name: 20sp bold text (`FontWeight.w700`).
* **Duty Toggle Pill Button (Right):**
  * Key: `Key('duty_status_switch')`
  * **Online State:** Emerald green background (`#10B981`) with power icon and label `[ ⏻ Now online ]`.
  * **Offline State:** Slate gray background (`#64748B`) with power icon and label `[ ⏻ Offline ]`.
  * Tapping while Online opens the "Go Offline" confirmation dialog.
  * Tapping while Offline instantly switches duty to Online.

### B. KYC Verification Pending Action Banner
* Displayed dynamically if any of the 4 mandatory KYC documents are incomplete (`!docsState.isAllUploaded`).
* Amber warning container with warning icon (`Icons.warning_amber_rounded`).
* Title: `"Action Required: Upload KYC (X/4)"`.
* Subtitle: `"Submit your 4 documents to activate your account and start receiving trips."`
* Action: Amber `"Upload"` button with right arrow navigating directly to `/documents`.

### C. Today's Roster Card (4-Step Progress Stepper)
* Card container with subtle border and elevation shadow.
* Section Title: 13sp bold `"TODAY'S ROSTER"`.
* **Stepper Timeline Row:**
  * 4 circular step nodes connected by progress lines:
    1. **Assigned** (`10:00 AM`) — Active solid purple node.
    2. **Spot Reached** (`10:20 AM`) — Active solid purple node.
    3. **In Journey** (`10:32 AM`) — Pending outlined node with dashed line.
    4. **Reached Place** (`10:50 AM Est.`) — Pending outlined node.
* Gives the driver an instant, at-a-glance view of their active shift timeline.

### D. Assigned Trip Card
* Key: `Key('assigned_card_${tripId}')`
* Header Row:
  * Trip Icon: Navigation arrow in purple/blue tint.
  * Title & ID: `"Assigned Trip"` with subtitle `#TRP-001`.
  * Status Chip: Pill chip displaying `ASSIGNED` or `IN JOURNEY`.
  * Swap Button (`Icons.swap_horiz_rounded`): Key `Key('swap_assigned_trip_button')`, visible when multiple assigned trips exist to toggle between them.
* Trip Details:
  * Vehicle pickup spot location name with pin icon.
  * Scheduled pickup time.
  * Time required to reach vehicle pickup spot.

### E. Map Preview Card
* Top bar with pickup spot name and time.
* Custom painted canvas (`_PlainMapPlaceholderPainter`) rendering route preview line and vehicle marker pin.
* High-contrast styling with dark/light mode adaptive map canvas.
* "View Map" overlay chip.

### F. Persistent Bottom Navigation Bar
* 5 tabs: **Home**, **Trips**, **Availability**, **Wallet**, and **Profile**.

---

## 3. Current State: UI with Local State Layer

> [!NOTE]
> The Home Dashboard operates with local Riverpod state providers:
> - Duty status is managed via `driverProfileProvider` and persisted to `SharedPreferences` (`driver_duty_status_${driverId}`).
> - Assigned trips are populated from local mock datasets (`assignedTripsProvider`, `selectedTripProvider`).
> - KYC warning banner syncs reactively with `driverDocumentsProvider` cache.

---

## 4. Testing & Verification

### A. Automated Widget & Unit Tests

The Home Dashboard is verified via automated widget tests covering duty toggles, trip displays, and KYC banners:

| Test ID | Test Scenario | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **TC-P04-01** | Duty toggle button switches status between Online (Green) and Offline (Slate) | Taps `Key('duty_status_switch')` and asserts state change | `[✓ Passed]` |
| **TC-P04-02** | Upcoming trip card highlights pickup time, location, and trip ID when trip is assigned | Asserts presence of `assigned_card_` container | `[✓ Passed]` |
| **TC-P04-03** | When 2 trips exist, swap button switches between assigned trips | Taps `Key('swap_assigned_trip_button')` and verifies active trip ID | `[✓ Passed]` |
| **TC-P04-04** | Tapping driver avatar in top header navigates to the Profile screen | Taps `Key('driver_profile_avatar_button')` and verifies route `/profile` | `[✓ Passed]` |
| **TC-P04-05** | KYC warning banner appears when documents are incomplete and disappears when all 4 are uploaded | Observes banner visibility against `driverDocumentsProvider` | `[✓ Passed]` |
| **TC-P04-06** | Duty status persists across app kills and restarts | Verifies `SharedPreferences` duty key restore on startup | `[✓ Passed]` |

### B. Manual Physical Device Testing (Android 15)

* **Device:** Physical Android 15 device (`10BDAY0Y1D000DT`).
* **Inspection Results:**
  1. Duty pill button provides instantaneous visual feedback upon tap.
  2. "Go Offline" confirmation dialog displays properly with dark backdrop blur.
  3. Today's Roster stepper is crisp and legible under variable lighting.
  4. App kill via Android Recent Apps maintains the driver's Online status when reopened.

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Duty Status Reverting to Offline After App Kill
* **Symptom:** When a driver toggled duty to "Now Online" and removed the app from Android Recent Apps, reopening the app showed them as "Offline".
* **Root Cause:** In-memory mock database re-instantiated on Dart VM restart with default in-memory values.
* **Fix Applied:** Saved duty status directly in `SharedPreferences` (`driver_duty_status_${driverId}`) and read it during initial cache hydration on app startup.

### Bug 2: Accidental Duty Disconnection Mid-Trip
* **Symptom:** Driver could accidentally disconnect duty while transporting a corporate passenger.
* **Fix Applied:** Added the "Offline after Drop" toggle dialog, preventing immediate GPS disconnection during active trips.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Background GPS Battery Optimization:**
   * *Limitation:* When the driver is Online and the app is minimized, aggressive Android OS battery optimization (Doze mode) may throttle location updates unless running with an Android Foreground Service notification.
2. **WebSocket / Push Notification Fallback:**
   * *Limitation:* Real-time trip assignments currently rely on Riverpod state listeners; live Firebase Cloud Messaging (FCM) background dispatch push notifications will be linked upon backend service release.
