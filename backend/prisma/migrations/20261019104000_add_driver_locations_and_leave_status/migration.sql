-- AlterTable: Add status and reason to driver_leaves
ALTER TABLE "driver_leaves" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE "driver_leaves" ADD COLUMN IF NOT EXISTS "reason" VARCHAR(500);

-- Backfill existing rows as APPROVED
UPDATE "driver_leaves" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';

-- Constraint for driver_leaves status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_driver_leave_status'
    ) THEN
        ALTER TABLE "driver_leaves" ADD CONSTRAINT "chk_driver_leave_status" CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED'));
    END IF;
END $$;

-- CreateTable: driver_locations
CREATE TABLE IF NOT EXISTS "driver_locations" (
    "driver_id" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "battery_percent" INTEGER,
    "trip_id" INTEGER,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable: driver_location_history
CREATE TABLE IF NOT EXISTS "driver_location_history" (
    "id" BIGSERIAL NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "trip_id" INTEGER,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_location_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "driver_location_history_driver_id_recorded_at_idx" ON "driver_location_history"("driver_id", "recorded_at");

-- AddForeignKeys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'driver_locations_driver_id_fkey'
    ) THEN
        ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'driver_locations_trip_id_fkey'
    ) THEN
        ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'driver_location_history_driver_id_fkey'
    ) THEN
        ALTER TABLE "driver_location_history" ADD CONSTRAINT "driver_location_history_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'driver_location_history_trip_id_fkey'
    ) THEN
        ALTER TABLE "driver_location_history" ADD CONSTRAINT "driver_location_history_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
