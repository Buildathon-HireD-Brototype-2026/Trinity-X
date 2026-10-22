import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Eye,
  AlertCircle,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import DocumentViewerModal from './DocumentViewerModal';

const REQUIRED_DOCUMENTS = [
  {
    type: 'DRIVING_LICENCE',
    title: 'Driving Licence',
    description: 'Commercial 4-wheeler driving licence verified against RTO',
    required: true,
  },
  {
    type: 'AADHAAR',
    title: 'Aadhaar Card',
    description: 'Government identity and address verification',
    required: true,
  },
  {
    type: 'PAN',
    title: 'PAN Card',
    description: 'Mandatory for payroll share and tax compliance',
    required: true,
  },
  {
    type: 'PCC',
    title: 'Police Clearance Certificate',
    description: 'Criminal background verification and security clearance',
    required: true,
  },
];

export default function DriverReviewModal({
  driver,
  isOpen,
  onClose,
  onApprove,
  onReject,
  canManageDrivers = true,
}) {
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedDocForPreview(null);
      setIsRejecting(false);
      setRejectReason('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen && !selectedDocForPreview && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, selectedDocForPreview, isSubmitting, onClose]);

  if (!isOpen || !driver) return null;

  const uploadedDocs = driver.documents || [];
  const uploadedTypes = new Set(uploadedDocs.map((d) => d.document_type));
  const isComplete = REQUIRED_DOCUMENTS.every((req) => uploadedTypes.has(req.type));
  const isPending = driver.status === 'PENDING';
  const isActive = driver.status === 'ACTIVE';

  const handleApproveClick = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(driver.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject(driver.id, rejectReason.trim() || 'Documents incomplete or invalid');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-review-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <div
          className="modal-panel"
          style={{
            maxWidth: '720px',
            width: '100%',
            padding: '0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}
        >
          {/* ── Modal Header ── */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--background)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.125rem'
                }}
              >
                {driver.name.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h2
                    id="driver-review-modal-title"
                    style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}
                  >
                    {driver.name}
                  </h2>
                  <span
                    className={`badge ${
                      isPending ? 'badge-amber' : isActive ? 'badge-green' : 'badge-gray'
                    }`}
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 700
                    }}
                  >
                    {driver.status}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.25rem'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Phone size={12} /> {driver.phone_no}
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} /> {driver.current_location || 'Bengaluru'}
                  </span>
                  <span>•</span>
                  <span>ID: <code>{driver.id}</code></span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close modal"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Document Inspection Body ── */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {/* PRD Compliance Callout */}
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: isComplete ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: `1px solid ${isComplete ? '#86efac' : '#fde68a'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                fontSize: '0.8125rem',
                color: isComplete ? '#166534' : '#92400e'
              }}
            >
              {isComplete ? (
                <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={16} style={{ color: '#d97706', flexShrink: 0 }} />
              )}
              <span>
                {isComplete
                  ? 'All 4 required KYC documents have been uploaded and are ready for admin review.'
                  : `Incomplete application: ${uploadedDocs.length} of 4 documents uploaded. Police Clearance Certificate is pending.`}
              </span>
            </div>

            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Submitted KYC Documents Checklist:
            </div>

            {/* 4-Document Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '0.875rem'
              }}
            >
              {REQUIRED_DOCUMENTS.map((req) => {
                const doc = uploadedDocs.find((d) => d.document_type === req.type);
                const isUploaded = Boolean(doc);

                return (
                  <div
                    key={req.type}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem',
                      background: 'var(--surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <div
                          style={{
                            padding: '0.4rem',
                            borderRadius: '4px',
                            background: isUploaded ? 'var(--primary-light)' : 'var(--background)',
                            color: isUploaded ? 'var(--primary)' : 'var(--text-muted)'
                          }}
                        >
                          <FileText size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {req.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            {req.description}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: isUploaded
                            ? doc.status === 'VERIFIED'
                              ? '#dcfce7'
                              : '#fef3c7'
                            : '#fee2e2',
                          color: isUploaded
                            ? doc.status === 'VERIFIED'
                              ? '#15803d'
                              : '#b45309'
                            : '#b91c1c'
                        }}
                      >
                        {isUploaded
                          ? doc.status === 'VERIFIED'
                            ? 'VERIFIED'
                            : 'SUBMITTED'
                          : 'MISSING'}
                      </span>
                    </div>

                    {isUploaded ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderTop: '1px solid var(--border)',
                          paddingTop: '0.625rem',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                          {doc.original_file_name}
                        </span>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setSelectedDocForPreview(doc)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            background: 'var(--background)',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          <Eye size={12} />
                          <span>View Doc</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          borderTop: '1px solid var(--border)',
                          paddingTop: '0.5rem',
                          fontSize: '0.75rem',
                          color: '#dc2626'
                        }}
                      >
                        Document not yet submitted by applicant.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Rejection input box if activated */}
            {isRejecting && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b91c1c', fontWeight: 600, fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={15} />
                    <span>Specify reason for rejection:</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 500 }}>
                    {500 - rejectReason.length} characters left
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Driving licence expired, Aadhaar address unreadable, or failed background check..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    border: '1px solid #fca5a5',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    resize: 'none',
                    background: '#ffffff'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsRejecting(false)}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={handleConfirmReject}
                    disabled={isSubmitting || !canManageDrivers}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  >
                    {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Modal Footer Controls ── */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--background)'
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Close
            </button>

            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
              {!canManageDrivers && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  View-only mode (Admin/Ops role required to approve or reject).
                </span>
              )}

              {canManageDrivers && isPending && !isRejecting && (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => setIsRejecting(true)}
                  disabled={isSubmitting}
                  style={{ background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5' }}
                >
                  <XCircle size={14} />
                  <span>Reject</span>
                </button>
              )}

              {canManageDrivers && isPending && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleApproveClick}
                  disabled={isSubmitting}
                  id="modal-approve-driver-btn"
                >
                  <CheckCircle2 size={15} />
                  <span>{isSubmitting ? 'Approving...' : 'Approve & Mark Active'}</span>
                </button>
              )}

              {isActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontSize: '0.8125rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  <span>Verified & Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Nested Document Preview Modal ── */}
      <DocumentViewerModal
        document={selectedDocForPreview}
        driver={driver}
        isOpen={Boolean(selectedDocForPreview)}
        onClose={() => setSelectedDocForPreview(null)}
      />
    </>
  );
}
