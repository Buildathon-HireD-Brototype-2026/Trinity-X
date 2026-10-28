import React, { useState } from 'react';
import { X, Mail, Send, AlertTriangle, CheckCircle, FileText, Download, Eye, Building, ShieldCheck, Printer } from 'lucide-react';

export default function SendInvoiceEmailModal({ invoice, isOpen, onClose, onSendSuccess, currentAdmin }) {
  if (!isOpen || !invoice) return null;

  const isVerified = invoice.status === 'VERIFIED' || invoice.status === 'SENT';

  const [recipientEmail, setRecipientEmail] = useState(invoice.companyEmail || '');
  const [ccEmail, setCcEmail] = useState('finance@hired.com');
  const [subject, setSubject] = useState(
    `[HireD] Monthly Statement & Tax Invoice — #${invoice.id} (${invoice.billingPeriod})`
  );
  const [notes, setNotes] = useState(
    `Dear ${invoice.billingContact || invoice.companyName} Team,\n\nPlease find attached the verified monthly billing statement and ride breakdown for ${invoice.billingPeriod}.\n\nTotal Due: ₹${Number(invoice.totalAmount).toLocaleString('en-IN')}\nDue Date: ${invoice.dueDate}\n\nKindly process payment as per agreed contract terms.`
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [sentSuccess, setSentSuccess] = useState(invoice.status === 'SENT');
  const [previewDoc, setPreviewDoc] = useState(null); // 'PDF' | 'CSV' | null

  const handleSend = async (e) => {
    e.preventDefault();
    if (!isVerified) {
      setError('Cannot dispatch invoice: Two-person verification is required before an invoice can be sent.');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      await onSendSuccess(invoice.id, {
        recipientEmail,
        ccEmails: ccEmail,
        notes,
        senderAdmin: currentAdmin,
      });
      setSentSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to dispatch invoice email.');
    } finally {
      setIsSending(false);
    }
  };

  // Download real CSV file
  const handleDownloadCsv = () => {
    const headers = ['Trip ID', 'Date', 'Route', 'Gross Fare (INR)', 'Company Share (INR)'];
    const rows = (invoice.lineItems || []).map((item) => [
      item.tripId,
      item.date,
      `"${item.route}"`,
      item.fare,
      item.companyShare,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${invoice.id}_Trips_Telematics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Tax Invoice
  const handlePrintPdf = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${invoice.id} - Tax Invoice</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111827; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
              .title { font-size: 24px; font-weight: 800; color: #1e3a8a; }
              .subtitle { font-size: 13px; color: #6b7280; }
              .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
              table { width: 100%; border-collapse: collapse; margin-top: 24px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 13px; }
              th { background: #f3f4f6; text-align: left; font-weight: 600; color: #374151; }
              .totals-table { width: 340px; margin-left: auto; margin-top: 20px; }
              .totals-table td:last-child { text-align: right; font-weight: 600; }
              .stamp-box { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
              .stamp { border: 1px dashed #9ca3af; border-radius: 8px; padding: 16px; text-align: center; font-size: 12px; background: #fafafa; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">HIRED MOBILITY TECHNOLOGIES</div>
                <div class="subtitle">Official B2B Month-End Statement & Tax Invoice</div>
              </div>
              <div style="text-align: right; font-size: 13px;">
                <div><strong>Invoice Reference:</strong> ${invoice.id}</div>
                <div><strong>Billing Period:</strong> ${invoice.billingPeriod}</div>
                <div><strong>Due Date:</strong> ${invoice.dueDate}</div>
              </div>
            </div>
            <div class="meta-grid">
              <div>
                <strong>Billed Corporate Partner:</strong><br/>
                ${invoice.companyName}<br/>
                ${invoice.companyEmail}<br/>
                Attn: ${invoice.billingContact || 'Finance Desk'}
              </div>
              <div style="text-align: right;">
                <strong>Total Amount Payable:</strong><br/>
                <span style="font-size: 22px; color: #15803d; font-weight: 800;">₹${Number(invoice.totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Trip Ref</th>
                  <th>Route & Dropoff</th>
                  <th style="text-align: right;">Gross Fare</th>
                  <th style="text-align: right;">Company Share</th>
                </tr>
              </thead>
              <tbody>
                ${(invoice.lineItems || []).map((item) => `
                  <tr>
                    <td>${item.date}</td>
                    <td><strong>#${item.tripId}</strong></td>
                    <td>${item.route}</td>
                    <td style="text-align: right;">₹${item.fare}</td>
                    <td style="text-align: right; font-weight: 600;">₹${item.companyShare}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <table class="totals-table">
              <tr><td>Rides Subtotal</td><td>₹${Number(invoice.subtotal).toLocaleString('en-IN')}</td></tr>
              <tr><td>Platform Fee (10%)</td><td>₹${Number(invoice.platformFee).toLocaleString('en-IN')}</td></tr>
              <tr><td>GST (18% on Fee)</td><td>₹${Number(invoice.taxAmount).toLocaleString('en-IN')}</td></tr>
              <tr style="background: #f0fdf4; font-size: 15px;"><td><strong>Total Due</strong></td><td style="color: #15803d;">₹${Number(invoice.totalAmount).toLocaleString('en-IN')}</td></tr>
            </table>
            <div class="stamp-box">
              <div class="stamp">
                <strong>1st Verification Sign-off</strong><br/>
                ${invoice.firstApproval?.name || 'Authorized Admin'}<br/>
                <span style="color: #6b7280;">${invoice.firstApproval?.email || ''}</span><br/>
                <small>${invoice.firstApproval?.at ? new Date(invoice.firstApproval.at).toLocaleString() : 'Signed'}</small>
              </div>
              <div class="stamp">
                <strong>2nd Verification Sign-off</strong><br/>
                ${invoice.secondApproval?.name || 'Second Admin'}<br/>
                <span style="color: #6b7280;">${invoice.secondApproval?.email || ''}</span><br/>
                <small>${invoice.secondApproval?.at ? new Date(invoice.secondApproval.at).toLocaleString() : 'Signed'}</small>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 250);
    }
  };

  return (
    <>
      <div
        className="modal-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1rem',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="modal-card"
          style={{
            backgroundColor: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color, #e5e7eb)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-muted, #f9fafb)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mail size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                  Dispatch Invoice to B2B Company
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #6b7280)' }}>
                  {invoice.companyName} ({invoice.id})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary, #6b7280)',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Body */}
          <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
            {/* Show warning ONLY if verification is incomplete */}
            {!isVerified && (
              <div
                style={{
                  padding: '0.9rem 1rem',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef08a',
                  borderRadius: '8px',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  color: '#854d0e',
                }}
              >
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.85rem' }}>
                    Two-Person Verification Incomplete
                  </strong>
                  <span style={{ fontSize: '0.8rem' }}>
                    This month-end statement has not received all required administrative sign-offs. Both Creator
                    and Second Admin approval must be recorded before it can be sent to the B2B client.
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            {sentSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <CheckCircle size={32} />
                </div>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 600 }}>
                  Invoice Dispatched Successfully!
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #6b7280)', fontSize: '0.875rem' }}>
                  Delivered to <strong>{recipientEmail}</strong> (CC: {ccEmail}).
                </p>
                {invoice.dispatchAudit && (
                  <div
                    style={{
                      margin: '1.25rem auto 0',
                      maxWidth: '480px',
                      textAlign: 'left',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-muted, #f9fafb)',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary, #4b5563)',
                    }}
                  >
                    <div><strong>Sent By:</strong> {invoice.dispatchAudit.sentBy}</div>
                    <div><strong>Delivery Timestamp:</strong> {new Date(invoice.dispatchAudit.sentAt).toLocaleString()}</div>
                    <div><strong>Status:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>DELIVERED_TO_B2B</span></div>
                  </div>
                )}
              </div>
            ) : (
              <form id="send-invoice-form" onSubmit={handleSend}>
                {/* Recipient Details */}
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="recipient-email-input" style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    B2B Company Billing Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="recipient-email-input"
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. accounts.payable@company.com"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #d1d5db)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                {/* CC Email */}
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="cc-email-input" style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    CC (Finance / Account Manager)
                  </label>
                  <input
                    id="cc-email-input"
                    type="text"
                    value={ccEmail}
                    onChange={(e) => setCcEmail(e.target.value)}
                    placeholder="e.g. finance@hired.com, manager@hired.com"
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #d1d5db)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                {/* Subject */}
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="email-subject-input" style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Email Subject Line
                  </label>
                  <input
                    id="email-subject-input"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #d1d5db)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                {/* Message Notes */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label htmlFor="email-body-textarea" style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Email Body / Executive Note
                  </label>
                  <textarea
                    id="email-body-textarea"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #d1d5db)',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Attachments Card with Clickable Preview & Download */}
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: 'var(--bg-muted, #f3f4f6)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid var(--border-color, #e5e7eb)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1f2937', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                      System-Generated Attachments (2)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Click any file to preview details or download
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {/* Attachment 1: Tax Invoice PDF */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: '#fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#dc2626',
                          }}
                        >
                          <FileText size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>
                            {invoice.id}_Tax_Invoice.pdf
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                            Official Tax Invoice • ₹{Number(invoice.totalAmount).toLocaleString('en-IN')} Total
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc('PDF')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            color: '#1f2937',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                          title="Preview full Tax Invoice details and sign-offs"
                        >
                          <Eye size={14} color="#2563eb" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintPdf}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            color: '#1f2937',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                          title="Download or Print PDF"
                        >
                          <Download size={14} color="#4b5563" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    {/* Attachment 2: Trips Telematics CSV */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#16a34a',
                          }}
                        >
                          <FileText size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827' }}>
                            {invoice.id}_Trips_Telematics.csv
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                            Rides Telematics Spreadsheet • {invoice.lineItems?.length || 0} trip logs
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc('CSV')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            color: '#1f2937',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                          title="Preview trip spreadsheet items"
                        >
                          <Eye size={14} color="#16a34a" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadCsv}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '4px 10px',
                            fontSize: '0.78rem',
                            backgroundColor: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            color: '#1f2937',
                            cursor: 'pointer',
                            fontWeight: 500,
                          }}
                          title="Download CSV spreadsheet"
                        >
                          <Download size={14} color="#4b5563" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-color, #e5e7eb)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: 'var(--bg-muted, #f9fafb)',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {sentSuccess ? 'Close' : 'Cancel'}
            </button>
            {!sentSuccess && (
              <button
                id="send-invoice-submit-btn"
                type="submit"
                form="send-invoice-form"
                disabled={!isVerified || isSending}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !isVerified ? '#9ca3af' : '#2563eb',
                  color: '#ffffff',
                  cursor: !isVerified || isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}
                title={!isVerified ? 'Cannot send until both admin approvals are completed' : 'Send invoice to B2B company'}
              >
                <Send size={16} />
                {isSending ? 'Dispatching...' : 'Send Invoice to Company'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Document Preview Modal (Tax Invoice PDF or Telematics CSV) ────────────── */}
      {previewDoc && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewDoc(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Preview Modal Header */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f9fafb',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={20} color={previewDoc === 'PDF' ? '#dc2626' : '#16a34a'} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                    Document Verification Preview: {previewDoc === 'PDF' ? `${invoice.id}_Tax_Invoice.pdf` : `${invoice.id}_Trips_Telematics.csv`}
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                    Reviewing attachment details before sending to {invoice.companyName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Modal Body */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff', color: '#111827' }}>
              {previewDoc === 'PDF' ? (
                /* PDF Document Preview */
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #2563eb', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.25rem', fontWeight: 800 }}>HIRED MOBILITY TECHNOLOGIES</h2>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Monthly Corporate B2B Tax Invoice</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                      <div><strong>Invoice Ref:</strong> {invoice.id}</div>
                      <div><strong>Billing Period:</strong> {invoice.billingPeriod}</div>
                      <div><strong>Due Date:</strong> {invoice.dueDate}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Billed To:</span>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{invoice.companyName}</div>
                      <div style={{ color: '#4b5563' }}>{invoice.companyEmail}</div>
                      <div style={{ color: '#4b5563' }}>Attn: {invoice.billingContact || 'Accounts Payable'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Total Payable:</span>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#15803d' }}>
                        ₹{Number(invoice.totalAmount).toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Trips: {invoice.lineItems?.length || 0}</div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', marginBottom: '1.25rem' }}>
                    <thead style={{ backgroundColor: '#f3f4f6' }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid #e5e7eb' }}>Date</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid #e5e7eb' }}>Trip Ref</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', border: '1px solid #e5e7eb' }}>Route & Transit</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #e5e7eb' }}>Gross Fare</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', border: '1px solid #e5e7eb' }}>Company Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice.lineItems || []).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb' }}>{item.date}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb', fontWeight: 600 }}>#{item.tripId}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb' }}>{item.route}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb', textAlign: 'right' }}>₹{item.fare}</td>
                          <td style={{ padding: '8px 10px', border: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 600 }}>₹{item.companyShare}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Calculations */}
                  <div style={{ width: '320px', marginLeft: 'auto', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#6b7280' }}>Rides Subtotal:</span>
                      <span>₹{Number(invoice.subtotal).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#6b7280' }}>Platform Service Fee (10%):</span>
                      <span>₹{Number(invoice.platformFee).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                      <span style={{ color: '#6b7280' }}>Applicable GST (18% on Fee):</span>
                      <span>₹{Number(invoice.taxAmount).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #e5e7eb', fontWeight: 800, fontSize: '0.95rem' }}>
                      <span>Grand Total:</span>
                      <span style={{ color: '#15803d' }}>₹{Number(invoice.totalAmount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Verification Sign-offs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed #d1d5db' }}>
                    <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', textAlign: 'center', fontSize: '0.8rem' }}>
                      <div style={{ color: '#6b7280', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>1st Verification Sign-off</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{invoice.firstApproval?.name || 'Authorized Admin'}</div>
                      <div style={{ color: '#4b5563', fontSize: '0.75rem' }}>{invoice.firstApproval?.email || ''}</div>
                      <small style={{ color: '#9ca3af' }}>{invoice.firstApproval?.at ? new Date(invoice.firstApproval.at).toLocaleString() : 'Signed'}</small>
                    </div>

                    <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px', textAlign: 'center', fontSize: '0.8rem' }}>
                      <div style={{ color: '#6b7280', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>2nd Verification Sign-off</div>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{invoice.secondApproval?.name || 'Second Admin'}</div>
                      <div style={{ color: '#4b5563', fontSize: '0.75rem' }}>{invoice.secondApproval?.email || ''}</div>
                      <small style={{ color: '#9ca3af' }}>{invoice.secondApproval?.at ? new Date(invoice.secondApproval.at).toLocaleString() : 'Signed'}</small>
                    </div>
                  </div>
                </div>
              ) : (
                /* CSV Spreadsheet Preview */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Raw Ride Telematics Dataset</div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Total {invoice.lineItems?.length || 0} trip rows attached to this billing statement</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadCsv}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '6px 12px',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={15} />
                      <span>Download .CSV</span>
                    </button>
                  </div>

                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                      <thead style={{ backgroundColor: '#f3f4f6' }}>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Trip ID</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Route Coordinates / Pick-Drop</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Gross Fare (₹)</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Company Share (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(invoice.lineItems || []).map((item, idx) => (
                          <tr key={item.id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e3a8a' }}>#{item.tripId}</td>
                            <td style={{ padding: '8px 12px' }}>{item.date}</td>
                            <td style={{ padding: '8px 12px' }}>{item.route}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>₹{item.fare}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#15803d' }}>₹{item.companyShare}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Modal Footer */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f9fafb',
              }}
            >
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Back to Email
              </button>
              {previewDoc === 'PDF' && (
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <Printer size={16} />
                  <span>Print / Save Tax Invoice</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

