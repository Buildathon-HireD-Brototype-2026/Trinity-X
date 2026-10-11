# Comprehensive Feature Test Cases (`testcases/`)

This directory contains dedicated test case specification files for every feature in the **HireD Admin Portal**.

---

## 📌 Test Case Structure & Standards

For every feature implemented, a separate test file is maintained in this directory covering:
1. **Happy Path Scenarios:** Standard successful user execution flow.
2. **Validation & Boundary Failures:** Invalid input values, empty fields, formatting errors.
3. **State Transition & Lifecycle Errors:** Invalid order/trip/invoice status transitions.
4. **Authorization & Permission Restrictions:** Access attempt by unauthenticated or unauthorized users.
5. **Network & System Failures:** Timeout, server 500, concurrent update conflicts.

---

## 📂 Feature Test Case Index

```text
testcases/
├── README.md                                  # Test case guidelines & structure
├── docs/                                      # Feature documentation & diagrams
├── tc_01_admin_authentication.md              # All test cases for Admin Login
├── tc_02_admin_dashboard.md                   # All test cases for Dashboard
├── tc_03_admin_management.md                  # All test cases for Admin User Management
├── tc_04_orders_inbox.md                      # All test cases for Orders Inbox
├── tc_05_create_order.md                      # All test cases for Manual Order Creation
├── tc_06_order_details_and_decision.md        # All test cases for Accept/Reject Order
├── tc_07_trips_and_driver_assignment.md       # All test cases for Driver Assignment & Trip Edits
├── tc_08_ongoing_trips_monitoring.md          # All test cases for Ongoing Trips Monitoring
├── tc_09_trip_reports.md                      # All test cases for Trip Reports
├── tc_10_driver_onboarding_queue.md           # All test cases for Driver Onboarding & Document Review
├── tc_11_driver_directory.md                  # All test cases for Driver Directory & Availability
├── tc_12_company_management.md                # All test cases for Company Directory
├── tc_13_company_onboarding_and_splits.md      # All test cases for Add/Edit Company & Payout Split
├── tc_14_payroll_settings.md                  # All test cases for Payroll Settings
├── tc_15_month_end_invoicing.md               # All test cases for Two-Person Invoice Verification
└── tc_16_reports_dashboard.md                 # All test cases for Reports Dashboard
```
