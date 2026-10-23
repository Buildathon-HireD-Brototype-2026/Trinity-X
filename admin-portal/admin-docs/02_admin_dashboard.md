# Page 2: Executive Dashboard & Operational Overview (`A-13`)

**Screen:** Page 2 – Executive Dashboard & Overview  
**PRD Requirement ID:** `A-13` (Priority: P0)  
**Current Status:** Completed, Tested & Running with Mock State Layer  

---

## 1. PRD Requirements & Dispatcher Domain Context

* **PRD Scope (`A-13`):** Operational Overview: Provides a unified executive dashboard displaying incoming transport orders, active vehicle trips, available drivers, and pending invoice verifications.
* **Administrator Domain Context:** Platform dispatchers and operations managers oversee fleet movements across multiple corporate clients. They require:
  * Immediate visibility into mission-critical bottlenecks (trips needing driver assignment, month-end statements awaiting two-person sign-off).
  * Rapid navigation shortcuts to primary operational modules (Orders Inbox, Ongoing Trips, Invoices).
  * Collapsible sidebar rail maximizing workspace area on compact dispatcher screens.
  * Instant theme switching for shift comfort across 24/7 day and night desk rotations.

---

## 2. UI Design Specification (What IS in the App Now)

The Executive Dashboard is implemented across `Trinity-X/admin-portal/src/components/layout/` and `Trinity-X/admin-portal/src/features/dashboard/`:

### A. Executive Topbar Controls (`Navbar.jsx`)
* **Admin Profile Identity Snippet (Left):**
  * Displays logged-in administrator's name (`Neha Sharma`) and email (`admin2@hired.com`).
  * Hover feedback with purple background highlight.
  * Clicking navigates directly to the full-page **Admin Profile** view.
* **Dark / Light Mode Theme Toggle (Right):**
  * Circular 32px elevated icon button with border and hover state.
  * Toggles between `<Moon>` (dark mode) and `<Sun>` (light mode).
  * Persists theme selection to `localStorage` (`hired_admin_theme`) and applies CSS variables app-wide.
* **Notification Bell:** Interactive bell icon with red unread notification indicator dot.
* **Role Badge:** High-contrast pill badge displaying `"ADMIN"`.

### B. Responsive Collapsible Sidebar (`Sidebar.jsx`)
* **Expanded State (256px Width):**
  * HireD corporate brand logo (`logo.svg`).
  * Collapse toggle button (`<PanelLeftClose>`).
  * Section Header: 11px uppercase bold title `"OPERATIONAL MILESTONES"`.
  * 8 Module Navigation Items:
    1. *Dashboard Overview* (`<LayoutDashboard>`) — Default active item.
    2. *Company Directory* (`<Building2>`) — Routes to `BlankPage.jsx`.
    3. *Orders Inbox* (`<Inbox>`) — Routes to `BlankPage.jsx`.
    4. *Ongoing Trips* (`<Car>`) — Routes to `BlankPage.jsx`.
    5. *Driver Onboarding* (`<UserPlus>`) — Routes to `BlankPage.jsx`.
    6. *Admin Onboarding* (`<ShieldCheck>`) — Routes to `BlankPage.jsx`.
    7. *Invoice Verification* (`<Receipt>`) — Routes to `BlankPage.jsx`.
    8. *Reports* (`<BarChart3>`) — Routes to `BlankPage.jsx`.
  * Bottom User Card: 32px circular purple avatar initial, full name, and email with direct profile navigation.
  * Bottom Logout Button: Red hover accent with `<LogOut>` icon and label `"Sign Out of Console"`.
* **Collapsed Mini Rail State (68px Width):**
  * Triggered via `<PanelLeftOpen>` toggle.
  * Brand logo and text labels hide cleanly; icons remain horizontally centered.
  * Active item highlighted with a 40x40px rounded purple container (`#6A379F`).
  * User avatar remains fully interactive at the bottom.

### C. Dashboard Header (`DashboardHeader.jsx`)
* **Operational Greeting Pill:** `<Sparkles>` icon and label `"Operational Control Center"`.
* **Title:** Bold heading displaying `"Operations Dashboard"` (with `"Dashboard"` in purple gradient accent).
* **Subtitle:** 14px muted text `"Real-time platform overview of incoming orders, active trips, and driver availability."`
* **Live Calendar Date Badge:** Right-aligned elevated badge displaying `<Calendar>` icon and the formatted date (e.g., `"Monday, Oct 12, 2026"`).

### D. Operational Metric Cards (`MetricCard.jsx`)
Placed prominently above the orders feed to provide immediate operational focus:
* **Ongoing Trips Card:**
  * Title: `"Ongoing Trips"` with `<Car>` icon.
  * Value: Large 28px bold counter displaying `"8"`.
  * Accent Badge: Emerald badge `"Live on Route"`.
  * Subtitle: *"Active vehicle trips in transit. Monitor GPS progress and field statuses."*
  * Action: Clicking card or button navigates directly to the Ongoing Trips view.
* **Pending Invoice Verification Card:**
  * Title: `"Pending Invoice Verification"` with `<Receipt>` icon.
  * Value: Large 28px bold counter displaying `"3"`.
  * Accent Badge: Indigo badge `"Verification Queue"`.
  * Subtitle: *"Month-end company statements awaiting two-person administrator sign-off."*
  * Action: Clicking card or button navigates directly to the Invoice Verification view.

### E. Recent Orders Snapshot Table (`RecentOrdersTable.jsx`)
* **Toolbar & Filter Controls:**
  * Status Filter Pills: `"All Orders"` (shows total count), `"Pending"` (with pending count), and `"Ongoing"` (with active trips count).
  * Search Input: Real-time search by booking ID, location, or passenger name with a clear (`<X>`) button.
  * Order by Date Button: Dynamic date toggle with calendar icon and directional arrows (`<ArrowDown>` / `<ArrowUp>`).
* **Table Columns:**
  * *Booking ID:* High-contrast ID (e.g., `#ORD-615`), with sub-trip indicator (`#TRIP-1001`) if assigned.
  * *Pickup Location:* Address text with full tooltip.
  * *Drop-off Location:* Destination address text with full tooltip.
  * *Scheduled Date & Time:* Formatted timestamp (e.g., `12 Oct 2026, 10:00 am`) with column header sort toggle (`<ArrowUpDown>`).
  * *Passenger:* Passenger full name and contact phone number.
  * *Status Badge:* Color-coded semantic badges with status dot (`PENDING`, `ONGOING`, `COMPLETED`).
  * *Action Button:* `<Eye>` `"View"` button opening the Order Details Modal.
* **Order Details Modal:**
  * *Header:* Displays booking ID and sub-trip pill with close button (`<X>`).
  * *Information Grid:* Company Account, Current Status, Scheduled Departure, and Estimated Fare in Indian Rupee format (e.g., `₹1,450`).
  * *Route Card:* Visual route timeline displaying Pickup location (green bullet) and Drop-off location (purple bullet).
  * *Passenger Card:* `<Phone>` icon, passenger name, contact phone, and requested vehicle type (e.g., `Sedan (Prime)`, `EV Sedan`, `SUV`).
  * *Operational Decision Actions:*
    * For `PENDING` orders: `"Reject Order"` button (updates status to REJECTED) and `"Accept & Assign Trip"` button (transitions order to ONGOING).
    * For other orders: `"Close"` button.

---

## 3. Current State: UI with Local State Layer

> [!NOTE]
> The Executive Dashboard operates with local React state and contexts:
> - Navigation state is managed by `AdminShell.jsx` (`currentView`), rendering features as full-page canvases without browser reloads.
> - Theme mode persists via `ThemeContext` (`hired_admin_theme`), preserving theme preferences across sessions.
> - Order acceptance/rejection updates local order lists in real time.
> - Metric card counters reflect live operational mock counts.

---

## 4. Testing & Verification

### A. Automated Component & Layout Scenarios

Verified across test scenarios documented in the matrix below:

| Test ID | Test Scenario | Verification Mechanism | Status |
| :--- | :--- | :--- | :---: |
| **TC-DASH-HP-01** | Dashboard loads successfully for authenticated admin | Inspects topbar, header, metric cards, and table presence | `[✓ Passed]` |
| **TC-DASH-HP-02** | Top operational metric cards render above recent orders | Asserts Ongoing Trips and Pending Invoices cards rendered at top | `[✓ Passed]` |
| **TC-DASH-HP-03** | Navigation shortcuts redirect to module views | Clicks Ongoing Trips shortcut; asserts view transition | `[✓ Passed]` |
| **TC-DASH-HP-04** | Recent orders snapshot table displays formatted metadata | Asserts columns: ID, Pickup, Drop-off, Date, Passenger, Status, Action | `[✓ Passed]` |
| **TC-DASH-HP-07** | Pending orders filter pill and date sorting toggle rows dynamically | Clicks filter pill; asserts filtered pending rows and date order | `[✓ Passed]` |
| **TC-DASH-SEC-01** | Unauthenticated access redirects immediately to login | Clears token; asserts redirect to login page | `[✓ Passed]` |
| **TC-DASH-UI-05** | Dark / Light mode toggle switches theme tokens seamlessly | Clicks theme toggle icon; asserts `data-theme="dark"` attribute switch | `[✓ Passed]` |
| **TC-DASH-UI-06** | Collapsible mini sidebar rail collapses to 68px with active indicator | Clicks collapse button; asserts mini rail width and active highlight | `[✓ Passed]` |

### B. Manual Viewport & Browser Testing

* **Environments:** Google Chrome, Desktop (1920x945), Tablet (768px), and Mobile (375px).
* **Inspection Results:**
  1. Executive topbar remains sticky at top during long table scrolling.
  2. Collapsing sidebar to 68px mini rail provides generous room for wide table inspection.
  3. Dark mode theme switch instantly shifts background (`#0F172A`), card surface (`#1E293B`), and border colors without visual flicker.
  4. Order Details Modal opens smoothly with background backdrop blur and allows quick accept/reject decisions.

---

## 5. Known Bugs & Fixes Applied (What We Know Bug)

### Bug 1: Sidebar Label Truncation in Mini Rail Mode
* **Symptom:** Text labels in the collapsed sidebar showed partial characters and caused horizontal overflow.
* **Root Cause:** Text container had `width: auto` without `overflow: hidden` in the collapsed CSS selector.
* **Fix Applied:** Configured `.admin-sidebar.collapsed .nav-item-label` to strictly hide text, centering icons inside a 40x40px container.

### Bug 2: Table Column Clipping on Compact Screens
* **Symptom:** Table columns overlapped when the browser width was reduced below 1100px.
* **Fix Applied:** Wrapped the recent orders table in an `overflow-x: auto` container with minimum column widths, enabling smooth horizontal scroll without page clipping.

---

## 6. Unknown Bugs, Edge Cases & Potential Limitations (What We Don't Know Bug)

1. **Live GPS Vehicle Coordinates:**
   * *Limitation:* The Ongoing Trips metric card displays real-time trip counts, but live interactive vehicle GPS map plotting is simulated pending WebSocket fleet integration.
2. **Server-Side Pagination:**
   * *Limitation:* The Recent Orders table performs client-side search, sorting, and filtering on seeded mock orders; server-side pagination with query parameters will be introduced when the backend REST API is connected.
