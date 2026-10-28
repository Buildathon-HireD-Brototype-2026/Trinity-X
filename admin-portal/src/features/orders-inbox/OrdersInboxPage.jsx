import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Eye,
  MapPin,
  ArrowRight,
  Phone,
  MessageSquare,
  Globe,
  AlertCircle,
  ShieldAlert,
  Building2,
  Calendar
} from 'lucide-react';
import { getOrders, acceptOrder, rejectOrder, createManualOrder, resendOrderEmail } from './orderService';
import { useAuth } from '../auth/AuthContext';
import OrderDetailModal from './OrderDetailModal';
import CreateOrderModal from './CreateOrderModal';

export default function OrdersInboxPage({ onOpenDetail, onOpenCreate }) {
  const { user } = useAuth();
  // Role-Based Access Control: fail-closed permission check
  const canManageOrders = Boolean(user && ['Admin', 'SuperAdmin', 'Operations'].includes(user.role));

  const [orders, setOrders] = useState([]);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'RECEIVED' | 'ACCEPTED' | 'REJECTED'
  const [sourceFilter, setSourceFilter] = useState('ALL'); // 'ALL' | 'B2B_PORTAL' | 'PHONE' | 'WHATSAPP'

  // Toast feedback state
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ── Load Orders ────────────────────────────────────────────────────────────
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setPageError('');
    try {
      const data = await getOrders({
        status: statusFilter,
        source: sourceFilter,
        search: searchQuery
      });
      setOrders(data);
    } catch (err) {
      setPageError(err.message || 'Failed to load booking orders.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ── Action Handlers (PRD A-05) ─────────────────────────────────────────────
  const handleAcceptOrder = async (orderId, tripAmount) => {
    const updated = await acceptOrder(orderId, tripAmount);
    setOrders((prev) =>
      prev.map((o) => (o.orderId === Number(orderId) ? updated : o))
    );
    setSelectedOrderForDetail(updated);
    const emailTarget = updated.emailSentTo || updated.companyEmail || updated.companyName;
    showToast(`Order #${orderId} accepted! Confirmation email dispatched to ${emailTarget}.`);
  };

  const handleRejectOrder = async (orderId, rejectReason) => {
    const updated = await rejectOrder(orderId, rejectReason);
    setOrders((prev) =>
      prev.map((o) => (o.orderId === Number(orderId) ? updated : o))
    );
    setSelectedOrderForDetail(updated);
    const emailTarget = updated.emailSentTo || updated.companyEmail || updated.companyName;
    showToast(`Order #${orderId} declined. Rejection reason emailed to ${emailTarget}.`, 'error');
  };

  const handleResendEmail = async (orderId) => {
    const updated = await resendOrderEmail(orderId);
    setOrders((prev) =>
      prev.map((o) => (o.orderId === Number(orderId) ? updated : o))
    );
    setSelectedOrderForDetail(updated);
    const emailTarget = updated.emailSentTo || updated.companyEmail || updated.companyName;
    showToast(`Notification email successfully resent to ${emailTarget}!`);
  };

  const handleCreateOrder = async (orderData) => {
    const newOrder = await createManualOrder(orderData);
    setOrders((prev) => [newOrder, ...prev]);
    setIsCreateModalOpen(false);
    showToast(`Order #ORD-${newOrder.orderId} created successfully on behalf of ${newOrder.companyName}!`);
  };
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'RECEIVED').length;
    const accepted = orders.filter((o) => o.status === 'ACCEPTED').length;
    const rejected = orders.filter((o) => o.status === 'REJECTED').length;
    return { total, pending, accepted, rejected };
  }, [orders]);

  // PII phone masking helper
  const maskPhone = (phone) => {
    if (!phone) return '—';
    if (canManageOrders) return phone;
    const parts = phone.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} •••••`;
    }
    return phone.slice(0, 7) + '•••••';
  };

  // Format source pill
  const renderSourceBadge = (source) => {
    switch (source) {
      case 'B2B_PORTAL':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: '#eff6ff',
              color: '#1d4ed8'
            }}
          >
            <Globe size={11} />
            <span>Portal</span>
          </span>
        );
      case 'WHATSAPP':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: '#f0fdf4',
              color: '#15803d'
            }}
          >
            <MessageSquare size={11} />
            <span>WhatsApp</span>
          </span>
        );
      case 'PHONE':
      default:
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: 600,
              background: '#faf5ff',
              color: '#7e22ce'
            }}
          >
            <Phone size={11} />
            <span>Phone</span>
          </span>
        );
    }
  };

  // Format status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={11} />
            <span>Pending Review</span>
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <CheckCircle2 size={11} />
            <span>Accepted</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <XCircle size={11} />
            <span>Rejected</span>
          </span>
        );
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <div className="orders-inbox-page admin-mgmt-page">
      {/* ── Page Header ── */}
      <div className="admin-mgmt-header">
        <div className="admin-mgmt-header-left">
          <div className="page-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Inbox size={20} />
          </div>
          <div>
            <h1 className="page-title">Orders & Bookings Inbox</h1>
            <p className="page-subtitle">
              Review incoming corporate travel requests from the B2B portal, log telephone/WhatsApp bookings, and confirm trip pricing.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={loadOrders}
            title="Refresh orders list"
            aria-label="Refresh orders list"
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

          {canManageOrders && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
              id="open-create-order-btn"
            >
              <PlusCircle size={15} />
              <span>Log Phone / WhatsApp Order</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Metric Summary Strip ── */}
      <div className="admin-stats-strip">
        <div
          className="stat-chip"
          style={{
            borderColor: '#fef08a',
            background: 'var(--badge-amber-bg, #fefce8)',
            cursor: 'pointer'
          }}
          onClick={() => setStatusFilter('RECEIVED')}
          title="Click to view pending requests requiring decision"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={14} style={{ color: '#d97706' }} />
            <span className="stat-value" style={{ color: '#d97706' }}>{stats.pending}</span>
          </div>
          <span className="stat-label" style={{ color: '#b45309' }}>Pending Orders</span>
        </div>

        <div
          className="stat-chip stat-chip-active"
          style={{ cursor: 'pointer' }}
          onClick={() => setStatusFilter('ACCEPTED')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
            <span className="stat-value">{stats.accepted}</span>
          </div>
          <span className="stat-label">Accepted Trips</span>
        </div>

        <div
          className="stat-chip"
          style={{ cursor: 'pointer', background: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => setStatusFilter('REJECTED')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <XCircle size={14} style={{ color: 'var(--text-muted)' }} />
            <span className="stat-value" style={{ color: 'var(--text-muted)' }}>{stats.rejected}</span>
          </div>
          <span className="stat-label">Rejected Inquiries</span>
        </div>

        <div
          className="stat-chip stat-chip-total"
          style={{ cursor: 'pointer' }}
          onClick={() => setStatusFilter('ALL')}
        >
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Inquiries</span>
        </div>
      </div>

      {/* ── View-Only Access Banner for Non-Admin Roles (RBAC) ── */}
      {!canManageOrders && (
        <div
          className="view-only-banner"
          id="orders-view-only-notice"
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
          <span><strong>View-Only Mode:</strong> You are viewing orders in read-only mode. Administrator privileges are required to accept orders, create manual requests, or adjust pricing.</span>
        </div>
      )}

      {/* ── Page Error Banner ── */}
      {pageError && (
        <div className="page-error-banner">
          <AlertCircle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {/* ── Filter Toolbar ── */}
      <div
        className="orders-toolbar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          background: 'var(--surface)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          marginBottom: '1rem'
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'RECEIVED', label: 'Pending' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'REJECTED', label: 'Rejected' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: statusFilter === tab.id ? 'var(--primary)' : 'transparent',
                color: statusFilter === tab.id ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Source Filter Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-input-wrap" style={{ position: 'relative', width: '260px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              placeholder="Search ID, passenger, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input"
              style={{
                paddingLeft: '2.25rem',
                fontSize: '0.8125rem',
                width: '100%',
                height: '36px'
              }}
              id="orders-search-input"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="admin-input"
              style={{ height: '36px', fontSize: '0.8125rem', padding: '0 0.65rem' }}
              id="orders-source-filter-select"
            >
              <option value="ALL">All Sources</option>
              <option value="B2B_PORTAL">B2B Portal</option>
              <option value="PHONE">Phone Call</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Orders Table Container ── */}
      <div
        className="orders-table-card"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
      >
        {isLoading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading incoming orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Inbox size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '1rem' }}>
              No orders found
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>
              {searchQuery || statusFilter !== 'ALL' || sourceFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter.'
                : 'No incoming booking orders in the inbox.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ORDER REF</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>COMPANY</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PASSENGER</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>JOURNEY ROUTE</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PICKUP TIME</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CHANNEL</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  return (
                    <tr
                      key={order.orderId}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Order Reference */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.85rem' }}>
                          ORD-{order.orderId}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {order.vehicleType}
                        </div>
                      </td>

                      {/* Company Name */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Building2 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span>{order.companyName}</span>
                        </div>
                      </td>

                      {/* Passenger */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {order.contactName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {maskPhone(order.contactPhone)}
                        </div>
                      </td>

                      {/* Journey Route */}
                      <td style={{ padding: '0.875rem 1rem', maxWidth: '280px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78125rem', color: 'var(--text-main)' }}>
                            <MapPin size={12} style={{ color: '#16a34a', flexShrink: 0 }} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {order.pickupSpot}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                            <ArrowRight size={11} style={{ flexShrink: 0 }} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {order.dropoffSpot}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Pickup Time */}
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.78125rem', color: 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                          <span>
                            {new Date(order.pickupTime).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Source Channel */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {renderSourceBadge(order.source)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {renderStatusBadge(order.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setSelectedOrderForDetail(order)}
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            cursor: 'pointer'
                          }}
                          id={`review-order-btn-${order.orderId}`}
                        >
                          <Eye size={13} />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast Notification ── */}
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
      {/* ── Order Detail & Acceptance Modal (PRD A-04, A-05) ── */}
      <OrderDetailModal
        order={selectedOrderForDetail}
        isOpen={Boolean(selectedOrderForDetail)}
        onClose={() => setSelectedOrderForDetail(null)}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
        onResendEmail={handleResendEmail}
        canManageOrders={canManageOrders}
      />

      {/* ── Manual Phone / WhatsApp Order Creation Modal (PRD A-03) ── */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateOrder}
      />
    </div>
  );
}
