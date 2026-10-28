-- AlterTable: Add start selfie fields to trips
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "start_selfie_url" VARCHAR(500);
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "start_selfie_public_id" VARCHAR(255);
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "start_selfie_uploaded_at" TIMESTAMPTZ;
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "start_selfie_expires_at" TIMESTAMPTZ;
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "start_selfie_deleted_at" TIMESTAMPTZ;

-- Backfill start_selfie_url with existing selfie_url where present
UPDATE "trips" SET "start_selfie_url" = "selfie_url" WHERE "selfie_url" IS NOT NULL AND "start_selfie_url" IS NULL;
