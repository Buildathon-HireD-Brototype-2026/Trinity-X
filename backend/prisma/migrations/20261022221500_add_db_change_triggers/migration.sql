-- Migration: Add Realtime Change Notification Triggers
-- Safely creates function and triggers to publish LISTEN/NOTIFY events on db_changes channel
-- Safe to run multiple times (CREATE OR REPLACE / DROP TRIGGER IF EXISTS)
-- Does not alter, insert, or delete any table data.

CREATE OR REPLACE FUNCTION notify_db_change()
RETURNS trigger AS $$
DECLARE
  rec RECORD;
  row_id TEXT;
  payload JSON;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := OLD;
  ELSE
    rec := NEW;
  END IF;

  -- Extract row primary key identifier safely according to table
  CASE TG_TABLE_NAME
    WHEN 'orders' THEN row_id := rec.order_id::text;
    WHEN 'trips' THEN row_id := rec.trip_id::text;
    WHEN 'expenses' THEN row_id := rec.expense_id::text;
    WHEN 'invoices' THEN row_id := rec.invoice_id::text;
    WHEN 'notifications' THEN row_id := rec.notification_id::text;
    WHEN 'companies' THEN row_id := rec.company_id::text;
    WHEN 'trip_payrolls' THEN row_id := rec.payroll_id::text;
    WHEN 'driver_locations' THEN row_id := rec.driver_id::text;
    ELSE row_id := NULL;
  END CASE;

  payload := json_build_object(
    'table', TG_TABLE_NAME,
    'action', TG_OP,
    'id', row_id,
    'timestamp', CURRENT_TIMESTAMP
  );

  PERFORM pg_notify('db_changes', payload::text);
  RETURN rec;
END;
$$ LANGUAGE plpgsql;

-- Orders
DROP TRIGGER IF EXISTS trg_orders_change ON orders;
CREATE TRIGGER trg_orders_change
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION notify_db_change();

-- Trips
DROP TRIGGER IF EXISTS trg_trips_change ON trips;
CREATE TRIGGER trg_trips_change
AFTER INSERT OR UPDATE OR DELETE ON trips
FOR EACH ROW EXECUTE FUNCTION notify_db_change();

-- Expenses
DROP TRIGGER IF EXISTS trg_expenses_change ON expenses;
CREATE TRIGGER trg_expenses_change
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION notify_db_change();

-- Invoices
DROP TRIGGER IF EXISTS trg_invoices_change ON invoices;
CREATE TRIGGER trg_invoices_change
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW EXECUTE FUNCTION notify_db_change();

-- Notifications
DROP TRIGGER IF EXISTS trg_notifications_change ON notifications;
CREATE TRIGGER trg_notifications_change
AFTER INSERT OR UPDATE OR DELETE ON notifications
FOR EACH ROW EXECUTE FUNCTION notify_db_change();

-- Companies
DROP TRIGGER IF EXISTS trg_companies_change ON companies;
CREATE TRIGGER trg_companies_change
AFTER INSERT OR UPDATE OR DELETE ON companies
FOR EACH ROW EXECUTE FUNCTION notify_db_change();

-- Trip Payrolls
DROP TRIGGER IF EXISTS trg_trip_payrolls_change ON trip_payrolls;
CREATE TRIGGER trg_trip_payrolls_change
AFTER INSERT OR UPDATE OR DELETE ON trip_payrolls
FOR EACH ROW EXECUTE FUNCTION notify_db_change();

-- Driver Locations
DROP TRIGGER IF EXISTS trg_driver_locations_change ON driver_locations;
CREATE TRIGGER trg_driver_locations_change
AFTER INSERT OR UPDATE OR DELETE ON driver_locations
FOR EACH ROW EXECUTE FUNCTION notify_db_change();
