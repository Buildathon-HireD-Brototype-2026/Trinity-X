import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Siren,
  AlertTriangle,
  HeartPulse,
  Wrench,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  User,
  Building2,
  Car,
  ChevronRight,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  FileText
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  fetchAllSosAlerts,
  claimSosAlert,
  getReasonMeta,
  formatElapsed,
  formatDateTime
} from './sosService';
import ResolveSosModal from './ResolveSosModal';
import SosDetailsModal from './SosDetailsModal';
import SimulateSosModal from './SimulateSosModal';

export default function SosEmergencyPage({ onActiveCountChange }) {
  const { user } = useAuth();
  const currentAdminId = user?.adminId || user?.id?.replace(/^ADM-/, '') || 1;

  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
  const [reasonFilter, setReasonFilter] = useState('ALL'); // 'ALL' | 'MEDICAL_EMERGENCY' | 'VEHICLE_DAMAGE'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());

  // Modals state
  const [activeAlertForResolve, setActiveAlertForResolve] = useState(null);
  const [activeAlertForDetails, setActiveAlertForDetails] = useState(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);

  // Claim loading state per alert ID
  const [claimingIds, setClaimingIds] = useState(new Set());

  // Toast feedback state
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  // ── Load All Alerts ────────────────────────────────────────────────────────
  const loadAlerts = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    setPageError('');
    try {
      const data = await fetchAllSosAlerts({ status: 'ALL' });
      setAlerts(data);
      setLastRefreshedAt(new Date());

      // Notify parent of active count
      const activeCount = data.filter((a) => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length;
      if (onActiveCountChange) {
        onActiveCountChange(activeCount);
      }
    } catch (err) {
      if (!isBackground) {
        setPageError(err.message || 'Failed to connect to SOS emergency backend.');
      }
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [onActiveCountChange]);

  // Initial load
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Auto-refresh interval (10 seconds)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadAlerts(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadAlerts]);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ── Claim SOS Alert ────────────────────────────────────────────────────────
  const handleClaim = async (alert) => {
    const alertId = alert.alertId;
    setClaimingIds((prev) => new Set(prev).add(alertId));

    try {
      const updated = await claimSosAlert(alertId);
      setAlerts((prev) => prev.map((a) => (a.alertId === alertId ? updated : a)));
      showToast(`Emergency Incident #${alertId} claimed successfully.`);

      if (onActiveCountChange) {
        onActiveCountChange(alerts.filter((a) => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length);
      }
    } catch (err) {
      if (err.isAlreadyClaimed) {
        showToast(`Incident #${alertId} was already claimed by ${err.claimedByAdminName}.`, 'error');
        // Refresh alerts list
        loadAlerts(true);
      } else {
        showToast(err.message || 'Failed to claim incident.', 'error');
      }
    } finally {
      setClaimingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  // ── Resolved Callback ──────────────────────────────────────────────────────
  const handleResolvedSuccess = (updatedAlert) => {
    setAlerts((prev) => prev.map((a) => (a.alertId === updatedAlert.alertId ? updatedAlert : a)));
    showToast(`Incident #${updatedAlert.alertId} has been successfully resolved.`, 'success');
    if (onActiveCountChange) {
      onActiveCountChange(alerts.filter((a) => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length);
    }
  };

  // ── Simulated Callback ─────────────────────────────────────────────────────
  const handleSimulatedSuccess = (newAlert) => {
    setAlerts((prev) => [newAlert, ...prev.filter((a) => a.alertId !== newAlert.alertId)]);
    showToast(`Test Emergency Incident #${newAlert.alertId} broadcasted to console.`, 'success');
    if (onActiveCountChange) {
      onActiveCountChange(alerts.filter((a) => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length + 1);
    }
  };

  // ── Filtered Incidents ─────────────────────────────────────────────────────
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Status filter
      if (statusFilter !== 'ALL' && alert.status !== statusFilter) return false;

      // Reason filter
      if (reasonFilter !== 'ALL' && alert.reason !== reasonFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDriver = alert.driverName?.toLowerCase().includes(q);
        const matchesCompany = alert.companyName?.toLowerCase().includes(q);
        const matchesNotes = alert.notes?.toLowerCase().includes(q);
        const matchesTrip = String(alert.tripId).includes(q);
        const matchesId = String(alert.alertId).includes(q);
        if (!matchesDriver && !matchesCompany && !matchesNotes && !matchesTrip && !matchesId) {
          return false;
        }
      }

      return true;
    });
  }, [alerts, statusFilter, reasonFilter, searchQuery]);

  // Metrics
  const openAlertsCount = alerts.filter((a) => a.status === 'OPEN').length;
  const inProgressCount = alerts.filter((a) => a.status === 'IN_PROGRESS').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;
  const totalCount = alerts.length;

  return (
    <div className="sos-emergency-page" style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes subtleRadar {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .pulse-beacon {
          animation: pulseGlow 2s infinite;
        }
        .radar-badge {
          animation: subtleRadar 2.5s infinite ease-in-out;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 10000,
            padding: '0.875rem 1.25rem',
            borderRadius: '12px',
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Top Header Bar ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            className={openAlertsCount > 0 ? 'pulse-beacon' : ''}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: openAlertsCount > 0 ? '#ef4444' : 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: openAlertsCount > 0 ? '0 8px 20px rgba(239, 68, 68, 0.4)' : '0 8px 20px rgba(106, 55, 159, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            <Siren size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  margin: 0,
                  letterSpacing: '-0.02em'
                }}
              >
                Emergency SOS Dispatch
              </h1>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: openAlertsCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: openAlertsCount > 0 ? '#ef4444' : '#10b981',
                  border: `1px solid ${openAlertsCount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: openAlertsCount > 0 ? '#ef4444' : '#10b981'
                  }}
                />
                {openAlertsCount > 0 ? `${openAlertsCount} CRITICAL ALERT(S)` : 'ALL CLEAR • LIVE'}
              </div>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Real-time driver distress monitoring, instant dispatch claim, and resolution commander
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Auto-Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh((prev) => !prev)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: autoRefresh ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface)',
              color: autoRefresh ? '#10b981' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Toggle 10-second automatic background refresh"
          >
            <Radio size={14} className={autoRefresh ? 'spin' : ''} />
            <span>{autoRefresh ? 'Live Stream: ON' : 'Live Stream: PAUSED'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => loadAlerts(false)}
            disabled={isLoading}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            title="Refresh incidents immediately"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Simulate SOS (Demo & Test) */}
          <button
            type="button"
            onClick={() => setIsSimulateOpen(true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '9px',
              border: 'none',
              background: 'linear-gradient(135deg, #6A379F 0%, #7c3aed 100%)',
              color: '#ffffff',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 14px rgba(106, 55, 159, 0.35)'
            }}
          >
            <Sparkles size={15} />
            <span>Simulate Incident (Test Demo)</span>
          </button>
        </div>
      </div>

      {/* ── Critical Incident Warning Banner (if OPEN alerts exist) ── */}
      {openAlertsCount > 0 && (
        <div
          role="alert"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(185, 28, 28, 0.08) 100%)',
            border: '2px solid #ef4444',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '18px',
                flexShrink: 0
              }}
            >
              !
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#ef4444', letterSpacing: '0.01em' }}>
                PRIORITY 1: {openAlertsCount} UNCLAIMED EMERGENCY INCIDENT{openAlertsCount > 1 ? 'S' : ''} AWAITING DISPATCH
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', opacity: 0.9 }}>
                Drivers are stranded or experiencing emergency distress. Operators must claim incidents immediately to coordinate medical assistance or replacement vehicles.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter('OPEN')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#ef4444',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)'
            }}
          >
            View Urgent Only <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── KPI Metric Cards Row ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {/* Card 1: Open / Critical */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '14px',
            background: 'var(--surface)',
            border: openAlertsCount > 0 ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border)',
            boxShadow: openAlertsCount > 0 ? '0 10px 20px -5px rgba(239, 68, 68, 0.2)' : 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              CRITICAL / UNCLAIMED
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: openAlertsCount > 0 ? '#ef4444' : 'var(--text-main)', lineHeight: 1.1, marginTop: '0.25rem' }}>
              {openAlertsCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: openAlertsCount > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
              {openAlertsCount > 0 ? '● Immediate action required' : 'Fleet secure'}
            </span>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Card 2: In Progress / Dispatched */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              DISPATCHED / ACTIVE
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1.1, marginTop: '0.25rem' }}>
              {inProgressCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Assigned to operators
            </span>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldAlert size={22} />
          </div>
        </div>

        {/* Card 3: Resolved */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              RESOLVED INCIDENTS
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1, marginTop: '0.25rem' }}>
              {resolvedCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Successfully closed
            </span>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Card 4: Total Logged */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              LIFETIME INCIDENTS
            </span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1, marginTop: '0.25rem' }}>
              {totalCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Audited in database
            </span>
          </div>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--primary-subtle)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FileText size={22} />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div
        style={{
          background: 'var(--surface)',
          padding: '1rem',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '420px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by driver, partner, trip ID, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem 0.6rem 2.25rem',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
          {/* Status Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--background)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border)'
            }}
          >
            {[
              { id: 'ALL', label: 'All', count: totalCount },
              { id: 'OPEN', label: 'Urgent', count: openAlertsCount, isUrgent: openAlertsCount > 0 },
              { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount },
              { id: 'RESOLVED', label: 'Resolved', count: resolvedCount }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: statusFilter === tab.id ? 'var(--surface)' : 'transparent',
                  color:
                    statusFilter === tab.id
                      ? tab.isUrgent
                        ? '#ef4444'
                        : 'var(--primary)'
                      : 'var(--text-muted)',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: statusFilter === tab.id ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '1px 5px',
                    borderRadius: '999px',
                    background: tab.isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                    color: tab.isUrgent ? '#ef4444' : 'inherit',
                    fontWeight: 700
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Reason Filter Dropdown */}
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="ALL">All Incident Types</option>
            <option value="MEDICAL_EMERGENCY">Medical Emergencies Only</option>
            <option value="VEHICLE_DAMAGE">Vehicle Breakdowns Only</option>
          </select>
        </div>
      </div>

      {/* ── Incidents List / Grid ── */}
      {isLoading && alerts.length === 0 ? (
        <div
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }}
        >
          <RefreshCw size={36} className="spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.25rem' }}>
            Connecting to Live SOS Dispatch...
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Streaming active driver distress signals and fleet incidents from backend
          </p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            background: 'var(--surface)',
            borderRadius: '16px',
            border: '1px solid var(--border)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 0.35rem' }}>
            {statusFilter === 'OPEN'
              ? 'Zero Urgent Unclaimed Alerts!'
              : statusFilter === 'IN_PROGRESS'
              ? 'No Incidents Currently Under Dispatch'
              : 'All Clear on the Fleet Network'}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
            {statusFilter === 'ALL'
              ? 'No emergency distress signals are active or logged. Click "Simulate Incident (Test Demo)" above to test the dispatch workflow.'
              : `No incidents found matching the selected filter criteria.`}
          </p>
          <button
            type="button"
            onClick={() => setIsSimulateOpen(true)}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--primary)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Trigger Demo Emergency
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {filteredAlerts.map((alert) => {
            const reasonMeta = getReasonMeta(alert.reason);
            const isOpen = alert.status === 'OPEN';
            const isInProgress = alert.status === 'IN_PROGRESS';
            const isResolved = alert.status === 'RESOLVED';
            const isClaiming = claimingIds.has(alert.alertId);
            const isClaimedByMe = Number(alert.claimedByAdminId) === Number(currentAdminId);

            return (
              <div
                key={alert.alertId}
                style={{
                  background: 'var(--surface)',
                  borderRadius: '16px',
                  border: isOpen
                    ? '2px solid #ef4444'
                    : isInProgress
                    ? '1.5px solid rgba(245, 158, 11, 0.5)'
                    : '1px solid var(--border)',
                  boxShadow: isOpen
                    ? '0 10px 25px -5px rgba(239, 68, 68, 0.2)'
                    : 'var(--shadow-sm)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Card Header Strip */}
                <div
                  style={{
                    padding: '0.875rem 1.25rem',
                    background: isOpen
                      ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.02) 100%)'
                      : isInProgress
                      ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.02) 100%)'
                      : 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: reasonMeta.bg,
                        border: `1px solid ${reasonMeta.border}`,
                        color: reasonMeta.color,
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      {alert.reason === 'MEDICAL_EMERGENCY' ? <HeartPulse size={14} /> : <Wrench size={14} />}
                      <span>{reasonMeta.label.toUpperCase()}</span>
                    </div>

                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Incident #SOS-{String(alert.alertId).padStart(4, '0')}
                    </span>

                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      • Trip #TRP-{alert.tripId}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <Clock size={13} />
                      <span>{formatElapsed(alert.createdAt)}</span>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={isOpen ? 'radar-badge' : ''}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: isOpen
                          ? '#ef4444'
                          : isInProgress
                          ? 'rgba(245, 158, 11, 0.18)'
                          : 'rgba(16, 185, 129, 0.18)',
                        color: isOpen ? '#ffffff' : isInProgress ? '#f59e0b' : '#10b981',
                        border: isOpen
                          ? 'none'
                          : `1px solid ${isInProgress ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                      }}
                    >
                      {isOpen ? '● UNCLAIMED URGENT' : isInProgress ? `● IN PROGRESS (${alert.claimedByAdminName || 'Claimed'})` : '✓ RESOLVED'}
                    </div>
                  </div>
                </div>

                {/* Card Main Body */}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    {/* Column 1: Driver & Distress Message */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <User size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Driver in Distress
                        </span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        {alert.driverName}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <a
                          href={`tel:${alert.driverPhone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(106, 55, 159, 0.1)',
                            color: 'var(--primary)',
                            fontSize: '0.775rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          <Phone size={13} /> {alert.driverPhone}
                        </a>
                      </div>

                      {/* Driver Quote */}
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          background: reasonMeta.bg,
                          borderLeft: `4px solid ${reasonMeta.color}`,
                          fontSize: '0.85rem',
                          color: 'var(--text-main)',
                          fontStyle: 'italic',
                          lineHeight: 1.45
                        }}
                      >
                        "{alert.notes}"
                      </div>
                    </div>

                    {/* Column 2: Partner & Route Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Building2 size={16} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Corporate Client & Route
                        </span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                        {alert.companyName}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Passenger: <strong>{alert.order?.contactName || 'Corporate Guest'}</strong>
                        {alert.order?.contactPhone && alert.order?.contactPhone !== '—' && ` (${alert.order?.contactPhone})`}
                      </div>

                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', marginTop: '6px', flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-muted)' }}>From:</span>
                          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{alert.order?.pickupSpot || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginTop: '6px', flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-muted)' }}>To:</span>
                          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{alert.order?.dropoffSpot || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Live GPS Location & Map Action */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <MapPin size={16} style={{ color: '#ef4444' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Incident Location
                        </span>
                      </div>

                      <div
                        style={{
                          padding: '0.75rem',
                          borderRadius: '10px',
                          background: 'var(--background)',
                          border: '1px solid var(--border)',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GPS COORDINATES</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                        </div>
                      </div>

                      <a
                        href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                          background: 'var(--surface)',
                          color: 'var(--primary)',
                          fontWeight: 700,
                          fontSize: '0.775rem',
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={13} /> View on Google Maps
                      </a>
                    </div>
                  </div>

                  {/* Resolution Report (if already resolved) */}
                  {isResolved && alert.resolutionNotes && (
                    <div
                      style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        fontSize: '0.825rem',
                        color: 'var(--text-main)'
                      }}
                    >
                      <strong style={{ color: '#10b981' }}>Resolution Report:</strong> {alert.resolutionNotes}
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Closed on {formatDateTime(alert.resolvedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: 'var(--background)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {isOpen && '⚠️ Operator intervention required immediately'}
                    {isInProgress && `Assigned operator: ${alert.claimedByAdminName || 'Admin'}`}
                    {isResolved && `Resolved by dispatch on ${formatDateTime(alert.resolvedAt)}`}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <button
                      type="button"
                      onClick={() => setActiveAlertForDetails(alert)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Full Dossier & Map
                    </button>

                    {/* Claim Button */}
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => handleClaim(alert)}
                        disabled={isClaiming}
                        style={{
                          padding: '0.45rem 1.1rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#ef4444',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: isClaiming ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 4px 10px rgba(239, 68, 68, 0.35)'
                        }}
                      >
                        {isClaiming ? <RefreshCw size={14} className="spin" /> : <ShieldAlert size={14} />}
                        <span>Claim Emergency</span>
                      </button>
                    )}

                    {/* Resolve Button (Active if IN_PROGRESS) */}
                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => setActiveAlertForResolve(alert)}
                        style={{
                          padding: '0.45rem 1.1rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#10b981',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.35)'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Resolve Incident</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      <ResolveSosModal
        isOpen={Boolean(activeAlertForResolve)}
        onClose={() => setActiveAlertForResolve(null)}
        alert={activeAlertForResolve}
        onResolved={handleResolvedSuccess}
      />

      <SosDetailsModal
        isOpen={Boolean(activeAlertForDetails)}
        onClose={() => setActiveAlertForDetails(null)}
        alert={activeAlertForDetails}
        onClaim={handleClaim}
        onOpenResolve={(a) => setActiveAlertForResolve(a)}
        currentAdminId={currentAdminId}
      />

      <SimulateSosModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSimulated={handleSimulatedSuccess}
      />
    </div>
  );
}
