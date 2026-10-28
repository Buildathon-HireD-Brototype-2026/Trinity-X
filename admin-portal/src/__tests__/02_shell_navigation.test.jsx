import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminShell from '../components/layout/AdminShell';
import { AuthProvider } from '../features/auth/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

function renderShell(initialUser = { id: 'ADM-002', name: 'Neha Sharma', email: 'admin2@hired.com', role: 'Admin' }) {
  sessionStorage.setItem('hired_admin_session', JSON.stringify({
    ...initialUser,
    token: 'test_token',
    expiresAt: Date.now() + 3600000,
  }));

  return render(
    <ThemeProvider>
      <AuthProvider>
        <AdminShell />
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('Feature 2: Admin Shell, Sidebar Navigation & Cross-Module Connectivity', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('renders full sidebar with all 8 operational modules and branding', () => {
    renderShell();

    const aside = screen.getByRole('complementary', { name: /Main Navigation/i });
    expect(within(aside).getByRole('button', { name: /Dashboard Overview/i })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Company Directory/i })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Orders Inbox/i })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Ongoing Trips/i })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Driver Onboarding/i })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Admin Onboarding/i })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Invoice Verification/i })).toBeInTheDocument();
    expect(within(aside).getByRole('button', { name: /Reports/i })).toBeInTheDocument();
  });

  it('renders top navbar with admin identity, role badge, and theme toggle', () => {
    renderShell();

    expect(screen.getAllByText('Neha Sharma').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin2@hired.com').length).toBeGreaterThan(0);
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByTitle(/Switch to dark mode|Switch to light mode/i)).toBeInTheDocument();
  });

  it('navigates between modules and updates URL search parameter properly', async () => {
    renderShell();

    // Default view is Dashboard
    expect(screen.getByRole('heading', { name: /Recent orders/i })).toBeInTheDocument();

    // Navigate to Company Directory
    fireEvent.click(screen.getByRole('button', { name: /Company Directory/i }));
    await waitFor(() => {
      expect(window.location.search).toContain('tab=company');
      expect(screen.getByText(/Company Directory & Accounts/i)).toBeInTheDocument();
    });

    // Navigate to Invoice Verification
    fireEvent.click(screen.getByRole('button', { name: /Invoice Verification/i }));
    await waitFor(() => {
      expect(window.location.search).toContain('tab=invoices');
      expect(screen.getByText(/Month-End Invoice Verification/i)).toBeInTheDocument();
    });

    // Navigate to Reports
    fireEvent.click(screen.getByRole('button', { name: /Reports/i }));
    await waitFor(() => {
      expect(window.location.search).toContain('tab=reports');
      expect(screen.getByText(/Enterprise Reports & Performance Analytics/i)).toBeInTheDocument();
    });
  });

  it('navigates to Admin Profile when clicking navbar user details or sidebar user card', async () => {
    renderShell();

    const profileTrigger = screen.getByTitle(/Click to view full Admin Profile/i);
    fireEvent.click(profileTrigger);

    await waitFor(() => {
      expect(window.location.search).toContain('tab=profile');
      expect(screen.getByRole('heading', { name: /Admin Profile/i })).toBeInTheDocument();
    });
  });

  it('collapses and expands sidebar when toggling collapse button', () => {
    renderShell();

    const collapseBtn = screen.getByRole('button', { name: /Collapse sidebar/i });
    expect(collapseBtn).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Expand sidebar/i }));
    expect(screen.getByRole('button', { name: /Collapse sidebar/i })).toBeInTheDocument();
  });
});
