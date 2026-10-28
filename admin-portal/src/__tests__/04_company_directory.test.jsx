import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import CompanyDirectoryPage from '../features/company-directory/CompanyDirectoryPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { updatePayoutSplit } from '../features/company-directory/companyService';

describe('Feature 4: Corporate Company Directory & Registration Onboarding', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(
      'hired_admin_session',
      JSON.stringify({
        id: 'ADM-001',
        name: 'Admin One',
        email: 'admin1@hired.com',
        role: 'Admin',
        token: 'test_token',
      })
    );
  });

  it('renders company directory page with metrics and company table', async () => {
    render(
      <AuthProvider>
        <CompanyDirectoryPage />
      </AuthProvider>
    );

    expect(screen.getByText(/Company Directory & Accounts/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Acme Technologies Pvt Ltd')).toBeInTheDocument();
      expect(screen.getByText('Nexus Logistics India')).toBeInTheDocument();
    });
  });

  it('switches between Active Partners and Pending Approvals tabs', async () => {
    render(
      <AuthProvider>
        <CompanyDirectoryPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Technologies Pvt Ltd')).toBeInTheDocument();
    });

    // Switch to Pending Registration Requests tab
    const requestsTab = screen.getByRole('button', { name: /Registration Requests/i });
    fireEvent.click(requestsTab);

    await waitFor(() => {
      expect(screen.getByText('BluePeak Analytics Pvt Ltd')).toBeInTheDocument();
      expect(screen.getByText('Apex Cloud Solutions')).toBeInTheDocument();
    });
  });

  it('filters company accounts by status', async () => {
    render(
      <AuthProvider>
        <CompanyDirectoryPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Technologies Pvt Ltd')).toBeInTheDocument();
    });

    // Filter by Active Only
    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(screen.getByText('Acme Technologies Pvt Ltd')).toBeInTheDocument();
      expect(screen.queryByText('Zenith Global Healthcare')).not.toBeInTheDocument(); // Inactive filtered out
    });
  });

  it('enforces PRD split rate validation (HireD + Driver = 100%)', async () => {
    // Valid split: 25% + 75% = 100%
    const validResult = await updatePayoutSplit(1, 25, 75);
    expect(validResult.hiredSplit).toBe(25);
    expect(validResult.driverSplit).toBe(75);

    // Invalid split: 20% + 70% = 90% (throws validation error)
    await expect(updatePayoutSplit(1, 20, 70)).rejects.toThrow(
      /HireD split and Driver split must sum to exactly 100\.00%/i
    );
  });

  it('opens review modal for pending partner request and handles approval', async () => {
    render(
      <AuthProvider>
        <CompanyDirectoryPage />
      </AuthProvider>
    );

    // Switch to Pending Registration Requests tab
    fireEvent.click(screen.getByRole('button', { name: /Registration Requests/i }));

    await waitFor(() => {
      expect(screen.getByText('BluePeak Analytics Pvt Ltd')).toBeInTheDocument();
    });

    // Click Review Request button
    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    // Review Modal is displayed
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText('BluePeak Analytics Pvt Ltd')).toBeInTheDocument();

    // Click Approve & Onboard
    const approveBtn = within(modal).getByRole('button', { name: /Approve & Onboard/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/approved and onboarded into active directory/i)).toBeInTheDocument();
    });
  });
});
