/**
 * reportService.js
 * Multi-Domain Enterprise Reporting & Fleet Analytics Engine.
 * Connected directly to PostgreSQL backend via apiClient.
 * Implements CWE-1236 Formula Injection Defense across all CSV exports.
 */
import apiClient from '../../services/apiClient';

export const REPORT_TYPES = [
  { id: 'trips', label: 'Trip Report', icon: 'Car', description: 'Comprehensive trip lifecycle, fares, and route audit.' },
  { id: 'billing_issues', label: 'Billing Issues', icon: 'AlertCircle', description: 'Disputed fares, toll mismatches, and invoice exceptions.' },
  { id: 'driver_delays', label: 'Driver Delay Report', icon: 'Clock', description: 'Pickup punctuality, delay analysis, and SLA tracking.' },
  { id: 'client_volume', label: 'Client Order Volume & SLA', icon: 'Building2', description: 'Corporate account order demand, spend, and success rates.' },
  { id: 'driver_payouts', label: 'Driver Payout Report', icon: 'DollarSign', description: 'Driver earnings, platform commission, and settlement ledger.' },
  { id: 'orders', label: 'Order Report', icon: 'PackageCheck', description: 'Booking demand, lead times, and fulfillment dispatch status.' },
  { id: 'driver_work', label: 'Driver (Staff) Work Report', icon: 'Users', description: 'Shift duty hours, distance traveled, and driver performance scores.' },
];

export let COMPANIES_LIST = [];

/**
 * Fetch client companies for report filtering from backend database
 */
export async function getReportCompanies() {
  try {
    const res = await apiClient.get('/admin/companies');
    const items = res?.data || [];
    COMPANIES_LIST = items.map((c) => ({
      id: String(c.companyId || c.company_id || c.id),
      name: c.name
    }));
    return COMPANIES_LIST;
  } catch {
    return [];
  }
}

/**
 * Helper to compute date range
 */
function getDateBoundary(preset, customStart, customEnd) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (preset === 'last7days') {
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (preset === 'last30days') {
    start.setDate(now.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  } else if (preset === 'monthToDate') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === 'custom') {
    if (customStart) start = new Date(customStart);
    if (customEnd) {
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    }
  }

  return { start, end };
}

/**
 * Universal Data Fetcher for Reports
 */
export async function getReportData(reportType = 'trips', options = {}) {
  const {
    tripScope = 'all',
    preset = 'last30days',
    startDate,
    endDate,
    companyId = 'ALL',
    vehicleType = 'ALL',
    status = 'ALL',
    search = ''
  } = options;

  const { start, end } = getDateBoundary(preset, startDate, endDate);
  const q = search.trim().toLowerCase();

  // For trip and order reports, fetch real database records from /admin/orders
  if (reportType === 'trips' || reportType === 'orders') {
    let orders = [];
    try {
      const res = await apiClient.get('/admin/orders');
      orders = Array.isArray(res?.data) ? res.data : [];
    } catch {
      orders = [];
    }

    if (reportType === 'trips') {
      let trips = [];
      for (const o of orders) {
        if (o.trip) {
          const trip = o.trip;
          const tripDate = new Date(trip.created_at || o.created_at || Date.now());
          if (tripDate >= start && tripDate <= end) {
            trips.push({
              tripId: trip.trip_id,
              orderId: o.order_id,
              companyId: o.company_id,
              companyName: o.company_name || 'Corporate Client',
              passengerName: o.contact_name || '',
              passengerPhone: o.contact_phone || '',
              pickupSpot: o.pickup_spot || '',
              dropoffSpot: o.dropoff_spot || '',
              pickupTime: o.pickup_time || '',
              vehicleType: o.vehicle_type || 'Sedan',
              amount: Number(trip.amount || 0),
              driverId: trip.driver_id,
              driverName: trip.driver_name || '—',
              driverPhone: trip.driver_phone || '—',
              vehicleNumber: trip.vehicle_number || '—',
              driverEarning: Number(trip.amount || 0) * 0.8,
              platformCommission: Number(trip.amount || 0) * 0.2,
              tripStatus: trip.status || trip.trip_status || 'UNASSIGNED',
              createdAt: trip.created_at || o.created_at
            });
          }
        }
      }

      if (tripScope === 'live') {
        trips = trips.filter((t) => t.tripStatus === 'IN_TRANSIT' || t.tripStatus === 'SCHEDULED');
      }
      if (companyId !== 'ALL') {
        trips = trips.filter((t) => String(t.companyId) === String(companyId));
      }
      if (vehicleType !== 'ALL') {
        trips = trips.filter((t) => (t.vehicleType || '').toLowerCase() === vehicleType.toLowerCase());
      }
      if (status !== 'ALL') {
        trips = trips.filter((t) => t.tripStatus === status);
      }
      if (q) {
        trips = trips.filter((t) =>
          `trp-${t.tripId}`.toLowerCase().includes(q) ||
          (t.companyName || '').toLowerCase().includes(q) ||
          (t.passengerName || '').toLowerCase().includes(q) ||
          (t.driverName || '').toLowerCase().includes(q)
        );
      }

      const completed = trips.filter((t) => t.tripStatus === 'COMPLETED');
      const gross = completed.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const payouts = completed.reduce((sum, t) => sum + Number(t.driverEarning || 0), 0);
      const margin = completed.reduce((sum, t) => sum + Number(t.platformCommission || 0), 0);

      return {
        reportType: 'trips',
        tripScope,
        metrics: [
          { label: 'Total Trips Tracked', value: trips.length, sub: `${completed.length} completed`, icon: 'Car' },
          { label: 'Gross Volume (GMV)', value: `₹${gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Fares billed', icon: 'DollarSign' },
          { label: 'Driver Disbursements', value: `₹${payouts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Net driver earnings', icon: 'Users' },
          { label: 'Platform Revenue', value: `₹${margin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, sub: 'Platform commission', icon: 'TrendingUp' }
        ],
        records: trips
      };
    }

    if (reportType === 'orders') {
      let filteredOrders = orders.filter((o) => {
        const orderDate = new Date(o.created_at || Date.now());
        return orderDate >= start && orderDate <= end;
      });

      if (companyId !== 'ALL') {
        filteredOrders = filteredOrders.filter((o) => String(o.company_id) === String(companyId));
      }
      if (status !== 'ALL') {
        filteredOrders = filteredOrders.filter((o) => o.status === status);
      }

      const accepted = filteredOrders.filter((o) => o.status === 'ACCEPTED').length;
      const rejected = filteredOrders.filter((o) => o.status === 'REJECTED').length;
      const pending = filteredOrders.filter((o) => o.status === 'RECEIVED' || o.status === 'PENDING').length;

      return {
        reportType: 'orders',
        metrics: [
          { label: 'Total Demand Inbound', value: filteredOrders.length, sub: 'All channel bookings', icon: 'PackageCheck' },
          { label: 'Accepted & Dispatched', value: accepted, sub: 'Fulfillment confirmed', icon: 'CheckCircle2' },
          { label: 'Rejected Inbound', value: rejected, sub: 'Declined bookings', icon: 'AlertCircle' },
          { label: 'Pending Processing', value: pending, sub: 'Awaiting dispatch', icon: 'Clock' }
        ],
        records: filteredOrders.map((o) => ({
          orderId: o.order_id,
          companyName: o.company_name || 'Corporate Client',
          source: o.source || 'B2B_PORTAL',
          passengerName: o.contact_name || '',
          passengerPhone: o.contact_phone || '',
          pickupSpot: o.pickup_spot || '',
          dropoffSpot: o.dropoff_spot || '',
          pickupTime: o.pickup_time || '',
          status: o.status,
          fare: o.estimated_fare || o.trip?.amount || 0,
          createdAt: o.created_at
        }))
      };
    }
  }

  // For other domain reports without backend endpoints yet, return clean empty records
  return {
    reportType,
    metrics: [],
    records: []
  };
}

/**
 * Defense against CWE-1236 Formula Injection.
 * Prefixes cells starting with dangerous characters (=, +, -, @, \t, \r) with an apostrophe.
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value).trim();
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  const firstChar = str.charAt(0);
  const isDangerous = dangerousPrefixes.includes(firstChar);

  let sanitized = isDangerous ? `'${str}` : str;
  sanitized = sanitized.replace(/"/g, '""');
  return `"${sanitized}"`;
}

/**
 * Universal CSV Exporter
 */
export function exportReportToCsv(reportType = 'trips', records = [], filenamePrefix = 'hired-report') {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('No records available to export for the selected filter.');
  }

  const sample = records[0];
  const headers = Object.keys(sample);

  const headerRow = headers.map((h) => sanitizeCsvCell(h.toUpperCase())).join(',');
  const dataRows = records.map((row) =>
    headers.map((h) => sanitizeCsvCell(row[h])).join(',')
  );

  const csvContent = [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}-${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTripsToCsv(trips, filenamePrefix = 'hired-trips-report') {
  return exportReportToCsv('trips', trips, filenamePrefix);
}
