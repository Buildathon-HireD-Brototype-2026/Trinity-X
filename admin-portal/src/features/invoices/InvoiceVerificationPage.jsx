import { getFriendlyError, getFriendlyLoadError } from '../../utils/friendlyError';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { invoiceService } from './invoiceService';
import InvoiceMetricsStrip from './components/InvoiceMetricsStrip';
import InvoiceTable from './components/InvoiceTable';
import InvoiceVerificationModal from './components/InvoiceVerificationModal';
import SendInvoiceEmailModal from './components/SendInvoiceEmailModal';
import GenerateStatementModal from './components/GenerateStatementModal';

const FILTER_TABS = [
  { id: 'ALL', label: 'All Statements' },
  { id: 'PENDING', label: 'Needs Verification' },
  { id: 'VERIFIED', label: 'Ready to Send' },
  { id: 'SENT', label: 'Sent to B2B' },
];

export default function InvoiceVerificationPage() {
  const { user: currentUser } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  // Modal controls
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // ── Load Invoices ──────────────────────────────────────────────────────────
  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoiceService.getInvoices({ search: searchQuery });
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setInvoices([]);
      showToast(getFriendlyLoadError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Filter by Status Tab ───────────────────────────────────────────────────
  const filteredInvoices = invoices.filter((inv) => {
    if (activeTab === 'PENDING') {
      return inv.status === 'PENDING_APPROVAL_1' || inv.status === 'PENDING_APPROVAL_2';
    }
    if (activeTab === 'VERIFIED') {
      return inv.status === 'VERIFIED';
    }
    if (activeTab === 'SENT') {
      return inv.status === 'SENT';
    }
    return true;
  });

  // ── Approval Handlers ──────────────────────────────────────────────────────
  const handleApproveFirst = async (id) => {
    try {
      const updated = await invoiceService.approveFirst(id, currentUser || { email: 'admin@hired.com', name: 'Admin' });
      setSelectedInvoice(updated);
      showToast(`1st approval recorded for #${updated.id || id}`, 'success');
      await loadInvoices();
    } catch (err) {
      showToast(getFriendlyError(err), 'error');
    }
  };

  const handleApproveSecond = async (id) => {
    try {
      const updated = await invoiceService.approveSecond(id, currentUser || { email: 'ops@hired.com', name: 'Operations Admin' });
      setSelectedInvoice(updated);
      showToast(`Verification complete (2/2) for #${updated.id || id}! Ready to send.`, 'success');
      await loadInvoices();
    } catch (err) {
      showToast(getFriendlyError(err), 'error');
    }
  };

  // ── Send Email Dispatch Handler ───────────────────────────────────────────
  const handleSendSuccess = async (id, payload) => {
    const updated = await invoiceService.sendInvoiceToCompany(id, payload);
    setSelectedInvoice(updated);
    showToast(`Invoice #${updated.id} successfully dispatched to ${payload.recipientEmail}!`, 'success');
    await loadInvoices();
  };

  // ── Generate Statement Handler ────────────────────────────────────────────
  const handleGenerateStatement = async (formData) => {
    const created = await invoiceService.createInvoice(formData, currentUser);
    showToast(`Draft statement #${created.id} generated for ${created.companyName}!`, 'success');
    await loadInvoices();
  };

  return (
    <div className="invoice-verification-page admin-mgmt-page">
      {/* Toast Alert Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #111827)' }}>
            Month-End Invoice Verification
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadInvoices}
            disabled={loading}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            id="generate-statement-btn"
            type="button"
            className="btn btn-primary"
            onClick={() => setIsGenerateModalOpen(true)}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <Plus size={16} />
            Generate Statement
          </button>
        </div>
      </div>

      {/* Operational Metric KPI Strip */}
      <InvoiceMetricsStrip invoices={invoices} />

      {/* Filter Tabs and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-muted, #f3f4f6)', padding: '4px', borderRadius: '8px' }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                color: activeTab === tab.id ? '#111827' : '#6b7280',
                fontWeight: activeTab === tab.id ? 600 : 500,
                fontSize: '0.825rem',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
            }}
          />
          <input
            id="search-invoices-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company or statement ID..."
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem 0.5rem 2rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #d1d5db)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Statements Table */}
      <InvoiceTable
        invoices={filteredInvoices}
        onReview={(inv) => {
          setSelectedInvoice(inv);
          setIsReviewModalOpen(true);
        }}
        onSend={(inv) => {
          setSelectedInvoice(inv);
          setIsSendModalOpen(true);
        }}
      />

      {/* Review & Verification Modal */}
      <InvoiceVerificationModal
        invoice={selectedInvoice}
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedInvoice(null);
        }}
        onApproveFirst={handleApproveFirst}
        onApproveSecond={handleApproveSecond}
        onOpenSendModal={(inv) => {
          setSelectedInvoice(inv);
          setIsSendModalOpen(true);
        }}
        currentAdmin={currentUser}
      />

      {/* ⭐ Send Invoice to B2B Company Email Modal */}
      <SendInvoiceEmailModal
        invoice={selectedInvoice}
        isOpen={isSendModalOpen}
        onClose={() => {
          setIsSendModalOpen(false);
          setSelectedInvoice(null);
        }}
        onSendSuccess={handleSendSuccess}
        currentAdmin={currentUser}
      />

      {/* Generate Monthly Statement Modal */}
      <GenerateStatementModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={handleGenerateStatement}
        currentAdmin={currentUser}
      />
    </div>
  );
}
