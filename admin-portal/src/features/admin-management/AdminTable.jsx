import React from 'react';
import { ShieldCheck, ShieldOff, UserX, Calendar, Mail, Phone, UserCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

/**
 * AdminTable
 * Renders the list of admin accounts.
 *
 * Props:
 *  - admins        {Array}     List of admin objects from adminService
 *  - onDeactivate  {Function}  Called with admin.id when Deactivate is clicked
 *  - isLoading     {Boolean}   Shows skeleton rows while data loads
 */
export default function AdminTable({ admins = [], onDeactivate, isLoading = false }) {
  const { user: currentUser } = useAuth();
  // Count currently active admins — needed for the PRD guard
  const activeCount = admins.filter((a) => a.status === 'ACTIVE').length;

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // ── Skeleton rows while loading ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="admin-table-wrap">
        <table className="admin-table" aria-label="Admin accounts loading">
          <thead>
            <AdminTableHead />
          </thead>
          <tbody>
            {[1, 2, 3].map((i) => (
              <tr key={i} className="admin-table-row skeleton-row">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <td key={j}>
                    <div className="skeleton-cell" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (admins.length === 0) {
    return (
      <div className="admin-table-empty">
        <ShieldCheck size={40} className="empty-icon" />
        <p>No admin accounts found.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table" aria-label="Admin accounts">
        <thead>
          <AdminTableHead />
        </thead>
        <tbody>
          {admins.map((admin) => {
            const isActive = admin.status === 'ACTIVE';
            const isSelf = !!currentUser && (
              (currentUser.id && admin.id && currentUser.id === admin.id) ||
              (currentUser.email && admin.email_id && currentUser.email.toLowerCase() === admin.email_id.toLowerCase())
            );
            // PRD rule: cannot deactivate if doing so would leave < 2 active admins
            // Security rule (VULN-01): cannot deactivate your own account
            const canDeactivate = isActive && activeCount > 2 && !isSelf;
            const deactivateTitle = !isActive
              ? 'Admin is already inactive'
              : isSelf
              ? 'You cannot deactivate your own account'
              : !canDeactivate
              ? 'Cannot deactivate: at least 2 active admins must remain for invoice verification'
              : `Deactivate ${admin.admin_name}`;

            return (
              <tr key={admin.id} className={`admin-table-row ${!isActive ? 'row-inactive' : ''}`}>
                {/* Name + ID */}
                <td className="admin-table-cell">
                  <div className="admin-name-cell">
                    <div className={`admin-avatar-sm ${isActive ? 'avatar-active' : 'avatar-inactive'}`}>
                      {admin.admin_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="admin-name-text">
                        {admin.admin_name}
                        {isSelf && <span className="admin-self-pill" title="Currently logged in account">You</span>}
                      </span>
                      <span className="admin-id-text">{admin.id}</span>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="admin-table-cell">
                  <div className="admin-contact-cell">
                    <Mail size={13} className="contact-icon" />
                    <span>{admin.email_id}</span>
                  </div>
                </td>

                {/* Phone */}
                <td className="admin-table-cell">
                  <div className="admin-contact-cell">
                    <Phone size={13} className="contact-icon" />
                    <span>{admin.phone_no}</span>
                  </div>
                </td>

                {/* Status badge */}
                <td className="admin-table-cell">
                  {isActive ? (
                    <span className="status-badge badge-active">
                      <ShieldCheck size={12} />
                      ACTIVE
                    </span>
                  ) : (
                    <span className="status-badge badge-inactive">
                      <ShieldOff size={12} />
                      INACTIVE
                    </span>
                  )}
                </td>

                {/* Date Added */}
                <td className="admin-table-cell">
                  <div className="admin-contact-cell">
                    <Calendar size={13} className="contact-icon" />
                    <span>{formatDate(admin.created_at)}</span>
                  </div>
                </td>

                {/* Actions */}
                <td className="admin-table-cell">
                  {isActive ? (
                    <button
                      type="button"
                      id={`deactivate-btn-${admin.id}`}
                      className={`deactivate-btn ${!canDeactivate ? 'deactivate-btn-disabled' : ''}`}
                      onClick={() => canDeactivate && onDeactivate(admin.id)}
                      disabled={!canDeactivate}
                      title={deactivateTitle}
                      aria-label={deactivateTitle}
                    >
                      <UserX size={14} />
                      Deactivate
                    </button>
                  ) : (
                    <span className="no-action-text">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared table head ────────────────────────────────────────────────────────
function AdminTableHead() {
  return (
    <tr>
      <th className="admin-table-th">Admin</th>
      <th className="admin-table-th">Email</th>
      <th className="admin-table-th">Phone</th>
      <th className="admin-table-th">Status</th>
      <th className="admin-table-th">Date Added</th>
      <th className="admin-table-th">Actions</th>
    </tr>
  );
}
