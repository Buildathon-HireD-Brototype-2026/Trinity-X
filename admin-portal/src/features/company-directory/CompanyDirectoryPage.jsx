import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Building2,
  Users,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  Eye,
  ShieldAlert,
  Percent,
  Check,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import {
  getCompanies,
  getRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  toggleCompanyStatus,
  updatePayoutSplit,
  addCompany
} from './companyService';
import CompanyReviewModal from './CompanyReviewModal';
import CompanyDetailsModal from './CompanyDetailsModal';
import AddCompanyModal from './AddCompanyModal';
import { useAuth } from '../auth/AuthContext';

export default function CompanyDirectoryPage() {
  const { user } = useAuth();
  // Role-Based Access Control: fail-closed enforcement (only authenticated admin/ops roles)
  const canManageCompanies = Boolean(user && ['Admin', 'SuperAdmin', 'Operations'].includes(user.role));

  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'requests'
  const [companies, setCompanies] = useState([]);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingCompanyId, setProcessingCompanyId] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [pageError, setPageError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [selectedRequestForReview, setSelectedRequestForReview] = useState(null);
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState(null);
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);

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

  // ── Load Companies & Requests ─────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setPageError('');
    try {
      const [compList, reqList] = await Promise.all([
        getCompanies({ status: statusFilter, search: searchQuery }),
        getRegistrationRequests()
      ]);
      setCompanies(compList);
      setRegistrationRequests(reqList);
    } catch (err) {
      setPageError(err.message || 'Failed to load company directory data.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Metrics Calculation ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = companies.length;
    const active = companies.filter((c) => c.status === 'ACTIVE').length;
    const inactive = companies.filter((c) => c.status === 'INACTIVE').length;
    const pendingRequests = registrationRequests.filter((r) => r.status === 'PENDING').length;
    return { total, active, inactive, pendingRequests };
  }, [companies, registrationRequests]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleApproveRequest = async (requestId) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    try {
      const newCompany = await approveRegistrationRequest(requestId);
      setRegistrationRequests((prev) =>
        prev.map((r) => (r.requestId === Number(requestId) ? { ...r, status: 'APPROVED' } : r))
      );
      setCompanies((prev) => [newCompany, ...prev]);
      showToast(`${newCompany.name} approved and onboarded into active directory!`);
      if (selectedRequestForReview?.requestId === Number(requestId)) {
        setSelectedRequestForReview(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to approve registration.', 'error');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId, reason) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    try {
      await rejectRegistrationRequest(requestId, reason);
      setRegistrationRequests((prev) =>
        prev.map((r) =>
          r.requestId === Number(requestId)
            ? { ...r, status: 'REJECTED', rejectionReason: reason }
            : r
        )
      );
      showToast('Registration request rejected.', 'error');
      if (selectedRequestForReview?.requestId === Number(requestId)) {
        setSelectedRequestForReview(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to reject registration.', 'error');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleToggleStatus = async (companyId) => {
    if (processingCompanyId) return;
    setProcessingCompanyId(companyId);
    try {
      const updated = await toggleCompanyStatus(companyId);
      setCompanies((prev) =>
        prev.map((c) => (c.companyId === Number(companyId) ? updated : c))
      );
      showToast(`Company status updated to ${updated.status}.`);
    } catch (err) {
      showToast(err.message || 'Failed to toggle status.', 'error');
    } finally {
      setProcessingCompanyId(null);
    }
  };

  const handleUpdateSplit = async (companyId, hiredSplit, driverSplit) => {
    try {
      const updated = await updatePayoutSplit(companyId, hiredSplit, driverSplit);
      setCompanies((prev) =>
        prev.map((c) => (c.companyId === Number(companyId) ? updated : c))
      );
      if (selectedCompanyForDetails?.companyId === Number(companyId)) {
        setSelectedCompanyForDetails(updated);
      }
      showToast(`Payout split updated to ${updated.hiredSplit}% HireD / ${updated.driverSplit}% Driver.`);
    } catch (err) {
      showToast(err.message || 'Failed to update payout split.', 'error');
      throw err;
    }
  };

  const handleAddCompanySubmit = async (formData) => {
    const newCompany = await addCompany(formData);
    setCompanies((prev) => [newCompany, ...prev]);
    setIsAddCompanyModalOpen(false);
    showToast(`Company ${newCompany.name} onboarded successfully!`);
  };

  // Helper for masking phone numbers for PII compliance
  const maskPhone = (phone) => {
    if (!phone) return '—';
    const parts = phone.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} •••••`;
    }
    return phone.slice(0, 7) + '•••••';
  };

  return (
    <div className="company-directory-page admin-mgmt-page">
      {/* ── Page Header ── */}
      <div className="admin-mgmt-header">
        <div className="admin-mgmt-header-left">
          <div className="page-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Building2 size={20} />
          </div>
          <div>
            <h1 className="page-title">Company Directory & Accounts</h1>
            <p className="page-subtitle">
              Manage corporate B2B client accounts, review registration requests, configure revenue payout splits, and monitor fleet contracts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={loadData}
            title="Refresh company data"
            aria-label="Refresh company data"
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

          {canManageCompanies && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsAddCompanyModalOpen(true)}
              id="open-add-company-modal-btn"
            >
              <PlusCircle size={15} />
              <span>Onboard Company</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Metric Summary Strip ── */}
      <div className="admin-stats-strip">
        <div className="stat-chip stat-chip-total">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Corporate Accounts</span>
        </div>

        <div className="stat-chip stat-chip-active">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
            <span className="stat-value">{stats.active}</span>
          </div>
          <span className="stat-label">Active Clients</span>
        </div>

        <div
          className="stat-chip"
          style={{
            borderColor: '#fef08a',
            background: 'var(--badge-amber-bg, #fefce8)',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('requests')}
          title="Click to view pending requests queue"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={14} style={{ color: '#d97706' }} />
            <span className="stat-value" style={{ color: '#d97706' }}>{stats.pendingRequests}</span>
          </div>
          <span className="stat-label" style={{ color: '#b45309' }}>Pending Requests</span>
        </div>

        <div
          className="stat-chip"
          style={{
            borderColor: '#e2e8f0',
            background: 'var(--surface)'
          }}
        >
          <span className="stat-value" style={{ color: 'var(--text-muted)' }}>{stats.inactive}</span>
          <span className="stat-label">Inactive Accounts</span>
        </div>
      </div>

      {/* ── View-Only Access Banner for Non-Admin Roles (RBAC) ── */}
      {!canManageCompanies && (
        <div
          className="view-only-banner"
          id="company-view-only-notice"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '0.625rem 1rem',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem'
          }}
        >
          <ShieldAlert size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span><strong>View-Only Mode:</strong> You are viewing company accounts with auditor/read-only access. Administrative privileges are required to onboard clients, alter revenue payout splits, or change account status.</span>
        </div>
      )}

      {/* ── Page Error Banner ── */}
      {pageError && (
        <div className="page-error-banner">
          <AlertCircle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {/* ── Toolbar: Tabs & Search/Filter Controls ── */}
      <div
        className="company-toolbar"
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
            <Building2 size={15} />
            <span>Company Directory</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius)',
              border: '1px solid',
              borderColor: activeTab === 'requests' ? 'var(--primary)' : 'transparent',
              background: activeTab === 'requests' ? 'var(--primary-light)' : 'transparent',
              color: activeTab === 'requests' ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer'
            }}
          >
            <Clock size={15} />
            <span>Registration Requests</span>
            {stats.pendingRequests > 0 && (
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
                {stats.pendingRequests}
              </span>
            )}
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
              width: '270px'
            }}
          >
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search company, contact, hub..."
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
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Table Container ── */}
      <div
        className="company-content-container"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          minHeight: '320px',
          overflow: 'hidden'
        }}
      >
        {isLoading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0 }}>Loading company records...</p>
          </div>
        ) : activeTab === 'directory' ? (
          // ── TAB 1: Company Directory Table ──
          companies.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Building2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '1rem' }}>
                No companies found
              </h3>
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                {searchQuery ? 'Try adjusting your search criteria or filter.' : 'No B2B client accounts registered yet.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-subtle, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>COMPANY</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PRIMARY CONTACT</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>LOCATION / HUB</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>REVENUE SPLIT</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => {
                    const isActive = company.status === 'ACTIVE';

                    return (
                      <tr
                        key={company.companyId}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Company Name & ID */}
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius)',
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.875rem'
                              }}
                            >
                              {company.name.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                {company.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                CMP-{String(company.companyId).padStart(3, '0')} • {company.totalBookings || 0} Bookings
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Person & Email */}
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {company.contactPerson}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span>{company.emailId}</span>
                            <span>•</span>
                            <span>{maskPhone(company.phoneNo)}</span>
                          </div>
                        </td>

                        {/* Location / Hub */}
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{company.companyLocation || 'Bengaluru'}</span>
                          </div>
                        </td>

                        {/* Revenue Payout Split */}
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--primary)',
                              background: 'var(--primary-light)',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Percent size={11} />
                            <span>{company.hiredSplit}% HireD / {company.driverSplit}% Driver</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span
                            className={`badge ${isActive ? 'badge-green' : 'badge-gray'}`}
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'inline-block'
                            }}
                          >
                            {company.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setSelectedCompanyForDetails(company)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer'
                              }}
                              id={`view-company-btn-${company.companyId}`}
                            >
                              <Eye size={13} />
                              <span>Details</span>
                            </button>

                            {canManageCompanies && (
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleToggleStatus(company.companyId)}
                                disabled={processingCompanyId === company.companyId}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  borderRadius: '4px',
                                  cursor: processingCompanyId === company.companyId ? 'not-allowed' : 'pointer',
                                  opacity: processingCompanyId === company.companyId ? 0.6 : 1
                                }}
                              >
                                {processingCompanyId === company.companyId
                                  ? 'Updating...'
                                  : isActive
                                  ? 'Deactivate'
                                  : 'Activate'}
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
          )
        ) : (
          // ── TAB 2: Registration Requests Queue Table ──
          registrationRequests.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '1rem' }}>
                No registration requests
              </h3>
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>
                There are no pending B2B corporate onboarding requests.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-subtle, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>REQ ID</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>COMPANY APPLICANT</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CONTACT</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>HUB</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationRequests.map((req) => {
                    const isPending = req.status === 'PENDING';

                    return (
                      <tr
                        key={req.requestId}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                          #{req.requestId}
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            {req.companyName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Submitted {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {req.contactPerson}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {req.emailId} • {req.phoneNo}
                          </div>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                          {req.companyLocation || 'Bengaluru'}
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span
                            className={`badge ${
                              isPending
                                ? 'badge-amber'
                                : req.status === 'APPROVED'
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
                            {req.status}
                          </span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setSelectedRequestForReview(req)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer'
                              }}
                              id={`review-request-btn-${req.requestId}`}
                            >
                              <Eye size={13} />
                              <span>Review</span>
                            </button>

                            {canManageCompanies && isPending && (
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={() => handleApproveRequest(req.requestId)}
                                disabled={processingRequestId === req.requestId}
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.75rem',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  cursor: processingRequestId === req.requestId ? 'not-allowed' : 'pointer',
                                  opacity: processingRequestId === req.requestId ? 0.7 : 1
                                }}
                              >
                                <CheckCircle2 size={13} />
                                <span>{processingRequestId === req.requestId ? 'Approving...' : 'Approve'}</span>
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
          )
        )}
      </div>

      {/* ── Toast Feedback Notification ── */}
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

      {/* ── Company Registration Review Modal ── */}
      <CompanyReviewModal
        request={selectedRequestForReview}
        isOpen={Boolean(selectedRequestForReview)}
        onClose={() => setSelectedRequestForReview(null)}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        canManageCompanies={canManageCompanies}
      />

      {/* ── Company Profile & Payout Split Modal (PRD A-11) ── */}
      <CompanyDetailsModal
        company={selectedCompanyForDetails}
        isOpen={Boolean(selectedCompanyForDetails)}
        onClose={() => setSelectedCompanyForDetails(null)}
        onUpdateSplit={handleUpdateSplit}
        canManageCompanies={canManageCompanies}
      />

      {/* ── Manual Client Company Onboarding Modal ── */}
      <AddCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        onSubmit={handleAddCompanySubmit}
      />
    </div>
  );
}
