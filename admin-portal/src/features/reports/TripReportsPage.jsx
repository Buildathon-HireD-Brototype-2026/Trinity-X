import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  Search,
  RotateCcw,
  Building2,
  Car,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  FileSpreadsheet,
  Check,
  ChevronDown,
  Layers,
  MapPin,
  Users
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getTripReports, exportTripsToCsv } from './reportService';

export default function TripReportsPage() {
  const { user } = useAuth();

  // Role-based access control
  const canExportReports =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'OPERATIONS_ADMIN' ||
    user?.role === 'FINANCIAL_ADMIN' ||
    user?.role === 'admin' ||
    !user?.role; // Default authorized in local mock

  // ── Filter State ───────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState('last30days');
  const [customStart, setCustomStart] = useState('2026-10-01');
  const [customEnd, setCustomEnd] = useState('2026-10-21');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data State ─────────────────────────────────────────────────────────────
  const [reportData, setReportData] = useState({
    metrics: {
      totalTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      inTransitTrips: 0,
      grossRevenue: 0,
      driverPayouts: 0,
      platformMargin: 0,
      completionRate: 100,
      avgTripFare: 0
    },
    dailyVolume: [],
    corporateSpend: [],
    vehicleDemand: [],
    trips: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);

  // Sorting state for audit ledger
  const [sortField, setSortField] = useState('pickupTime');
  const [sortOrder, setSortOrder] = useState('desc');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch Report Analytics ─────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setErrorMessage('');

    // Validation: Custom date range start must be <= end
    if (datePreset === 'custom') {
      if (customStart && customEnd && customStart > customEnd) {
        setErrorMessage('Start date cannot be after end date.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const data = await getTripReports({
        preset: datePreset,
        startDate: customStart,
        endDate: customEnd,
        companyId: companyFilter,
        vehicleType: vehicleFilter,
        status: statusFilter,
        search: searchQuery
      });
      setReportData(data);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to aggregate fleet reports.');
    } finally {
      setIsLoading(false);
    }
  }, [datePreset, customStart, customEnd, companyFilter, vehicleFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // ── Reset Filters ──────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setDatePreset('last30days');
    setCustomStart('2026-10-01');
    setCustomEnd('2026-10-21');
    setCompanyFilter('ALL');
    setVehicleFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    setErrorMessage('');
    showToast('Filters reset to default 30-day window.', 'info');
  };

  // ── CSV Export Handler ─────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    if (!canExportReports) {
      showToast('Export disabled: Read-only access.', 'error');
      return;
    }
    if (reportData.trips.length === 0) {
      showToast('No trip records available to export for the selected filter.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      // Simulate minor generation delay for UX feedback
      await new Promise((r) => setTimeout(r, 400));
      exportTripsToCsv(reportData.trips, 'hired-trips-report');
      showToast(`Exported ${reportData.trips.length} trip records to CSV.`);
    } catch (err) {
      showToast(err.message || 'Failed to export CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Sorted Ledger Records ──────────────────────────────────────────────────
  const sortedTrips = useMemo(() => {
    const list = [...reportData.trips];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (sortField === 'pickupTime') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [reportData.trips, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // PII masking for view-only sessions
  const maskPhone = (phone) => {
    if (!phone) return '—';
    if (canExportReports) return phone;
    const parts = phone.split(' ');
    if (parts.length >= 3) return `${parts[0]} ${parts[1]} •••••`;
    return phone.slice(0, 7) + '•••••';
  };

  // Status Badge Renderer
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span
            className="badge badge-emerald"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              fontWeight: 600,
              fontSize: '0.72rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px'
            }}
          >
            <CheckCircle2 size={11} />
            <span>Completed</span>
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#faf5ff',
              color: '#6A379F',
              border: '1px solid #d8b4fe',
              fontWeight: 600,
              fontSize: '0.72rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px'
            }}
          >
            <Car size={11} />
            <span>In Transit</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            className="badge badge-red"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              fontWeight: 600,
              fontSize: '0.72rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px'
            }}
          >
            <XCircle size={11} />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span
            className="badge badge-amber"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              fontWeight: 600,
              fontSize: '0.72rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px'
            }}
          >
            <Clock size={11} />
            <span>{status}</span>
          </span>
        );
    }
  };

  const { metrics } = reportData;

  return (
    <div className="reports-page-container" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ── Toast Feedback Notification ── */}
      {toast && (
        <div
          className={`toast-notification toast-${toast.type}`}
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius)',
            background: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#3b82f6' : '#10b981',
            color: '#ffffff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Header Operations Strip ── */}
      <div
        className="reports-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem'
            }}
          >
            <BarChart3 style={{ color: '#6A379F' }} size={24} />
            <span>Trip Reports & Performance Analytics</span>
          </h1>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Comprehensive financial reconciliation, corporate volume velocity, driver payouts, and platform commission ledger.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetFilters}
            id="reset-filters-btn"
            title="Reset filters to default"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.85rem',
              fontSize: '0.8125rem'
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Filters</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleExportCSV}
            disabled={isExporting || !canExportReports}
            id="export-csv-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.1rem',
              fontSize: '0.8125rem',
              background: '#6A379F',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: canExportReports && !isExporting ? 'pointer' : 'not-allowed',
              opacity: canExportReports ? 1 : 0.6
            }}
          >
            {isExporting ? (
              <>
                <span className="spinner-border" style={{ width: '14px', height: '14px' }} />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>Export to CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── View-Only Notice ── */}
      {!canExportReports && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#b45309',
            fontSize: '0.8125rem'
          }}
        >
          <ShieldAlert size={16} />
          <span>View-Only Mode: You have read-only auditor access. Data export is restricted.</span>
        </div>
      )}

      {/* ── Validation Error Banner ── */}
      {errorMessage && (
        <div
          className="page-error-banner"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8125rem'
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Executive KPI Metrics Strip (PRD A-08, A-11) ── */}
      <div
        className="kpi-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        {/* Metric 1: Total Trips */}
        <div
          className="kpi-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#f3e8ff',
              color: '#6A379F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Car size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Trips
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {metrics.totalTrips}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#15803d' }}>
              {metrics.completedTrips} completed • {metrics.cancelledTrips} cancelled
            </span>
          </div>
        </div>

        {/* Metric 2: Gross Merchandise Value */}
        <div
          className="kpi-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <DollarSign size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Gross Revenue (GMV)
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#047857', lineHeight: 1.2 }}>
              ₹{metrics.grossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Avg. Fare: ₹{metrics.avgTripFare.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Metric 3: Driver Payouts */}
        <div
          className="kpi-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Driver Payouts
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>
              ₹{metrics.driverPayouts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Settled to partner fleet
            </span>
          </div>
        </div>

        {/* Metric 4: Platform Margin */}
        <div
          className="kpi-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#faf5ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Platform Margin
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#6A379F', lineHeight: 1.2 }}>
              ₹{metrics.platformMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Net commission retained
            </span>
          </div>
        </div>

        {/* Metric 5: Completion Rate */}
        <div
          className="kpi-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Completion Rate
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', lineHeight: 1.2 }}>
              {metrics.completionRate}%
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {metrics.inTransitTrips} currently on road
            </span>
          </div>
        </div>
      </div>

      {/* ── Multi-Dimension Filter Toolbar ── */}
      <div
        className="reports-filter-box"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem'
        }}
      >
        {/* Top Row: Date Presets & Custom Range */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            justifyContent: 'space-between'
          }}
        >
          {/* Segmented Date Presets */}
          <div
            style={{
              display: 'inline-flex',
              gap: '0.25rem',
              background: 'var(--background)',
              padding: '0.25rem',
              borderRadius: 'calc(var(--radius) - 2px)',
              border: '1px solid var(--border)'
            }}
          >
            {[
              { id: 'today', label: 'Today' },
              { id: 'last7days', label: 'Last 7 Days' },
              { id: 'thismonth', label: 'This Month' },
              { id: 'last30days', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom Range' }
            ].map((p) => {
              const active = datePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  id={`preset-${p.id}`}
                  onClick={() => setDatePreset(p.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    border: 'none',
                    borderRadius: '4px',
                    background: active ? '#6A379F' : 'transparent',
                    color: active ? '#ffffff' : 'var(--text-muted)',
                    fontSize: '0.78125rem',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers (visible when custom selected) */}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>From:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  id="custom-start-date"
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    background: 'var(--background)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>To:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  id="custom-end-date"
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    background: 'var(--background)'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Row: Corporate Client, Vehicle, Status, Search */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            alignItems: 'center'
          }}
        >
          {/* Corporate Client Dropdown */}
          <div>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              id="report-company-filter"
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            >
              <option value="ALL">All Corporate Clients</option>
              <option value="1">Acme Technologies Pvt Ltd</option>
              <option value="2">Nexus Logistics India</option>
              <option value="3">CloudScale Systems India</option>
              <option value="4">Starlight Financial Services</option>
              <option value="5">Vertex Mobility Tech</option>
            </select>
          </div>

          {/* Vehicle Class Dropdown */}
          <div>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              id="report-vehicle-filter"
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            >
              <option value="ALL">All Vehicle Classes</option>
              <option value="Sedan">Sedan Fleet</option>
              <option value="SUV">SUV Fleet</option>
              <option value="Hatchback">Hatchback Fleet</option>
            </select>
          </div>

          {/* Trip Status Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              id="report-status-filter"
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            >
              <option value="ALL">All Trip Statuses</option>
              <option value="COMPLETED">Completed Only</option>
              <option value="CANCELLED">Cancelled Only</option>
              <option value="IN_TRANSIT">In Transit Only</option>
            </select>
          </div>

          {/* Multi-Field Search */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search Trip ID, passenger, driver, plate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="report-search-input"
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem 0.5rem 2rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Visual Analytics Section ── */}
      <div
        className="analytics-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        {/* Chart 1: Daily Volume & Velocity Trend */}
        <div
          className="chart-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '0.925rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Daily Trip Volume Trend
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Ride velocity across selected time interval
              </span>
            </div>
            <BarChart3 size={16} style={{ color: '#6A379F' }} />
          </div>

          {/* Simple Clean Responsive SVG Bar Chart */}
          {reportData.dailyVolume.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '140px', paddingTop: '1rem' }}>
              {reportData.dailyVolume.map((item) => {
                const maxCount = Math.max(...reportData.dailyVolume.map((d) => d.count), 1);
                const barHeight = Math.max((item.count / maxCount) * 100, 15);
                return (
                  <div
                    key={item.date}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem',
                      height: '100%',
                      justifyContent: 'flex-end'
                    }}
                    title={`${item.date}: ${item.count} trips (₹${item.revenue.toFixed(2)})`}
                  >
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {item.count}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '36px',
                        height: `${barHeight}%`,
                        background: 'linear-gradient(180deg, #8b5cf6 0%, #6A379F 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease'
                      }}
                    />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              No volume data for this interval
            </div>
          )}
        </div>

        {/* Chart 2: Corporate Client Spend Distribution */}
        <div
          className="chart-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '0.925rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Corporate Client Spend
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Account revenue and utilization share
              </span>
            </div>
            <Building2 size={16} style={{ color: '#059669' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reportData.corporateSpend.slice(0, 4).map((c) => (
              <div key={c.companyName} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78125rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.companyName}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    ₹{c.spend.toLocaleString('en-IN')} ({c.count} rides)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${c.percentage}%`,
                      height: '100%',
                      background: '#10b981',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Fleet Vehicle Demand & Financial Ratio */}
        <div
          className="chart-card"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '0.925rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Fleet Category Share
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Dispatches by vehicle classification
              </span>
            </div>
            <Layers size={16} style={{ color: '#2563eb' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {reportData.vehicleDemand.map((v) => (
              <div key={v.type} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78125rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{v.type} Class</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {v.count} trips ({v.percentage}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${v.percentage}%`,
                      height: '100%',
                      background: v.type === 'Sedan' ? '#3b82f6' : v.type === 'SUV' ? '#f59e0b' : '#ec4899',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Detailed Tabular Trip Audit Ledger ── */}
      <div
        className="reports-ledger-card"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden'
        }}
      >
        {/* Ledger Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              Trip Audit Ledger ({sortedTrips.length} Records)
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Detailed financial reconciliation and journey event log
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing {sortedTrips.length} of {reportData.metrics.totalTrips} filtered rides
          </span>
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            className="reports-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.8125rem'
            }}
          >
            <thead>
              <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                <th
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('tripId')}
                >
                  Trip Ref {sortField === 'tripId' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('pickupTime')}
                >
                  Date / Time {sortField === 'pickupTime' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th style={{ padding: '0.75rem 1rem' }}>Corporate Client</th>
                <th style={{ padding: '0.75rem 1rem' }}>Passenger</th>
                <th style={{ padding: '0.75rem 1rem' }}>Driver & Vehicle</th>
                <th style={{ padding: '0.75rem 1rem' }}>Route</th>
                <th
                  style={{ padding: '0.75rem 1rem', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleSort('amount')}
                >
                  Fare (₹) {sortField === 'amount' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Driver Payout</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Platform Fee</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrips.length > 0 ? (
                sortedTrips.map((trip) => (
                  <tr
                    key={trip.tripId}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hover, #f8fafc)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Trip Ref */}
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                      #TRP-{trip.tripId}
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                        ORD-{trip.orderId}
                      </span>
                    </td>

                    {/* Date / Time */}
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                        {new Date(trip.pickupTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(trip.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Corporate Client */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{trip.companyName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Split: {trip.driverSplit}% / {trip.hiredSplit}%
                      </div>
                    </td>

                    {/* Passenger */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{trip.passengerName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {maskPhone(trip.passengerPhone)}
                      </div>
                    </td>

                    {/* Driver & Vehicle */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {trip.driverName ? (
                        <>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{trip.driverName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {trip.vehicleNumber} ({trip.vehicleType})
                          </div>
                        </>
                      ) : (
                        <span style={{ color: '#d97706', fontSize: '0.75rem', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Route */}
                    <td style={{ padding: '0.75rem 1rem', maxWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: '#16a34a' }}>●</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.pickupSpot}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: '#ef4444' }}>●</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{trip.dropoffSpot}</span>
                      </div>
                    </td>

                    {/* Gross Fare */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{Number(trip.amount).toFixed(2)}
                    </td>

                    {/* Driver Payout */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>
                      ₹{Number(trip.driverEarning || 0).toFixed(2)}
                    </td>

                    {/* Platform Fee */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#6A379F' }}>
                      ₹{Number(trip.platformCommission || 0).toFixed(2)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      {renderStatusBadge(trip.tripStatus)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <FileSpreadsheet size={36} style={{ color: 'var(--border)' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                        No trips found matching criteria
                      </div>
                      <span style={{ fontSize: '0.78125rem' }}>
                        Try clearing search or expanding the date preset interval.
                      </span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleResetFilters}
                        style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
