-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pickup_latitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "pickup_longitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "drop_latitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "drop_longitude" DECIMAL(10,7);

-- AlterTable
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "pickup_latitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "pickup_longitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "drop_latitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "drop_longitude" DECIMAL(10,7);
