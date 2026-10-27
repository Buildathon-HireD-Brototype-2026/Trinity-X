import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import InvoiceVerificationPage from '../features/invoices/InvoiceVerificationPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { invoiceService } from '../features/invoices/invoiceService';

function renderInvoicePage(currentUser = { id: 'admin-2', name: 'Operations Admin', email: 'ops@hired.com', role: 'ADMIN' }) {
  localStorage.setItem(
    'hired_admin_user',
    JSON.stringify(currentUser)
  );
  sessionStorage.setItem('hired_admin_token', 'mock-valid-token');

  return render(
    <ThemeProvider>
      <AuthProvider>
        <InvoiceVerificationPage />
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('Feature 9: Month-End Invoice Verification & B2B Email Dispatch (PRD A-12)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    invoiceService.reset();
  });

  it('renders invoice verification page with header, operational metrics, and statements table', async () => {
    renderInvoicePage();

    // Verify Page Header
    expect(screen.getByText('Month-End Invoice Verification')).toBeInTheDocument();
    expect(screen.queryByText(/PRD A-12: Enforce two-person check/i)).not.toBeInTheDocument();

    // Verify Metric Strip Cards
    await waitFor(() => {
      expect(screen.getByText('Pending Verification')).toBeInTheDocument();
      expect(screen.getByText('Verified & Ready to Send')).toBeInTheDocument();
      expect(screen.getByText('Sent to B2B Clients')).toBeInTheDocument();
      expect(screen.getByText('Total Invoiced Volume')).toBeInTheDocument();
    });

    // Verify Seed Statements Rendered
    expect(screen.getAllByText('TechCorp Solutions Ltd')[0]).toBeInTheDocument();
    expect(screen.getByText('Infosys BPM Corporate Services')).toBeInTheDocument();
    expect(screen.getByText('Wipro Technologies Bangalore')).toBeInTheDocument();
  });

  it('filters invoice statements by search query', async () => {
    renderInvoicePage();

    await waitFor(() => {
      expect(screen.getAllByText('TechCorp Solutions Ltd')[0]).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search company or statement ID/i);
    fireEvent.change(searchInput, { target: { value: 'Wipro' } });

    await waitFor(() => {
      expect(screen.getByText('Wipro Technologies Bangalore')).toBeInTheDocument();
      expect(screen.queryByText('TechCorp Solutions Ltd')).not.toBeInTheDocument();
    });
  });

  it('enforces PRD A-12 Two-Person Verification workflow and prevents self-approval', async () => {
    // Current admin is 'admin-1' (who signed first approval on STMT-2026-10-02)
    const adminOne = { id: 'admin-1', name: 'Super Admin', email: 'admin@hired.com', role: 'ADMIN' };
    renderInvoicePage(adminOne);

    await waitFor(() => {
      expect(screen.getByText('Infosys BPM Corporate Services')).toBeInTheDocument();
    });

    // Open review modal for STMT-2026-10-02 (Needs 2nd admin approval)
    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[1]); // Infosys statement

    await waitFor(() => {
      expect(screen.getByText(/Two-Person Month-End Verification Audit Trail/i)).toBeInTheDocument();
    });

    // Verify anti-self-approval rule: Admin 1 cannot click 2nd approval because they signed 1st approval
    const secondApprovalBtn = screen.getByRole('button', { name: /Sign 2nd Approval/i });
    expect(secondApprovalBtn).toBeDisabled();
    expect(screen.getByText(/Company compliance policy mandates that another active admin must provide the second approval/i)).toBeInTheDocument();

    // Now attempt verification with a DIFFERENT admin (Operations Admin admin-2)
    const distinctAdmin = { id: 'admin-2', name: 'Priya Finance', email: 'priya.finance@hired.com' };
    const updated = await invoiceService.approveSecond('STMT-2026-10-02', distinctAdmin);
    expect(updated.status).toBe('VERIFIED');
    expect(updated.secondApproval.email).toBe('priya.finance@hired.com');
  });

  it('opens B2B Email Dispatch modal, validates PRD gatekeeper, and sends invoice to corporate email', async () => {
    renderInvoicePage();

    // STMT-2026-10-01 is VERIFIED, so Send button is enabled
    await waitFor(() => {
      expect(screen.getAllByText('TechCorp Solutions Ltd')[0]).toBeInTheDocument();
    });

    const sendButtons = screen.getAllByRole('button', { name: /^Send$/i });
    expect(sendButtons[0]).not.toBeDisabled();

    // Click Send on TechCorp statement
    fireEvent.click(sendButtons[0]);

    // Verify Send Invoice Email Modal opens
    await waitFor(() => {
      expect(screen.getByText('Dispatch Invoice to B2B Company')).toBeInTheDocument();
    });

    // Check pre-filled company recipient email
    const recipientInput = screen.getByLabelText(/B2B Company Billing Email/i);
    expect(recipientInput.value).toBe('billing@techcorpsolutions.com');

    // Verify PRD A-12 verification text is removed as requested
    expect(screen.queryByText(/PRD A-12 Verified/i)).not.toBeInTheDocument();

    // Check system attachments (PDF & CSV) are rendered with readable names
    expect(screen.getByText(/Tax_Invoice\.pdf/i)).toBeInTheDocument();
    expect(screen.getByText(/Trips_Telematics\.csv/i)).toBeInTheDocument();

    // Verify admin can click "Preview" on attachment to inspect details
    const previewButtons = screen.getAllByRole('button', { name: /Preview/i });
    fireEvent.click(previewButtons[0]); // Preview PDF Tax Invoice

    await waitFor(() => {
      expect(screen.getByText(/Document Verification Preview/i)).toBeInTheDocument();
      expect(screen.getByText(/HIRED MOBILITY TECHNOLOGIES/i)).toBeInTheDocument();
    });

    // Close preview to return to email form
    const backBtn = screen.getByRole('button', { name: /Back to Email/i });
    fireEvent.click(backBtn);

    // Click Send Invoice to Company
    const submitBtn = screen.getByRole('button', { name: /Send Invoice to Company/i });
    fireEvent.click(submitBtn);

    // Verify success confirmation
    await waitFor(() => {
      expect(screen.getByText(/Invoice Dispatched Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/DELIVERED_TO_B2B/i)).toBeInTheDocument();
    });
  });

  it('generates a new monthly statement draft via modal', async () => {
    renderInvoicePage();

    await waitFor(() => {
      expect(screen.getByText('Month-End Invoice Verification')).toBeInTheDocument();
    });

    // Click Generate Statement
    const generateBtn = screen.getByRole('button', { name: /Generate Statement/i });
    fireEvent.click(generateBtn);

    // Verify Modal Opens
    await waitFor(() => {
      expect(screen.getByText('Generate Monthly Statement')).toBeInTheDocument();
    });

    // Submit statement creation
    const submitBtn = screen.getByRole('button', { name: /Create Draft Statement/i });
    fireEvent.click(submitBtn);

    // Modal closes and new statement is added to list
    await waitFor(() => {
      expect(screen.queryByText('Generate Monthly Statement')).not.toBeInTheDocument();
    });
  });

  it('filters invoice statements by status tabs (Needs Verification, Ready to Send, Sent to B2B)', async () => {
    renderInvoicePage();

    await waitFor(() => {
      expect(screen.getByText('Month-End Invoice Verification')).toBeInTheDocument();
    });

    // Click "Needs Verification" tab
    const needsVerificationTab = screen.getByRole('button', { name: /Needs Verification/i });
    fireEvent.click(needsVerificationTab);

    await waitFor(() => {
      // TechCorp is VERIFIED, so it should be filtered out
      expect(screen.queryByText('TechCorp Solutions Ltd')).not.toBeInTheDocument();
      // Infosys (PENDING_APPROVAL_2) and Wipro (PENDING_APPROVAL_1) should be visible
      expect(screen.getByText('Infosys BPM Corporate Services')).toBeInTheDocument();
      expect(screen.getByText('Wipro Technologies Bangalore')).toBeInTheDocument();
    });

    // Click "Ready to Send" tab
    const readyToSendTab = screen.getByRole('button', { name: /Ready to Send/i });
    fireEvent.click(readyToSendTab);

    await waitFor(() => {
      // TechCorp is VERIFIED, so it should be visible
      expect(screen.getByText('TechCorp Solutions Ltd')).toBeInTheDocument();
      // Infosys and Wipro should be filtered out
      expect(screen.queryByText('Infosys BPM Corporate Services')).not.toBeInTheDocument();
      expect(screen.queryByText('Wipro Technologies Bangalore')).not.toBeInTheDocument();
    });
  });

  it('signs 1st approval on a draft statement advancing status from PENDING_APPROVAL_1 to PENDING_APPROVAL_2', async () => {
    renderInvoicePage();

    await waitFor(() => {
      expect(screen.getByText('Wipro Technologies Bangalore')).toBeInTheDocument();
    });

    // Wipro Technologies Bangalore is in PENDING_APPROVAL_1
    // Click Review on Wipro's statement (STMT-2026-10-03)
    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[2]); // Wipro statement

    await waitFor(() => {
      expect(screen.getByText(/Two-Person Month-End Verification Audit Trail/i)).toBeInTheDocument();
    });

    // Click Sign 1st Approval
    const firstApprovalBtn = screen.getByRole('button', { name: /Sign 1st Approval/i });
    expect(firstApprovalBtn).toBeInTheDocument();
    fireEvent.click(firstApprovalBtn);

    // Verify toast or updated status
    await waitFor(() => {
      expect(screen.getByText(/1st approval recorded/i)).toBeInTheDocument();
    });
  });
});
