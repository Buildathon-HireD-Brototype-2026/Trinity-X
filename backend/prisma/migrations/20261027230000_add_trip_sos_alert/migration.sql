-- CreateTable
CREATE TABLE IF NOT EXISTS "trip_sos_alerts" (
    "alert_id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "reason" VARCHAR(50) NOT NULL,
    "notes" VARCHAR(1000),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "primary_admin_id" INTEGER,
    "claimed_by_admin_id" INTEGER,
    "claimed_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "resolution_notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_sos_alerts_pkey" PRIMARY KEY ("alert_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "trip_sos_alerts_trip_id_idx" ON "trip_sos_alerts"("trip_id");
CREATE INDEX IF NOT EXISTS "trip_sos_alerts_driver_id_idx" ON "trip_sos_alerts"("driver_id");
CREATE INDEX IF NOT EXISTS "trip_sos_alerts_status_idx" ON "trip_sos_alerts"("status");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trip_sos_alerts_trip_id_fkey'
    ) THEN
        ALTER TABLE "trip_sos_alerts" ADD CONSTRAINT "trip_sos_alerts_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("trip_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trip_sos_alerts_driver_id_fkey'
    ) THEN
        ALTER TABLE "trip_sos_alerts" ADD CONSTRAINT "trip_sos_alerts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trip_sos_alerts_order_id_fkey'
    ) THEN
        ALTER TABLE "trip_sos_alerts" ADD CONSTRAINT "trip_sos_alerts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'trip_sos_alerts_claimed_by_admin_id_fkey'
    ) THEN
        ALTER TABLE "trip_sos_alerts" ADD CONSTRAINT "trip_sos_alerts_claimed_by_admin_id_fkey" FOREIGN KEY ("claimed_by_admin_id") REFERENCES "admins"("admin_id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
