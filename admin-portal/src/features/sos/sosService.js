import apiClient from '../../services/apiClient';

/**
 * Metadata & UI styling for emergency incident reasons
 */
export const REASON_CONFIG = {
  MEDICAL_EMERGENCY: {
    label: 'Medical Emergency',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: 'HeartPulse',
    severity: 'CRITICAL',
    description: 'Driver or passenger requires urgent medical assistance or paramedic dispatch.'
  },
  VEHICLE_DAMAGE: {
    label: 'Vehicle Breakdown',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: 'Wrench',
    severity: 'HIGH',
    description: 'Mechanical failure, puncture, accident, or immobile vehicle on route.'
  },
  DEFAULT: {
    label: 'Emergency Alert',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.12)',
    border: 'rgba(220, 38, 38, 0.3)',
    icon: 'AlertTriangle',
    severity: 'HIGH',
    description: 'Driver triggered high-priority emergency SOS signal.'
  }
};

export function getReasonMeta(reason) {
  return REASON_CONFIG[reason] || REASON_CONFIG.DEFAULT;
}

/**
 * Format relative elapsed time (e.g. "2 mins ago", "just now")
 */
export function formatElapsed(isoDate) {
  if (!isoDate) return 'Just now';
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    if (diffMs < 0) return 'Just now';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recent';
  }
}

/**
 * Format timestamp into standard readable format
 */
export function formatDateTime(isoDate) {
  if (!isoDate) return '—';
  try {
    const d = new Date(isoDate);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return String(isoDate);
  }
}

/**
 * Normalize alert data from backend
 */
export function normalizeSosAlert(alert) {
  if (!alert) return null;

  return {
    alertId: alert.alertId || alert.id,
    tripId: alert.tripId,
    driverId: alert.driverId,
    orderId: alert.orderId,
    reason: alert.reason || 'VEHICLE_DAMAGE',
    notes: alert.notes || 'No description provided by driver.',
    latitude: alert.latitude != null ? Number(alert.latitude) : 10.0159,
    longitude: alert.longitude != null ? Number(alert.longitude) : 76.3419,
    status: (alert.status || 'OPEN').toUpperCase(),
    primaryAdminId: alert.primaryAdminId,
    claimedByAdminId: alert.claimedByAdminId,
    claimedByAdminName: alert.claimedByAdminName || (alert.claimedByAdmin?.adminName) || null,
    claimedAt: alert.claimedAt,
    resolvedAt: alert.resolvedAt,
    resolutionNotes: alert.resolutionNotes || null,
    createdAt: alert.createdAt || new Date().toISOString(),
    updatedAt: alert.updatedAt,
    driverName: alert.driverName || alert.driver?.name || 'Driver',
    driverPhone: alert.driverPhone || alert.driver?.phoneNo || '—',
    companyName: alert.companyName || alert.order?.company?.name || 'Corporate Partner',
    trip: alert.trip || {
      tripId: alert.tripId,
      tripStatus: 'IN_PROGRESS',
      amount: 1500
    },
    order: alert.order || {
      orderId: alert.orderId,
      pickupSpot: 'Pickup Location',
      dropoffSpot: 'Dropoff Location',
      contactName: 'Passenger',
      contactPhone: '—'
    }
  };
}

/**
 * Fetch all active SOS alerts (OPEN and IN_PROGRESS)
 */
export async function fetchActiveSosAlerts() {
  try {
    const res = await apiClient.get('/admin/sos/active');
    const list = res?.data || res || [];
    return Array.isArray(list) ? list.map(normalizeSosAlert) : [];
  } catch (err) {
    console.warn('[SosService] Failed to fetch active SOS alerts:', err.message);
    throw err;
  }
}

/**
 * Fetch all SOS alerts with optional status & search query
 */
export async function fetchAllSosAlerts({ status = 'ALL', search = '' } = {}) {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    if (search && search.trim()) params.set('search', search.trim());

    const url = `/admin/sos${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await apiClient.get(url);
    const list = res?.data || res || [];
    return Array.isArray(list) ? list.map(normalizeSosAlert) : [];
  } catch (err) {
    // If /admin/sos is not available or errors, fall back to /admin/sos/active
    console.warn('[SosService] /admin/sos query failed, falling back to /admin/sos/active:', err.message);
    try {
      const active = await fetchActiveSosAlerts();
      return active;
    } catch {
      throw err;
    }
  }
}

/**
 * Admin: Claim an open SOS alert (Race-safe)
 */
export async function claimSosAlert(alertId) {
  try {
    const res = await apiClient.patch(`/admin/sos/${alertId}/claim`);
    const alert = res?.data || res;
    return normalizeSosAlert(alert);
  } catch (err) {
    // Check if 409 already claimed
    if (err.status === 409 || err.data?.error?.code === 'ALREADY_CLAIMED') {
      const claimer = err.data?.error?.details?.[0]?.claimedByAdminName || 'another administrator';
      const claimedErr = new Error(`Already claimed by ${claimer}`);
      claimedErr.isAlreadyClaimed = true;
      claimedErr.claimedByAdminName = claimer;
      throw claimedErr;
    }
    throw err;
  }
}

/**
 * Admin: Resolve an in-progress SOS alert
 */
export async function resolveSosAlert(alertId, resolutionNotes) {
  if (!resolutionNotes || !resolutionNotes.trim()) {
    throw new Error('Resolution notes are required to resolve an emergency incident.');
  }

  try {
    const res = await apiClient.patch(`/admin/sos/${alertId}/resolve`, {
      resolutionNotes: resolutionNotes.trim()
    });
    const alert = res?.data || res;
    return normalizeSosAlert(alert);
  } catch (err) {
    throw err;
  }
}

/**
 * Admin: Get single SOS alert details
 */
export async function getSosAlertDetails(alertId) {
  try {
    const res = await apiClient.get(`/admin/sos/${alertId}`);
    const alert = res?.data || res;
    return normalizeSosAlert(alert);
  } catch (err) {
    throw err;
  }
}

/**
 * Admin: Trigger simulated test SOS alert on an active trip for testing/demo
 */
export async function simulateSosIncident({ tripId, reason, notes, latitude, longitude } = {}) {
  try {
    const res = await apiClient.post('/admin/sos/simulate', {
      tripId,
      reason,
      notes,
      latitude,
      longitude
    });
    const alert = res?.data || res;
    return normalizeSosAlert(alert);
  } catch (err) {
    throw err;
  }
}
