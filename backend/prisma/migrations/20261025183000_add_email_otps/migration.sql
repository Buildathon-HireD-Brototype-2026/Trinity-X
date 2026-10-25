-- CreateTable
CREATE TABLE "email_otps" (
    "otp_id" SERIAL NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "otp_hash" VARCHAR(64) NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("otp_id")
);

-- CreateIndex
CREATE INDEX "email_otps_email_purpose_idx" ON "email_otps"("email", "purpose");

-- CreateIndex
CREATE INDEX "email_otps_expires_at_idx" ON "email_otps"("expires_at");
