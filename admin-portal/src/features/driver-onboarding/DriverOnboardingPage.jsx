import { getFriendlyError, getFriendlyLoadError } from '../../utils/friendlyError';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wifi,
  FileText,
  Eye,
  ShieldAlert
} from 'lucide-react';
import {
  getDrivers,
  approveDriver,
  rejectDriver,
  toggleDriverStatus,
  addDriver
} from './driverService';
import DriverReviewModal from './DriverReviewModal';
import AddDriverModal from './AddDriverModal';
import { useAuth } from '../auth/AuthContext';

export default function DriverOnboardingPage() {
  const { user } = useAuth();
  // Role-Based Access Control: verify if current session has driver modification rights
  const canManageDrivers = !user || user.role === 'Admin' || user.role === 'SuperAdmin' || user.role === 'Operations';

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'directory'
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [selectedDriverForReview, setSelectedDriverForReview] = useState(null);
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);

  // Toast feedback state with timeout ref to prevent race conditions
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ── Load Drivers ──────────────────────────────────────────────────────────
  const loadDrivers = useCallback(async () => {
    setIsLoading(true);
    setPageError('');
    try {
      const data = await getDrivers({
        status: statusFilter,
        tab: activeTab,
        search: searchQuery
      });
      setDrivers(data);
    } catch (err) {
      setPageError(getFriendlyLoadError(err));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, statusFilter, searchQuery]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // ── Global Stats Calculation ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = drivers.length;
    const pending = drivers.filter((d) => d.status === 'PENDING').length;
    const active = drivers.filter((d) => d.status === 'ACTIVE').length;
    const online = drivers.filter((d) => d.is_online).length;
    return { total, pending, active, online };
  }, [drivers]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleApprove = async (driverId) => {
    try {
      const updated = await approveDriver(driverId);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, status: 'ACTIVE' } : d))
      );
      showToast(`${updated.name} has been approved and marked Active!`);
      if (selectedDriverForReview?.id === driverId) {
        setSelectedDriverForReview(null);
      }
    } catch (err) {
      showToast(getFriendlyError(err), 'error');
    }
  };

  const handleReject = async (driverId, reason) => {
    try {
      const updated = await rejectDriver(driverId, reason);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? { ...d, status: 'INACTIVE' } : d))
      );
      showToast(`Application for ${updated.name} has been rejected.`, 'error');
      if (selectedDriverForReview?.id === driverId) {
        setSelectedDriverForReview(null);
      }
    } catch (err) {
      showToast(getFriendlyError(err), 'error');
    }
  };

  const handleToggleStatus = async (driverId) => {
    try {
      const updated = await toggleDriverStatus(driverId);
      setDrivers((prev) =>
        prev.map((d) => (d.id === driverId ? updated : d))
      );
      showToast(`Driver status updated to ${updated.status}.`);
    } catch (err) {
      showToast(getFriendlyError(err), 'error');
    }
  };

  const handleAddDriverSuccess = (newDriver) => {
    setDrivers((prev) => [newDriver, ...prev]);
    setIsAddDriverModalOpen(false);
    showToast(`Driver ${newDriver.name} onboarded successfully!`);
  };

  const handleAddDriverSubmit = async (formData) => {
    try {
      const newDriver = await addDriver(formData);
      handleAddDriverSuccess(newDriver);
    } catch (err) {
      showToast(getFriendlyError(err), 'error');
    }
  };

  return (
    <div className="driver-onboarding-page admin-mgmt-page">
      {/* ── Page Header ── */}
      <div className="admin-mgmt-header">
        <div className="admin-mgmt-header-left">
          <div className="page-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <h1 className="page-title">Driver Onboarding & Verification</h1>
            <p className="page-subtitle">
              Verify submitted KYC documents (DL, Aadhaar, PAN, PCC), approve driver accounts, and track availability.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={loadDrivers}
            title="Refresh driver list"
            aria-label="Refresh drivers"
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>

          {canManageDrivers && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsAddDriverModalOpen(true)}
              id="open-add-driver-modal-btn"
            >
              <UserPlus size={15} />
              <span>Onboard Driver</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Key Metrics Summary Strip ── */}
      <div className="admin-stats-strip">
        <div className="stat-chip stat-chip-total">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Applications</span>
        </div>

        <div
          className="stat-chip"
          style={{
            borderColor: '#fef08a',
            background: 'var(--badge-amber-bg, #fefce8)',
            cursor: 'pointer'
          }}
          onClick={() => {
            setActiveTab('queue');
            setStatusFilter('ALL');
          }}
          title="Click to view pending queue"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={14} style={{ color: '#d97706' }} />
            <span className="stat-value" style={{ color: '#d97706' }}>{stats.pending}</span>
          </div>
          <span className="stat-label" style={{ color: '#b45309' }}>Pending Review</span>
        </div>

        <div className="stat-chip stat-chip-active">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
            <span className="stat-value">{stats.active}</span>
          </div>
          <span className="stat-label">Active Drivers</span>
        </div>

        <div
          className="stat-chip"
          style={{
            borderColor: '#bfdbfe',
            background: 'var(--badge-blue-bg, #eff6ff)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Wifi size={14} style={{ color: '#2563eb' }} />
            <span className="stat-value" style={{ color: '#2563eb' }}>{stats.online}</span>
          </div>
          <span className="stat-label" style={{ color: '#1d4ed8' }}>Currently Online</span>
        </div>
      </div>

      {/* ── Page Error Banner ── */}
      {pageError && (
        <div className="page-error-banner">
          <AlertCircle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {/* ── Tabs & Search/Filter Controls Toolbar ── */}
      <div
        className="driver-toolbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'var(--surface)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)'
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('queue');
              setStatusFilter('ALL');
            }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius)',
              border: '1px solid',
              borderColor: activeTab === 'queue' ? 'var(--primary)' : 'transparent',
              background: activeTab === 'queue' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'queue' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Clock size={15} />
            <span>Verification Queue</span>
            {stats.pending > 0 && (
              <span
                style={{
                  background: '#f59e0b',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {stats.pending}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius)',
              border: '1px solid',
              borderColor: activeTab === 'directory' ? 'var(--primary)' : 'transparent',
              background: activeTab === 'directory' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'directory' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Users size={15} />
            <span>Driver Directory</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-main, #f8fafc)',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              width: '260px'
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, phone, area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.8125rem',
                color: 'var(--text-main)',
                width: '100%'
              }}
            />
          </div>

          {activeTab === 'directory' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Table & Content Area Placeholder (To be wired with DriverTable) ── */}
      <div
        className="driver-content-container"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          minHeight: '320px',
          overflow: 'hidden'
        }}
      >
        {isLoading ? (
          <div
            style={{
              padding: '3rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0 }}>Loading driver records...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div
            style={{
              padding: '3.5rem 1rem',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '1rem' }}>
              No drivers found
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>
              {searchQuery
                ? 'Try adjusting your search criteria or filter.'
                : activeTab === 'queue'
                ? 'There are no pending driver applications in the queue.'
                : 'No driver records have been onboarded yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>DRIVER</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CONTACT</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>KYC DOCUMENTS</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>AVAILABILITY</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => {
                  const docCount = driver.documents ? driver.documents.length : 0;
                  const isPending = driver.status === 'PENDING';
                  const isActive = driver.status === 'ACTIVE';

                  return (
                    <tr
                      key={driver.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Driver info */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'var(--primary-light)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.875rem'
                            }}
                          >
                            {driver.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                              {driver.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {driver.id} • {driver.current_location || 'Bengaluru'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                        {driver.phone_no}
                      </td>

                      {/* Documents */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <FileText size={14} style={{ color: docCount >= 4 ? '#16a34a' : '#d97706' }} />
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: docCount >= 4 ? '#16a34a' : '#d97706',
                              background: docCount >= 4 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px'
                            }}
                          >
                            {docCount}/4 Uploaded
                          </span>
                        </div>
                      </td>

                      {/* Availability */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: driver.is_online ? '#22c55e' : '#94a3b8',
                              display: 'inline-block'
                            }}
                          />
                          <span style={{ color: driver.is_online ? '#16a34a' : 'var(--text-muted)', fontWeight: 500 }}>
                            {driver.is_online ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span
                          className={`badge ${
                            isPending
                              ? 'badge-amber'
                              : isActive
                              ? 'badge-green'
                              : 'badge-gray'
                          }`}
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-block'
                          }}
                        >
                          {driver.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setSelectedDriverForReview(driver)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer'
                            }}
                            id={`review-driver-btn-${driver.id}`}
                          >
                            <Eye size={13} />
                            <span>Review</span>
                          </button>

                          {canManageDrivers && isPending && (
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handleApprove(driver.id)}
                              style={{
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <CheckCircle2 size={13} />
                              Approve
                            </button>
                          )}

                          {canManageDrivers && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleToggleStatus(driver.id)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast notification feedback ── */}
      {toast && (
        <div
          className={`toast-notification toast-${toast.type}`}
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}
      {/* ── Driver KYC Document Review & Decision Modal ── */}
      <DriverReviewModal
        driver={selectedDriverForReview}
        isOpen={Boolean(selectedDriverForReview)}
        onClose={() => setSelectedDriverForReview(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        canManageDrivers={canManageDrivers}
      />

      {/* ── Manual Add / Onboard Driver Modal ── */}
      <AddDriverModal
        isOpen={isAddDriverModalOpen}
        onClose={() => setIsAddDriverModalOpen(false)}
        onSubmit={handleAddDriverSubmit}
      />
    </div>
  );
}
