-- CreateTable
CREATE TABLE "offices" (
    "office_id" SERIAL NOT NULL,
    "office_name" VARCHAR(150) NOT NULL,
    "office_location" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offices_pkey" PRIMARY KEY ("office_id")
);

-- CreateTable
CREATE TABLE "companies" (
    "company_id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(300),
    "contact_person" VARCHAR(150),
    "phone_no" VARCHAR(20),
    "email_id" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "office_id" INTEGER NOT NULL,
    "company_location" VARCHAR(300),
    "hired_split" DECIMAL(5,2) NOT NULL,
    "driver_split" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "pickup_spot" VARCHAR(300) NOT NULL,
    "dropoff_spot" VARCHAR(300) NOT NULL,
    "pickup_time" TIMESTAMPTZ NOT NULL,
    "contact_name" VARCHAR(150) NOT NULL,
    "contact_phone" VARCHAR(20) NOT NULL,
    "notes" VARCHAR(1000),
    "status" VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    "source" VARCHAR(10) NOT NULL,
    "reject_reason" VARCHAR(500),
    "created_by_admin_id" INTEGER,
    "decided_by_admin_id" INTEGER,
    "decided_at" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "trips" (
    "trip_id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "driver_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "eta" TIMESTAMPTZ,
    "selfie_url" VARCHAR(500),
    "otp" VARCHAR(6) NOT NULL,
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "expenses_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "trip_status" VARCHAR(20) NOT NULL DEFAULT 'UNASSIGNED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "assigned_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("trip_id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "expense_id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("expense_id")
);

-- CreateTable
CREATE TABLE "trip_payrolls" (
    "payroll_id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "invoice_id" INTEGER,
    "driver_pct" DECIMAL(5,2) NOT NULL,
    "company_pct" DECIMAL(5,2) NOT NULL,
    "trip_amount" DECIMAL(12,2) NOT NULL,
    "driver_share" DECIMAL(12,2) NOT NULL,
    "company_share" DECIMAL(12,2) NOT NULL,
    "payout_status" VARCHAR(20) NOT NULL DEFAULT 'CREDITED',
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_payrolls_pkey" PRIMARY KEY ("payroll_id")
);

-- CreateTable
CREATE TABLE "driver_wallet_transactions" (
    "transaction_id" SERIAL NOT NULL,
    "trip_id" INTEGER,
    "driver_id" INTEGER NOT NULL,
    "credit" DECIMAL(12,2),
    "debit" DECIMAL(12,2),
    "note" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_wallet_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "invoice_id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "period_month" CHAR(7) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "created_admin" INTEGER NOT NULL,
    "verified_admin1" INTEGER,
    "verified_admin2" INTEGER,
    "verified_at1" TIMESTAMPTZ,
    "verified_at2" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "total_driver_share" DECIMAL(12,2) NOT NULL,
    "total_company_share" DECIMAL(12,2) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("invoice_id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "driver_id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone_no" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "photo_url" VARCHAR(500),
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "current_location" VARCHAR(300),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "driver_documents" (
    "document_id" SERIAL NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "document_type" VARCHAR(30) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "original_file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "driver_leaves" (
    "leave_id" SERIAL NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_leaves_pkey" PRIMARY KEY ("leave_id")
);

-- CreateTable
CREATE TABLE "admins" (
    "admin_id" SERIAL NOT NULL,
    "office_id" INTEGER NOT NULL,
    "admin_name" VARCHAR(150) NOT NULL,
    "phone_no" VARCHAR(20),
    "email_id" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_id" BIGSERIAL NOT NULL,
    "actor_id" INTEGER,
    "actor_type" VARCHAR(10) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(30) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" INET,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_id" SERIAL NOT NULL,
    "user_type" VARCHAR(10) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "recipient_type" VARCHAR(10) NOT NULL,
    "recipient_id" INTEGER NOT NULL,
    "recipient_email" VARCHAR(254) NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "entity_type" VARCHAR(30) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(500),
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_email_id_key" ON "companies"("email_id");

-- CreateIndex
CREATE INDEX "orders_company_id_created_at_idx" ON "orders"("company_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "trips_order_id_key" ON "trips"("order_id");

-- CreateIndex
CREATE INDEX "trips_driver_id_trip_status_idx" ON "trips"("driver_id", "trip_status");

-- CreateIndex
CREATE INDEX "trips_trip_status_idx" ON "trips"("trip_status");

-- CreateIndex
CREATE INDEX "trips_closed_at_idx" ON "trips"("closed_at");

-- CreateIndex
CREATE INDEX "expenses_trip_id_idx" ON "expenses"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_payrolls_trip_id_key" ON "trip_payrolls"("trip_id");

-- CreateIndex
CREATE INDEX "trip_payrolls_driver_id_created_at_idx" ON "trip_payrolls"("driver_id", "created_at");

-- CreateIndex
CREATE INDEX "trip_payrolls_invoice_id_idx" ON "trip_payrolls"("invoice_id");

-- CreateIndex
CREATE INDEX "trip_payrolls_payment_status_idx" ON "trip_payrolls"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_wallet_transactions_trip_id_key" ON "driver_wallet_transactions"("trip_id");

-- CreateIndex
CREATE INDEX "driver_wallet_transactions_driver_id_created_at_idx" ON "driver_wallet_transactions"("driver_id", "created_at");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_phone_no_key" ON "drivers"("phone_no");

-- CreateIndex
CREATE INDEX "driver_documents_driver_id_document_type_uploaded_at_idx" ON "driver_documents"("driver_id", "document_type", "uploaded_at");

-- CreateIndex
CREATE INDEX "driver_leaves_driver_id_start_date_idx" ON "driver_leaves"("driver_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_id_key" ON "admins"("email_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_type_actor_id_idx" ON "audit_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_type_user_id_idx" ON "sessions"("user_type", "user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "notifications_status_created_at_idx" ON "notifications"("status", "created_at");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("office_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_decided_by_admin_id_fkey" FOREIGN KEY ("decided_by_admin_id") REFERENCES "admins"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_payrolls" ADD CONSTRAINT "trip_payrolls_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_payrolls" ADD CONSTRAINT "trip_payrolls_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_payrolls" ADD CONSTRAINT "trip_payrolls_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("invoice_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_wallet_transactions" ADD CONSTRAINT "driver_wallet_transactions_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_wallet_transactions" ADD CONSTRAINT "driver_wallet_transactions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_admin_fkey" FOREIGN KEY ("created_admin") REFERENCES "admins"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_verified_admin1_fkey" FOREIGN KEY ("verified_admin1") REFERENCES "admins"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_verified_admin2_fkey" FOREIGN KEY ("verified_admin2") REFERENCES "admins"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_leaves" ADD CONSTRAINT "driver_leaves_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_office_id_fkey" FOREIGN KEY ("office_id") REFERENCES "offices"("office_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- Additional Business Rules, Check Constraints & Partial Indexes (Design Doc 7.1 & 9)
-- =============================================================================

-- 1. Companies constraints
CREATE UNIQUE INDEX "idx_companies_email_lower" ON "companies" (LOWER("email_id"));
ALTER TABLE "companies" ADD CONSTRAINT "chk_companies_split_sum" CHECK ("driver_split" + "hired_split" = 100);
ALTER TABLE "companies" ADD CONSTRAINT "chk_companies_driver_split_range" CHECK ("driver_split" BETWEEN 0 AND 100);
ALTER TABLE "companies" ADD CONSTRAINT "chk_companies_hired_split_range" CHECK ("hired_split" BETWEEN 0 AND 100);
ALTER TABLE "companies" ADD CONSTRAINT "chk_companies_status" CHECK ("status" IN ('ACTIVE', 'INACTIVE'));
ALTER TABLE "companies" ADD CONSTRAINT "chk_companies_failed_login_attempts" CHECK ("failed_login_attempts" >= 0);

-- 2. Admins constraints
CREATE UNIQUE INDEX "idx_admins_email_lower" ON "admins" (LOWER("email_id"));
ALTER TABLE "admins" ADD CONSTRAINT "chk_admins_status" CHECK ("status" IN ('ACTIVE', 'INACTIVE'));
ALTER TABLE "admins" ADD CONSTRAINT "chk_admins_failed_login_attempts" CHECK ("failed_login_attempts" >= 0);

-- 3. Orders constraints
ALTER TABLE "orders" ADD CONSTRAINT "chk_orders_status" CHECK ("status" IN ('RECEIVED', 'ACCEPTED', 'REJECTED'));
ALTER TABLE "orders" ADD CONSTRAINT "chk_orders_source" CHECK ("source" IN ('PORTAL', 'ADMIN'));
ALTER TABLE "orders" ADD CONSTRAINT "chk_orders_decided" CHECK ("status" = 'RECEIVED' OR ("decided_by_admin_id" IS NOT NULL AND "decided_at" IS NOT NULL));
ALTER TABLE "orders" ADD CONSTRAINT "chk_orders_reject_reason" CHECK ("status" <> 'REJECTED' OR "reject_reason" IS NOT NULL);

-- 4. Trips constraints
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_trip_status" CHECK ("trip_status" IN ('UNASSIGNED', 'ASSIGNED', 'ONGOING', 'CLOSED'));
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_amount" CHECK ("amount" > 0);
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_otp_attempts" CHECK ("otp_attempts" BETWEEN 0 AND 5);
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_closed" CHECK ("trip_status" <> 'CLOSED' OR ("expenses_confirmed" = true AND "closed_at" IS NOT NULL));
ALTER TABLE "trips" ADD CONSTRAINT "chk_trips_assigned" CHECK ("trip_status" = 'UNASSIGNED' OR ("driver_id" IS NOT NULL AND "assigned_at" IS NOT NULL));

-- 5. Expenses constraints
ALTER TABLE "expenses" ADD CONSTRAINT "chk_expenses_amount" CHECK ("amount" > 0);

-- 6. Trip Payrolls constraints
ALTER TABLE "trip_payrolls" ADD CONSTRAINT "chk_trip_payrolls_payout_status" CHECK ("payout_status" IN ('PENDING', 'CREDITED'));
ALTER TABLE "trip_payrolls" ADD CONSTRAINT "chk_trip_payrolls_payment_status" CHECK ("payment_status" IN ('UNPAID', 'PAID'));
ALTER TABLE "trip_payrolls" ADD CONSTRAINT "chk_trip_payrolls_split_sum" CHECK ("driver_pct" + "company_pct" = 100);
ALTER TABLE "trip_payrolls" ADD CONSTRAINT "chk_trip_payrolls_share_sum" CHECK ("driver_share" + "company_share" = "trip_amount");

-- 7. Driver Wallet Transactions constraints
ALTER TABLE "driver_wallet_transactions" ADD CONSTRAINT "chk_driver_wallet_transactions_type" CHECK (
    ("credit" > 0 AND "debit" IS NULL AND "trip_id" IS NOT NULL) OR
    ("debit" > 0 AND "credit" IS NULL AND "trip_id" IS NULL)
);

-- 8. Invoices constraints & partial unique index
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_status" CHECK ("status" IN ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'PUBLISHED', 'CANCELLED'));
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_period_month" CHECK ("period_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_verified1_pair" CHECK (("verified_admin1" IS NULL) = ("verified_at1" IS NULL));
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_verified2_pair" CHECK (("verified_admin2" IS NULL) = ("verified_at2" IS NULL));
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_verified1_creator" CHECK ("verified_admin1" IS NULL OR "verified_admin1" = "created_admin");
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_verified2_different" CHECK ("verified_admin2" IS NULL OR "verified_admin2" <> "created_admin");
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_approvals_required" CHECK ("status" NOT IN ('VERIFIED', 'PUBLISHED') OR ("verified_admin1" IS NOT NULL AND "verified_admin2" IS NOT NULL));
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_published_time" CHECK (("status" = 'PUBLISHED') = ("published_at" IS NOT NULL));
ALTER TABLE "invoices" ADD CONSTRAINT "chk_invoices_cancelled_time" CHECK (("status" = 'CANCELLED') = ("cancelled_at" IS NOT NULL));
CREATE UNIQUE INDEX "idx_invoices_company_period_active" ON "invoices" ("company_id", "period_month") WHERE "status" <> 'CANCELLED';

-- 9. Drivers constraints
ALTER TABLE "drivers" ADD CONSTRAINT "chk_drivers_status" CHECK ("status" IN ('PENDING', 'ACTIVE', 'INACTIVE'));
ALTER TABLE "drivers" ADD CONSTRAINT "chk_drivers_failed_login_attempts" CHECK ("failed_login_attempts" >= 0);

-- 10. Driver Documents constraints
ALTER TABLE "driver_documents" ADD CONSTRAINT "chk_driver_documents_type" CHECK ("document_type" IN ('DRIVING_LICENCE', 'AADHAAR', 'PAN', 'PCC'));
ALTER TABLE "driver_documents" ADD CONSTRAINT "chk_driver_documents_size" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880);

-- 11. Driver Leaves constraints
ALTER TABLE "driver_leaves" ADD CONSTRAINT "chk_driver_leaves_dates" CHECK ("end_date" >= "start_date");

-- 12. Sessions constraints
ALTER TABLE "sessions" ADD CONSTRAINT "chk_sessions_user_type" CHECK ("user_type" IN ('ADMIN', 'PARTNER', 'DRIVER'));
ALTER TABLE "sessions" ADD CONSTRAINT "chk_sessions_expires" CHECK ("expires_at" > "created_at");

-- 13. Notifications constraints
ALTER TABLE "notifications" ADD CONSTRAINT "chk_notifications_recipient_type" CHECK ("recipient_type" IN ('PARTNER', 'ADMIN', 'DRIVER'));
ALTER TABLE "notifications" ADD CONSTRAINT "chk_notifications_type" CHECK ("type" IN ('ORDER_ACCEPTED', 'ORDER_REJECTED', 'STATEMENT_PUBLISHED'));
ALTER TABLE "notifications" ADD CONSTRAINT "chk_notifications_status" CHECK ("status" IN ('PENDING', 'SENT', 'FAILED'));
ALTER TABLE "notifications" ADD CONSTRAINT "chk_notifications_sent_at" CHECK ("status" <> 'SENT' OR "sent_at" IS NOT NULL);

-- 14. Audit Logs constraints
ALTER TABLE "audit_logs" ADD CONSTRAINT "chk_audit_logs_actor_type" CHECK ("actor_type" IN ('ADMIN', 'PARTNER', 'DRIVER', 'SYSTEM'));

