# HireD — B2B Partner Portal Frontend

The **HireD B2B Partner Portal** is a web application designed for B2B corporate partners to place transport orders, monitor real-time trip fulfillment, view trip closure reports, inspect verified month-end statements, and manage account notifications.

Built in strict compliance with the **HireD Phase 1 MVP PRD v0.2** (dated 30 Sep 2026), the **HireD Technical Guidelines**, and team database architecture (`database_updated0.2.md`).

---

## 🚀 Technology Stack

- **Framework:** React 18 + Vite
- **Language:** JavaScript (JSX)
- **Routing:** React Router v6
- **Styling:** Vanilla CSS with HireD Design System Tokens (`#6F2794` primary brand color)
- **HTTP Client:** Axios with JWT Interceptors & Session Handling
- **Icons:** Lucide React
- **Testing:** Node.js native test runner (`node --test`)

---

## 📁 Directory Structure

```text
b2b-portal/
├── public/
│   └── logo.png                 # Official HireD Logo
├── src/
│   ├── assets/
│   │   └── logo.png             # Brand asset
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx   # Route guard enforcing authenticated sessions
│   │   ├── common/
│   │   │   └── StatusBadge.jsx      # Reusable status badge with dot indicators
│   │   ├── layout/
│   │   │   ├── Navbar.jsx           # Header with tenant status & notifications
│   │   │   ├── Sidebar.jsx          # Fixed desktop sidebar navigation
│   │   │   └── PortalLayout.jsx     # Shell layout
│   │   ├── notifications/
│   │   │   └── NotificationDropdown.jsx # B-07 notification panel
│   │   ├── orders/
│   │   │   └── OrderDetailModal.jsx # Order details, ETA & trip-close OTP modal
│   │   ├── reports/
│   │   │   └── TripReportViewModal.jsx # Official printable closed trip report modal
│   │   └── statements/
│   │       └── StatementDetailModal.jsx # Verified month-end statement modal
│   ├── constants/
│   │   └── status.js            # Official order, trip, and invoice status enums
│   ├── context/
│   │   └── AuthContext.jsx      # Partner authentication & session provider
│   ├── pages/
│   │   ├── LoginPage.jsx        # B-01 Partner login with security lockout
│   │   ├── DashboardPage.jsx    # Overview dashboard with dynamic KPI cards
│   │   ├── CreateOrderPage.jsx  # B-02 Transport order creation form
│   │   ├── OrdersPage.jsx       # B-03 Tabbed & filterable orders & trips list
│   │   ├── ReportsPage.jsx      # B-05 Closed trip reports & CSV export
│   │   ├── StatementsPage.jsx   # B-06 Verified month-end statements list
│   │   └── NotFoundPage.jsx     # 404 handler
│   ├── services/
│   │   ├── apiClient.js         # Axios instance with auth & error interceptors
│   │   ├── authService.js       # Partner auth & 15-minute lockout handling
│   │   ├── notificationService.js # B-07 partner alerts service
│   │   ├── orderService.js      # B-02 and B-03 order lifecycle service
│   │   ├── reportService.js     # B-05 post-trip reporting service
│   │   ├── statementService.js  # B-06 verified statement service
│   │   └── mockData.js          # Mock data layer adhering to team database design
│   ├── styles/
│   │   └── index.css            # HireD design tokens & component styles
│   ├── App.jsx                  # Route definitions
│   └── main.jsx                 # Application entrypoint
├── tests/
│   └── b2b-portal.test.js       # Automated test suite
├── .env.example                 # Environment variable templates
├── index.html                   # HTML template with SEO meta and typography
├── package.json                 # Dependencies and npm scripts
├── vite.config.js               # Vite configuration (port 5174)
└── README.md                    # This documentation
```

---

## 🛠️ Setup & Running Locally

### 1. Prerequisites
- Node.js `v18+` (Tested on `v24.19.0`)
- npm `v9+` (Tested on `11.17.0`)

### 2. Installation
From the repository root or inside `b2b-portal`:
```bash
cd b2b-portal
npm install
```

### 3. Environment Configuration
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Key variables:
- `VITE_API_BASE_URL`: Base URL for HireD backend (defaults to `http://localhost:5000/api/v1`).
- `VITE_USE_MOCK_API`: Set to `true` during development while backend routes are in progress.

### 4. Running Dev Server
```bash
npm run dev
```
The application will be accessible at: `http://localhost:5174`

### 5. Running Automated Tests
```bash
npm test
```

### 6. Production Build
```bash
npm run build
```

---

## 🔐 Feature Highlights & PRD Compliance

| Feature / Screen | PRD ID | Status | Implementation Details |
| :--- | :---: | :---: | :--- |
| **Partner Login** | `B-01` | **P0** | Admin-created credentials authentication. Enforces tenant isolation. 5-failed-attempts security lockout for 15 minutes (`database_updated0.2.md Section 10.5`). Auto-fill helper for reviewer demo access. |
| **Create Transport Order** | `B-02` | **P0** | Self-service intake: pickup spot, drop-off spot, date/time, passenger contact, and vehicle/service notes. Initial status is `RECEIVED` with source `PORTAL`. |
| **My Orders & Trips** | `B-03` | **P0** | Unified tabbed list (All, Pending Orders, Active Trips, Completed Trips). Real-time search by ID, location, or passenger. |
| **ETA & Route Estimation** | `B-04` | **P1** | Route duration & distance display in order detail view. |
| **Trip-Close OTP Display** | `D-09` | **P0** | Prominently displays the system-generated 6-digit OTP for the partner to provide to the driver upon drop-off to close the trip. |
| **Closed Trip Reports** | `B-05` | **P0** | Filterable completion reports for closed trips with duration, driver details, fare breakdown, and itemized out-of-pocket expenses. Excludes internal driver commission/split. One-click CSV export and print view. |
| **Verified Month-End Statements** | `B-06` | **P0** | Strictly requires **Two-Person Administrator Verification** (creator + secondary controller). Only `PUBLISHED` statements are viewable by partners. Trip-wise breakdown ledger and direct offline remittance guidance. |
| **Email & System Notifications** | `B-07` | **P1** | In-app notification center tracking order acceptances, rejections with reasons, and statement publications, with simulated email delivery status. |

---

## 🏷️ Official Status Matrix

| Entity | Allowed Order of Statuses |
| :--- | :--- |
| **Order** | `RECEIVED` → `ACCEPTED` / `REJECTED` |
| **Trip** | `UNASSIGNED` → `ASSIGNED` → `ONGOING` → `CLOSED` |
| **Invoice** | `DRAFT` → `PENDING_VERIFICATION` → `VERIFIED` → `PUBLISHED` (Partner sees `PUBLISHED` only) |

---

## 🔒 Security & Tenant Isolation

- **Tenant Isolation:** A partner may only access data belonging to their own organization (`company_id`). The frontend relies strictly on identity decoded from JWT tokens and never transmits arbitrary company IDs to override access.
- **Published Statements Only:** Per PRD requirement `B-06`, draft or unverified invoices are strictly blocked from the partner portal until verified by two separate administrators (`PUBLISHED` status).
- **Offline Settlement:** In-app payments are out of scope for Phase 1. Statements are settled directly outside the platform.
