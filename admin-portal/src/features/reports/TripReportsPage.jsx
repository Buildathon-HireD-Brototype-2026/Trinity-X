import { getFriendlyError, getFriendlyLoadError } from '../../utils/friendlyError';
import React, { useState, useEffect, useCallback } from 'react';
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
  Clock,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  MapPin,
  Users,
  PackageCheck,
  Award,
  Zap,
  Activity,
  CreditCard,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import {
  REPORT_TYPES,
  COMPANIES_LIST,
  getReportCompanies,
  getReportData,
  exportReportToCsv
} from './reportService';

export default function TripReportsPage() {
  const { user } = useAuth();

  // Role-based access control (RBAC with temporary access granted for admin1@hired.com)
  const normalizedRole = (user?.role || '').trim().toUpperCase();
  const userEmail = (user?.email || '').trim().toLowerCase();
  const canExportReports =
    normalizedRole === 'SUPER_ADMIN' ||
    normalizedRole === 'OPERATIONS_ADMIN' ||
    normalizedRole === 'FINANCIAL_ADMIN' ||
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'SUPERADMIN' ||
    normalizedRole === 'OPERATIONS';

  const [companiesList, setCompaniesList] = useState([]);

  useEffect(() => {
    getReportCompanies()
      .then((data) => setCompaniesList(Array.isArray(data) ? data : []))
      .catch(() => setCompaniesList([]));
  }, []);

  // ── Selected Report Category ───────────────────────────────────────────────
  const [activeReport, setActiveReport] = useState('trips'); // 'trips' | 'billing_issues' | 'driver_delays' | 'client_volume' | 'driver_payouts' | 'orders' | 'driver_work'
  const [tripScope, setTripScope] = useState('all'); // 'all' | 'live' | 'daily' | 'monthly'

  // ── Filter State ───────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState('last30days');
  const [customStart, setCustomStart] = useState('2026-10-01');
  const [customEnd, setCustomEnd] = useState('2026-10-21');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data State ─────────────────────────────────────────────────────────────
  const [reportResult, setReportResult] = useState({
    reportType: 'trips',
    metrics: [],
    records: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch Report Analytics ─────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setErrorMessage('');

    if (datePreset === 'custom') {
      if (customStart && customEnd && customStart > customEnd) {
        setErrorMessage('Start date cannot be after end date.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const data = await getReportData(activeReport, {
        tripScope,
        preset: datePreset,
        startDate: customStart,
        endDate: customEnd,
        companyId: companyFilter,
        vehicleType: vehicleFilter,
        status: statusFilter,
        search: searchQuery
      });
      setReportResult(data);
    } catch (err) {
      setErrorMessage(getFriendlyLoadError(err));
    } finally {
      setIsLoading(false);
    }
  }, [activeReport, tripScope, datePreset, customStart, customEnd, companyFilter, vehicleFilter, statusFilter, searchQuery]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Tab switch handler: safely resets result structure to avoid rendering mismatch
  const handleTabChange = (reportId) => {
    setActiveReport(reportId);
    setReportResult({ reportType: reportId, metrics: [], records: [] });
    setIsLoading(true);
    setSearchQuery('');
  };

  // Reset filters
  const handleResetFilters = () => {
    setDatePreset('last30days');
    setCustomStart('2026-10-01');
    setCustomEnd('2026-10-21');
    setCompanyFilter('ALL');
    setVehicleFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    setTripScope('all');
    setErrorMessage('');
    showToast('Filters reset to defaults.', 'info');
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    if (!canExportReports) {
      showToast('Export disabled: Read-only access.', 'error');
      return;
    }
    if (!reportResult.records || reportResult.records.length === 0) {
      showToast('No records available to export for the selected filter.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 350));
      const prefix = `hired-${activeReport.replace(/_/g, '-')}${activeReport === 'trips' ? `-${tripScope}` : ''}`;
      exportReportToCsv(activeReport, reportResult.records, prefix);
      showToast(`Exported ${reportResult.records.length} records to CSV.`);
    } catch (err) {
      showToast(err.message || 'Failed to export CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // PII masking for view-only sessions
  const maskPhone = (phone) => {
    if (!phone) return '—';
    if (canExportReports) return phone;
    const parts = String(phone).split(' ');
    if (parts.length >= 3) return `${parts[0]} ${parts[1]} •••••`;
    return String(phone).slice(0, 7) + '•••••';
  };

  // Dynamic icon helper
  const getMetricIcon = (iconName) => {
    switch (iconName) {
      case 'Car': return <Car size={18} color="#6A379F" />;
      case 'DollarSign': return <DollarSign size={18} color="#10b981" />;
      case 'Users': return <Users size={18} color="#3b82f6" />;
      case 'TrendingUp': return <TrendingUp size={18} color="#f59e0b" />;
      case 'AlertCircle': return <AlertCircle size={18} color="#ef4444" />;
      case 'Clock': return <Clock size={18} color="#8b5cf6" />;
      case 'CheckCircle2': return <CheckCircle2 size={18} color="#10b981" />;
      case 'Building2': return <Building2 size={18} color="#0284c7" />;
      case 'PackageCheck': return <PackageCheck size={18} color="#d97706" />;
      default: return <BarChart3 size={18} color="#6A379F" />;
    }
  };

  const activeCategoryMeta = REPORT_TYPES.find((r) => r.id === activeReport) || REPORT_TYPES[0];

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3.5rem' }}>
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '2rem',
            zIndex: 9999,
            background: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#3b82f6' : '#10b981',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: 'var(--radius)',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(106, 55, 159, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6A379F'
                }}
              >
                <BarChart3 size={18} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
                Enterprise Reports & Performance Analytics
              </h1>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              Individually generated operational intelligence, financial settlements, punctuality SLA, and corporate audit ledgers.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.45rem 0.9rem',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              color: '#475569'
            }}
          >
            <Sparkles size={14} color="#6A379F" />
            <span>Active Report: <strong>{activeCategoryMeta.label}</strong></span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span><strong>{reportResult.records?.length || 0}</strong> Records Loaded</span>
          </div>
        </div>
      </div>

      {/* ── REPORT CATEGORY SELECTOR TABS ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-light)',
          padding: '0.6rem',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {REPORT_TYPES.map((type) => {
            const isActive = activeReport === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleTabChange(type.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.05rem',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#6A379F' : '#64748b',
                  background: isActive ? 'rgba(106, 55, 159, 0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(106, 55, 159, 0.25)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {type.id === 'trips' && <Car size={15} />}
                {type.id === 'billing_issues' && <AlertCircle size={15} />}
                {type.id === 'driver_delays' && <Clock size={15} />}
                {type.id === 'client_volume' && <Building2 size={15} />}
                {type.id === 'driver_payouts' && <DollarSign size={15} />}
                {type.id === 'orders' && <PackageCheck size={15} />}
                {type.id === 'driver_work' && <Users size={15} />}
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Description sub-strip */}
        <div
          style={{
            marginTop: '0.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.78rem',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={13} color="#6A379F" />
            <span>{activeCategoryMeta.description}</span>
          </div>

          {/* Sub-Frequency Scope Pill (Only visible for Trip Report) */}
          {activeReport === 'trips' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f8fafc', padding: '0.2rem 0.35rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', paddingRight: '0.2rem', fontWeight: 600 }}>Frequency:</span>
              {[
                { id: 'all', label: 'All Trips' },
                { id: 'live', label: '🔴 Live Trips' },
                { id: 'daily', label: '📅 Daily' },
                { id: 'monthly', label: '📊 Monthly' }
              ].map((scope) => (
                <button
                  key={scope.id}
                  type="button"
                  onClick={() => setTripScope(scope.id)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: tripScope === scope.id ? 700 : 500,
                    background: tripScope === scope.id ? '#6A379F' : 'transparent',
                    color: tripScope === scope.id ? '#ffffff' : '#64748b',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── FILTER CONTROLS BAR ── */}
      <div
        className="card"
        style={{
          marginBottom: '1.25rem',
          padding: '1.1rem 1.25rem',
          background: '#ffffff',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
          {/* Segmented Date Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: 'last7days', label: 'Last 7 Days' },
              { id: 'last30days', label: 'Last 30 Days' },
              { id: 'thismonth', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.8125rem',
                  fontWeight: datePreset === p.id ? 700 : 500,
                  color: datePreset === p.id ? '#6A379F' : 'var(--text-muted)',
                  background: datePreset === p.id ? 'rgba(106, 55, 159, 0.08)' : 'var(--bg-main)',
                  border: datePreset === p.id ? '1px solid rgba(106, 55, 159, 0.3)' : '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Action Buttons: Reset & Export CSV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={handleResetFilters}
              title="Reset all filters to defaults"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.95rem',
                fontSize: '0.8125rem'
              }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
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
                padding: '0.55rem 1.15rem',
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
                  <span>Export {activeCategoryMeta.label} to CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* View-Only Notice if role does not allow export */}
        {!canExportReports && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#92400e',
              fontSize: '0.8125rem'
            }}
          >
            <ShieldAlert size={16} />
            <span>
              Your administrative role has view-only access. Full CSV extraction requires Super Admin or Operations Admin privileges.
            </span>
          </div>
        )}

        {/* Custom Date Boundary Picker */}
        {datePreset === 'custom' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem',
              background: '#f8fafc',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #e2e8f0',
              marginBottom: '0.85rem',
              flexWrap: 'wrap'
            }}
          >
            <Calendar size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Custom Boundary:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>
        )}

        {/* Dropdowns Row: Company, Vehicle Class, Status, Search */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={`Search ${activeCategoryMeta.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                fontSize: '0.8125rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-main)'
              }}
            />
          </div>

          {/* Company Filter (for applicable reports) */}
          {(activeReport === 'trips' || activeReport === 'billing_issues' || activeReport === 'driver_delays' || activeReport === 'client_volume' || activeReport === 'orders') && (
            <div>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-main)'
                }}
              >
                <option value="ALL">All Corporate Clients</option>
                {(companiesList.length > 0 ? companiesList : COMPANIES_LIST).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Vehicle Class Filter (for applicable reports) */}
          {(activeReport === 'trips' || activeReport === 'driver_delays' || activeReport === 'driver_payouts' || activeReport === 'orders' || activeReport === 'driver_work') && (
            <div>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-main)'
                }}
              >
                <option value="ALL">All Vehicle Classes</option>
                <option value="Sedan">Sedan (Dzire / Etios)</option>
                <option value="SUV">SUV (Innova Crysta / Ertiga)</option>
                <option value="Hatchback">Hatchback (WagonR)</option>
              </select>
            </div>
          )}

          {/* Status Filter */}
          {activeReport === 'trips' && (
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.8125rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-main)'
                }}
              >
                <option value="ALL">All Trip Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── ERROR MESSAGE BANNER ── */}
      {errorMessage && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fee2e2',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#b91c1c',
            fontSize: '0.875rem'
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── 4 EXECUTIVE KPI METRICS CARDS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        {isLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="card" style={{ height: '95px', background: '#f8fafc', animation: 'pulse 1.5s infinite' }} />
          ))
        ) : (
          reportResult.metrics?.map((m, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                background: '#ffffff',
                padding: '1.15rem 1.25rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {m.label}
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(106, 55, 159, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {getMetricIcon(m.icon)}
                </div>
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {m.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {m.sub}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── ACTIVE REPORT AUDIT LEDGER TABLE ── */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {/* Table Header Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={16} color="#6A379F" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {activeCategoryMeta.label} Detailed Ledger
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                background: 'rgba(106, 55, 159, 0.1)',
                color: '#6A379F',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: 600
              }}
            >
              {reportResult.records?.length || 0} Records
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Export Schema: Formatted & CWE-1236 Sanitized
          </span>
        </div>

        {/* Dynamic Table Content based on activeReport */}
        <div style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner-border" style={{ width: '28px', height: '28px', margin: '0 auto 0.75rem', display: 'block', borderColor: '#6A379F', borderRightColor: 'transparent' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading {activeCategoryMeta.label} records...</p>
            </div>
          ) : !reportResult.records || reportResult.records.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ width: '48px', height: '48px', margin: '0 auto 1rem', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={22} color="#94a3b8" />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                No records found
              </h3>
              <p style={{ fontSize: '0.8125rem', maxWidth: '360px', margin: '0 auto 1rem' }}>
                No records match your selected criteria. Try adjusting date boundaries or resetting the search filter.
              </p>
              <button type="button" className="btn-outline" onClick={handleResetFilters} style={{ fontSize: '0.8125rem', padding: '0.45rem 0.9rem' }}>
                Reset All Filters
              </button>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)', color: '#475569', fontWeight: 600 }}>
                  {/* Conditionally Render Headers according to activeReport */}
                  {activeReport === 'trips' && (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>Trip ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Pickup Time</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Corporate Client</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Passenger</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Driver & Vehicle</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Pickup Destination</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Gross Fare</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Driver Payout</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    </>
                  )}

                  {activeReport === 'billing_issues' && (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>Issue ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Trip & Order</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Corporate Client</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Disputed (INR)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Priority</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Resolution Notes</th>
                    </>
                  )}

                  {activeReport === 'driver_delays' && (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>Trip ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Driver Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Vehicle</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Passenger & Client</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Scheduled</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Actual Arrival</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Delay</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Root Cause</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Punctuality</th>
                    </>
                  )}

                  {activeReport === 'client_volume' && (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>Client ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Corporate Account</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Contract Tier</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Orders</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Completed</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Cancelled</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Success SLA %</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Spend (INR)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Account Health</th>
                    </>
                  )}

                  {activeReport === 'driver_payouts' && (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>Payout ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Driver Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Vehicle Class</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Trips</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Gross Fares</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Platform Fee (20%)</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Net Payout (INR)</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Payout Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Bank / UTR Reference</th>
                    </>
                  )}

                  {activeReport === 'orders' && (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>Order ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Corporate Client</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Passenger</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Booking Type</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Vehicle Class</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Assigned Driver</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Quoted Fare</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Dispatch Speed</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Order Status</th>
                    </>
                  )}

                  {activeReport === 'driver_work' && (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>Driver ID</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Driver Name</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Vehicle Assigned</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Active Shift</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Duty Hours</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Distance (KM)</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Trips Done</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acceptance %</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Rating</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Performance</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* 1. TRIPS ROWS */}
                {activeReport === 'trips' && reportResult.reportType === 'trips' && reportResult.records.map((t) => (
                  <tr key={t.tripId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>TRP-{t.tripId}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                      {t.pickupTime ? new Date(t.pickupTime).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{t.companyName || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{t.passengerName || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{maskPhone(t.passengerPhone)}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{t.driverName || 'Unassigned'}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.vehicleType || '—'} • {t.vehicleNumber || '—'}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.pickupSpot || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                      ₹{Number(t.amount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                      ₹{Number(t.driverEarning || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: t.tripStatus === 'COMPLETED' ? '#dcfce7' : t.tripStatus === 'IN_TRANSIT' ? '#e0e7ff' : t.tripStatus === 'SCHEDULED' ? '#fef3c7' : '#fee2e2',
                          color: t.tripStatus === 'COMPLETED' ? '#15803d' : t.tripStatus === 'IN_TRANSIT' ? '#4338ca' : t.tripStatus === 'SCHEDULED' ? '#b45309' : '#b91c1c'
                        }}
                      >
                        {t.tripStatus || 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* 2. BILLING ISSUES ROWS */}
                {activeReport === 'billing_issues' && reportResult.reportType === 'billing_issues' && reportResult.records.map((b) => (
                  <tr key={b.issueId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#ef4444' }}>{b.issueId}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>TRP-{b.tripId} / ORD-{b.orderId}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{b.companyName}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}>
                        {b.issueType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#b91c1c' }}>
                      ₹{Number(b.disputedAmount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: b.priority === 'HIGH' ? '#dc2626' : '#d97706' }}>
                        {b.priority}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: b.status === 'RESOLVED' ? '#dcfce7' : '#fef3c7',
                          color: b.status === 'RESOLVED' ? '#15803d' : '#b45309'
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.75rem', maxWidth: '280px' }}>
                      {b.resolutionNotes}
                    </td>
                  </tr>
                ))}

                {/* 3. DRIVER DELAYS ROWS */}
                {activeReport === 'driver_delays' && reportResult.reportType === 'driver_delays' && reportResult.records.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>TRP-{d.tripId}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                      <div>{d.driverName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{maskPhone(d.driverPhone)}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{d.vehicleNumber}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{d.passengerName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{d.companyName}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                      {d.scheduledPickup ? new Date(d.scheduledPickup).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                      {d.actualArrival ? new Date(d.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: Number(d.delayMinutes || 0) > 10 ? '#dc2626' : '#475569' }}>
                      {Number(d.delayMinutes || 0) > 0 ? `+${d.delayMinutes} mins` : 'On Time'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.75rem' }}>{d.delayReason}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: d.punctualityStatus === 'ON_TIME' ? '#dcfce7' : '#fee2e2',
                          color: d.punctualityStatus === 'ON_TIME' ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {d.punctualityStatus}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* 4. CLIENT VOLUME ROWS */}
                {activeReport === 'client_volume' && reportResult.reportType === 'client_volume' && reportResult.records.map((c) => (
                  <tr key={c.companyId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>CORP-{c.companyId}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{c.companyName}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                        {c.contractTier}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{c.totalOrders}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>{c.completedTrips}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#b91c1c', fontWeight: 600 }}>{c.cancelledOrders}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, color: Number(c.successRate || 0) >= 95 ? '#15803d' : '#d97706' }}>{c.successRate}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                      ₹{Number(c.totalSpend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: c.status === 'EXCELLENT' ? '#dcfce7' : c.status === 'GOOD' ? '#e0f2fe' : '#fee2e2',
                          color: c.status === 'EXCELLENT' ? '#15803d' : c.status === 'GOOD' ? '#0369a1' : '#b91c1c'
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* 5. DRIVER PAYOUTS ROWS */}
                {activeReport === 'driver_payouts' && reportResult.reportType === 'driver_payouts' && reportResult.records.map((p) => (
                  <tr key={p.payoutId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#6A379F' }}>{p.payoutId}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{p.driverName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{maskPhone(p.driverPhone)}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{p.vehicleType} ({p.vehicleNumber})</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{p.completedTrips}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>₹{Number(p.grossFare || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#d97706' }}>₹{Number(p.platformFee || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                      ₹{Number(p.netPayout || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: p.payoutStatus === 'PROCESSED' ? '#dcfce7' : '#fef3c7',
                          color: p.payoutStatus === 'PROCESSED' ? '#15803d' : '#b45309'
                        }}
                      >
                        {p.payoutStatus}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                      {p.paymentReference}
                    </td>
                  </tr>
                ))}

                {/* 6. ORDERS ROWS */}
                {activeReport === 'orders' && reportResult.reportType === 'orders' && reportResult.records.map((o) => (
                  <tr key={o.orderId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>ORD-{o.orderId}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{o.companyName}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{o.passengerName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{maskPhone(o.passengerPhone)}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, background: '#f1f5f9', padding: '0.2rem 0.45rem', borderRadius: '4px' }}>
                        {o.bookingType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: o.orderStatus?.includes('CANCELLED') ? '#94a3b8' : 'inherit' }}>
                      {o.orderStatus?.includes('CANCELLED') ? '—' : (o.assignedDriver || 'Unassigned')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>₹{Number(o.fareQuoted || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: o.orderStatus?.includes('CANCELLED') ? '#94a3b8' : '#15803d', fontWeight: 600 }}>
                      {o.orderStatus?.includes('CANCELLED') ? '—' : o.dispatchLeadTime}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: o.orderStatus === 'FULFILLED' ? '#dcfce7' : '#fee2e2',
                          color: o.orderStatus === 'FULFILLED' ? '#15803d' : '#b91c1c'
                        }}
                      >
                        {o.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* 7. DRIVER WORK ROWS */}
                {activeReport === 'driver_work' && reportResult.reportType === 'driver_work' && reportResult.records.map((w) => (
                  <tr key={w.driverId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>DRV-{w.driverId}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>{w.driverName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{maskPhone(w.driverPhone)}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{w.vehicleClass}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem' }}>{w.activeShift}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>{w.dutyHoursLogged}h</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{w.totalDistanceKm} km</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>{w.tripsCompleted}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{w.acceptanceRate}%</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                      ★ {w.customerRating}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: w.performanceTier === 'TOP_PERFORMER' ? '#dcfce7' : w.performanceTier === 'CONSISTENT' ? '#e0f2fe' : '#fee2e2',
                          color: w.performanceTier === 'TOP_PERFORMER' ? '#15803d' : w.performanceTier === 'CONSISTENT' ? '#0369a1' : '#b91c1c'
                        }}
                      >
                        {w.performanceTier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
