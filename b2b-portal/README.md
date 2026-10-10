# HireD — B2B Partner Portal Frontend

The **HireD B2B Partner Portal** is a web application designed for B2B corporate partners to place transport orders, monitor real-time trip fulfillment, view trip closure reports, and inspect verified month-end statements.

Built in accordance with **HireD Phase 1 MVP PRD v0.2** and the **HireD Technical Guidelines**.

---

## 🚀 Technology Stack

- **Framework:** React 18 + Vite
- **Language:** JavaScript (JSX)
- **Routing:** React Router v6
- **Styling:** Vanilla CSS with HireD Design System Tokens (`#6F2794` primary brand color)
- **HTTP Client:** Axios with JWT Interceptors & Session Handling
- **Icons:** Lucide React

---

## 📁 Directory Structure

```text
b2b-portal/
├── public/
│   └── logo.svg                 # Official HireD Vector Logo
├── src/
│   ├── assets/
│   │   └── logo.svg             # Brand asset
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx # Client route guard for partner session
│   │   ├── common/
│   │   │   └── StatusBadge.jsx  # Reusable status badge with dot indicators
│   │   ├── layout/
│   │   │   ├── Navbar.jsx       # Header with tenant status and partner profile
│   │   │   ├── Sidebar.jsx      # Fixed desktop sidebar navigation
│   │   │   └── PortalLayout.jsx # Shell layout
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
│   │   ├── ReportsPage.jsx      # B-05 Closed trip reports & export
│   │   ├── StatementsPage.jsx   # B-06 Verified month-end statements list
│   │   └── NotFoundPage.jsx     # 404 handler
│   ├── services/
│   │   ├── apiClient.js         # Axios instance with auth & error interceptors
│   │   ├── authService.js       # Partner auth & 15-minute lockout handling
│   │   ├── orderService.js      # B-02 and B-03 order lifecycle service
│   │   ├── reportService.js     # B-05 post-trip reporting service
│   │   ├── statementService.js  # B-06 verified statement service
│   │   └── mockData.js          # Mock data layer adhering to team database design
│   ├── styles/
│   │   └── index.css            # HireD design tokens & component styles
│   ├── App.jsx                  # Route definitions
│   └── main.jsx                 # Application entrypoint
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
- `VITE_USE_MOCK_API`: Set to `true` while backend services are in development.

### 4. Running Dev Server
```bash
npm run dev
```
The application will be accessible at: `http://localhost:5174`

### 5. Production Build
```bash
npm run build
```

---

## 🔐 Feature Highlights

### 1. Partner Authentication (`B-01`)
* Partner logs in using registered corporate email and admin-created password.
* Demo reviewer access: `partner@apexlogistics.com` / `PartnerPass123!`.
* Brute-force protection: 5 failed attempts locks the account for 15 minutes (`database_updated0.2.md Section 10.5`).
* Protected routes redirect unauthenticated users to `/login`.

### 2. Transport Order Creation (`B-02`)
* Form fields: Pickup spot, drop-off destination, scheduled pickup date/time, contact name, contact phone, and vehicle/service notes.
* Initial status is strictly set to `RECEIVED` with source `PORTAL`.
* Client-side validation prevents empty fields and invalid telephone formatting.
* Tenant isolation: `company_id` is derived from authentication context, never entered by the user.

### 3. Order & Trip Tracking (`B-03`, `B-04`, `D-09`)
* Tabbed view across All Bookings, Pending Orders, Active Trips, and Completed Trips.
* Real-time search by Booking ID, route keywords, or passenger name.
* Full order inspection modal:
  * **ETA & Duration (`B-04`):** Displays estimated route duration.
  * **Trip-Close OTP (`D-09`):** Securely renders the system-generated 6-digit OTP for the partner to provide to the driver upon drop-off.
  * **Rejection Reason:** Displays administrative feedback if an order is rejected.

### 4. Post-Trip Reports (`B-05`)
* Generates completion reports for trips in `CLOSED` status.
* Displays route details, driver info, start and close timestamps, base fare, and itemized out-of-pocket expenses.
* Driver commission percentage and platform payout amounts are excluded from per-trip views (revealed exclusively on verified month-end statements).
* Printable view (`window.print()`) and one-click CSV export.

### 5. Verified Month-End Statements (`B-06`)
* **Two-Person Verification Integrity:** Invoices are exposed to the partner **only** when they attain `PUBLISHED` status following explicit sign-off from two distinct administrators (the statement creator plus one secondary controller).
* Displays gross monthly trip fares, corporate split (Driver % vs Platform %), and logged disbursements.
* Trip-wise rate ledger documenting individual closed trips included in the statement billing cycle.
* **Offline Payment Settlement:** Clarifies payment terms via direct remittance (NEFT/RTGS), adhering to the PRD Phase 1 exclusion of in-app payment gateways.

---

## 🏷️ Official Status Matrix

| Entity | Allowed Order of Statuses |
| :--- | :--- |
| **Order** | `RECEIVED` → `ACCEPTED` / `REJECTED` |
| **Trip** | `UNASSIGNED` → `ASSIGNED` → `ONGOING` → `CLOSED` |
| **Invoice** | `DRAFT` → `PENDING_VERIFICATION` → `VERIFIED` → `PUBLISHED` (Partner sees `PUBLISHED` only) |
