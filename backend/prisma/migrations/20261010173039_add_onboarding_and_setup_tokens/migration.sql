-- CreateTable
CREATE TABLE "company_registration_requests" (
    "request_id" SERIAL NOT NULL,
    "company_name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(300),
    "contact_person" VARCHAR(150) NOT NULL,
    "phone_no" VARCHAR(20) NOT NULL,
    "email_id" VARCHAR(254) NOT NULL,
    "company_location" VARCHAR(300),
    "notes" VARCHAR(1000),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "reviewed_by_admin_id" INTEGER,
    "reviewed_at" TIMESTAMPTZ,
    "rejection_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_registration_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "password_setup_tokens" (
    "token_id" SERIAL NOT NULL,
    "user_type" VARCHAR(10) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_setup_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateIndex
CREATE INDEX "company_registration_requests_status_created_at_idx" ON "company_registration_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_setup_tokens_token_hash_key" ON "password_setup_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_setup_tokens_user_type_user_id_idx" ON "password_setup_tokens"("user_type", "user_id");

-- CreateIndex
CREATE INDEX "password_setup_tokens_expires_at_idx" ON "password_setup_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "company_registration_requests" ADD CONSTRAINT "company_registration_requests_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admins"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Constraints for company_registration_requests
ALTER TABLE "company_registration_requests" ADD CONSTRAINT "chk_company_reg_status" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED'));
ALTER TABLE "company_registration_requests" ADD CONSTRAINT "chk_company_reg_reviewed" CHECK ("status" = 'PENDING' OR ("reviewed_by_admin_id" IS NOT NULL AND "reviewed_at" IS NOT NULL));
ALTER TABLE "company_registration_requests" ADD CONSTRAINT "chk_company_reg_rejected" CHECK ("status" <> 'REJECTED' OR "rejection_reason" IS NOT NULL);

-- Constraints for password_setup_tokens
ALTER TABLE "password_setup_tokens" ADD CONSTRAINT "chk_password_tokens_user_type" CHECK ("user_type" IN ('ADMIN', 'PARTNER', 'DRIVER'));
ALTER TABLE "password_setup_tokens" ADD CONSTRAINT "chk_password_tokens_expires" CHECK ("expires_at" > "created_at");

