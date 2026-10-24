import React from 'react';
import { X, Download, FileText, CheckCircle2, ShieldCheck, Eye, ExternalLink, Lock } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const DOC_TITLES = {
  DRIVING_LICENCE: 'Commercial Driving Licence (DL)',
  AADHAAR: 'Aadhaar Identity Card',
  PAN: 'Permanent Account Number (PAN) Card',
  PCC: 'Police Clearance Certificate (PCC)',
};

export default function DocumentViewerModal({ document, driver, isOpen, onClose }) {
  const { user } = useAuth();
  if (!isOpen || !document) return null;

  const docTitle = DOC_TITLES[document.document_type] || document.document_type;
  const reviewerEmail = user?.email || 'admin1@hired.com';

  const formatMaskedPhone = (phone) => {
    if (!phone) return '—';
    const parts = phone.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} •••••`;
    }
    return phone.slice(0, 7) + '•••••';
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
      style={{ zIndex: 1100 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '680px',
          width: '100%',
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--background)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText size={16} />
            </div>
            <div>
              <h3 id="doc-viewer-title" style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {docTitle}
              </h3>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Applicant: {driver?.name} ({driver?.id}) • {document.original_file_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close document viewer"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Document Inspection Content */}
        <div
          style={{
            padding: '1.5rem',
            background: 'var(--bg-main, #0f172a10)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '360px'
          }}
        >
          {/* Simulated Document Preview Card */}
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: 'var(--surface, #ffffff)',
              borderRadius: 'var(--radius)',
              border: '2px dashed var(--border)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Watermark / Badge */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: document.status === 'VERIFIED' ? '#16a34a' : '#d97706',
                background: document.status === 'VERIFIED' ? '#dcfce7' : '#fef3c7',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                border: `1px solid ${document.status === 'VERIFIED' ? '#bbf7d0' : '#fde68a'}`
              }}
            >
              <ShieldCheck size={12} />
              <span>{document.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING REVIEW'}</span>
            </div>

            {/* Document Details Grid */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
                GOVERNMENT OF INDIA / OFFICIAL ISSUANCE
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {docTitle}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                background: 'var(--background)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                marginBottom: '1rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>CARDHOLDER NAME</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>{driver?.name}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>PHONE (MASKED PII)</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Lock size={12} style={{ color: '#16a34a' }} />
                  {formatMaskedPhone(driver?.phone_no)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>DOCUMENT ID REF</span>
                <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-main)' }}>
                  {document.document_type.substring(0, 3)}-{driver?.id?.replace('DRV-', '') || '101'}-9482
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block' }}>UPLOAD TIMESTAMP</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(document.uploaded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </span>
              </div>
            </div>

            {/* Forensic Audit Watermark */}
            <div
              style={{
                marginBottom: '0.75rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px dashed #fca5a5',
                fontSize: '0.6875rem',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                letterSpacing: '0.02em'
              }}
            >
              <span>AUDIT WATERMARK: {reviewerEmail}</span>
              <span>SESSION-TAG: #{driver?.id || 'DRV'}-{Date.now().toString().slice(-6)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>File: <code>{document.original_file_name}</code></span>
              <span>Size: {(document.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--background)'
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            HireD Secure Private Document Storage • Verified Admin Session
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
