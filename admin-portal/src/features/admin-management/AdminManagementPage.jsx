import { getFriendlyError, getFriendlyLoadError } from '../../utils/friendlyError';
import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, UserPlus, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import AdminTable from './AdminTable';
import AddAdminModal from './AddAdminModal';
import { getAdmins, addAdmin, deactivateAdmin } from './adminService';

export default function AdminManagementPage() {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Deactivation confirm state
  const [confirmTarget, setConfirmTarget] = useState(null); // admin object
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  // Toast notification
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  // ── Load admins ────────────────────────────────────────────────────────────
  const loadAdmins = useCallback(async () => {
    setIsLoading(true);
    setPageError('');
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (err) {
      setPageError(getFriendlyLoadError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Add admin submit ───────────────────────────────────────────────────────
  const handleAddAdmin = async (formData) => {
    try {
      const newAdmin = await addAdmin(formData);
      setAdmins((prev) => [...prev, newAdmin]);
      showToast(`${newAdmin.admin_name} has been added as an admin.`);
    } catch (err) {
      showToast(getFriendlyError(err), 'error');
      throw err;
    }
  };

  // ── Deactivate flow ────────────────────────────────────────────────────────
  const handleDeactivateClick = (adminId) => {
    const target = admins.find((a) => a.id === adminId);
    if (!target) return;

    // Self-deactivation prevention guard (VULN-01)
    if (
      currentUser &&
      (target.id === currentUser.id ||
        target.email_id.toLowerCase() === (currentUser.email || '').toLowerCase())
    ) {
      showToast('You cannot deactivate your own account.', 'error');
      return;
    }

    setDeactivateError('');
    setConfirmTarget(target);
  };

  const handleConfirmDeactivate = async () => {
    if (!confirmTarget || isDeactivating) return;
    setIsDeactivating(true);
    setDeactivateError('');
    try {
      await deactivateAdmin(confirmTarget.id, currentUser?.id || currentUser?.email);
      setAdmins((prev) =>
        prev.map((a) => (a.id === confirmTarget.id ? { ...a, status: 'INACTIVE' } : a))
      );
      showToast(`${confirmTarget.admin_name} has been deactivated.`);
      setConfirmTarget(null);
    } catch (err) {
      setDeactivateError(getFriendlyError(err));
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleCancelDeactivate = () => {
    setConfirmTarget(null);
    setDeactivateError('');
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const activeCount = admins.filter((a) => a.status === 'ACTIVE').length;
  const inactiveCount = admins.filter((a) => a.status === 'INACTIVE').length;

  return (
    <div className="admin-mgmt-page">

      {/* ── Page Header ── */}
      <div className="admin-mgmt-header">
        <div className="admin-mgmt-header-left">
          <div className="page-icon-wrap">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="page-title">Admin Onboarding</h1>
            <p className="page-subtitle">
              Manage admin accounts — add new admins or deactivate those who have left.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
          id="open-add-admin-modal-btn"
        >
          <UserPlus size={15} />
          Add Admin
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div className="admin-stats-strip">
        <div className="stat-chip stat-chip-total">
          <span className="stat-value">{admins.length}</span>
          <span className="stat-label">Total Admins</span>
        </div>
        <div className="stat-chip stat-chip-active">
          <span className="stat-value">{activeCount}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-chip stat-chip-inactive">
          <span className="stat-value">{inactiveCount}</span>
          <span className="stat-label">Inactive</span>
        </div>
      </div>
      {/* ── Page-level error ── */}
      {pageError && (
        <div className="page-error-banner">
          <AlertCircle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {/* ── Admin Table ── */}
      <AdminTable
        admins={admins}
        onDeactivate={handleDeactivateClick}
        isLoading={isLoading}
      />

      {/* ── Add Admin Modal ── */}
      <AddAdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddAdmin}
      />

      {/* ── Deactivation Confirm Dialog ── */}
      {confirmTarget && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-confirm-title"
        >
          <div className="modal-panel confirm-modal">
            <div className="confirm-modal-icon">
              <AlertCircle size={28} />
            </div>
            <h2 id="deactivate-confirm-title" className="confirm-modal-title">
              Deactivate Admin?
            </h2>
            <p className="confirm-modal-body">
              Are you sure you want to deactivate{' '}
              <strong>{confirmTarget.admin_name}</strong>?<br />
              They will immediately lose access to the admin portal.
            </p>

            {deactivateError && (
              <div className="modal-error-banner">
                <AlertCircle size={14} />
                <span>{deactivateError}</span>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelDeactivate}
                disabled={isDeactivating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmDeactivate}
                disabled={isDeactivating}
                id="confirm-deactivate-btn"
              >
                {isDeactivating ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true" />
                    Deactivating…
                  </>
                ) : (
                  'Yes, Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`} role="status">
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="toast-close-btn"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
