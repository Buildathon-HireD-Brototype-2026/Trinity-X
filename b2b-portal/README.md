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
│   │   ├── common/
│   │   │   └── StatusBadge.jsx  # Reusable status badge with dot indicators
│   │   └── layout/
│   │       ├── Navbar.jsx       # Header with tenant status and partner profile
│   │       ├── Sidebar.jsx      # Fixed desktop sidebar navigation
│   │       └── PortalLayout.jsx # Shell layout
│   ├── constants/
│   │   └── status.js            # Official order, trip, and invoice status enums
│   ├── context/
│   │   └── AuthContext.jsx      # Partner authentication & session provider
│   ├── pages/
│   │   ├── DashboardPage.jsx    # Overview dashboard with KPI cards and recent orders
│   │   ├── PlaceholderPage.jsx  # Planned feature placeholders
│   │   └── NotFoundPage.jsx     # 404 handler
│   ├── services/
│   │   ├── apiClient.js         # Axios instance with auth & error interceptors
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

## 🔐 Security & Tenant Isolation

- **Tenant Isolation:** A partner may only access data belonging to their own organization (`company_id`). The frontend relies strictly on identity decoded from JWT tokens and never transmits arbitrary company IDs to override access.
- **Published Statements Only:** Per PRD requirement `B-06`, draft or unverified invoices are strictly blocked from the partner portal until verified by two separate administrators (`PUBLISHED` status).
- **Offline Settlement:** In-app payments are out of scope for Phase 1. Statements are settled directly outside the platform.

---

## 🏷️ Official Status Matrix

| Entity | Allowed Order of Statuses |
| :--- | :--- |
| **Order** | `RECEIVED` → `ACCEPTED` / `REJECTED` |
| **Trip** | `UNASSIGNED` → `ASSIGNED` → `ONGOING` → `CLOSED` |
| **Invoice** | `DRAFT` → `PENDING_VERIFICATION` → `VERIFIED` → `PUBLISHED` (Partner sees `PUBLISHED` only) |
