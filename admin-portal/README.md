# HireD — Admin Portal

This repository surface contains the **Admin Portal** web application for the HireD platform, built using **React 18** and **Vite**.

---

## 📁 Application Structure

```text
admin-portal/
├── public/                 # Static assets & public HireD logos
├── src/
│   ├── assets/             # Branding assets (logo.png, logo.svg)
│   ├── components/         # Reusable UI & Layout components
│   │   ├── layout/         # Admin Shell, Sidebar, Navbar
│   │   └── ui/             # Buttons, Cards, Inputs, Status Badges
│   ├── features/           # Domain feature modules (orders, trips, drivers, companies, payroll, invoices)
│   ├── hooks/              # Custom React hooks
│   ├── services/           # REST API client services
│   └── utils/              # Helper utilities & formatters
├── tests/                  # Frontend unit & component tests
├── package.json            # Dependencies & scripts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ / v20+ / v24+
- `pnpm` or `npm`

### Installation
```bash
pnpm install
```

### Development Server
```bash
pnpm dev
```

### Build for Production
```bash
pnpm build
```
