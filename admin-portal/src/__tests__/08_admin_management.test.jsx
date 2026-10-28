import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminManagementPage from '../features/admin-management/AdminManagementPage';
import { AuthProvider } from '../features/auth/AuthContext';

describe('Feature 8: Admin User Management & Safeguards', () => {
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

  it('renders admin management page with header, stats strip, and admin table', async () => {
    render(
      <AuthProvider>
        <AdminManagementPage />
      </AuthProvider>
    );

    expect(screen.getByText('Admin Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Total Admins')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Admin One')).toBeInTheDocument();
      expect(screen.getByText('Neha Sharma')).toBeInTheDocument();
    });
  });

  it('enforces self-deactivation restriction (VULN-01)', async () => {
    render(
      <AuthProvider>
        <AdminManagementPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin One')).toBeInTheDocument();
    });

    // Currently logged-in account gets the "You" pill
    expect(screen.getByText('You')).toBeInTheDocument();

    // Deactivate button for ADM-001 is disabled
    const selfDeactivateBtn = screen.getByRole('button', {
      name: /You cannot deactivate your own account/i,
    });
    expect(selfDeactivateBtn).toBeDisabled();
  });

  it('enforces PRD rule: cannot deactivate if doing so would leave < 2 active admins', async () => {
    render(
      <AuthProvider>
        <AdminManagementPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Neha Sharma')).toBeInTheDocument();
    });

    // Currently there are only 2 active admins (Admin One and Neha Sharma)
    // Deactivating Neha Sharma would leave only 1 active admin
    const nehaDeactivateBtn = screen.getByRole('button', {
      name: /Cannot deactivate: at least 2 active admins must remain/i,
    });
    expect(nehaDeactivateBtn).toBeDisabled();
  });

  it('validates password complexity in Add Admin modal', async () => {
    render(
      <AuthProvider>
        <AdminManagementPage />
      </AuthProvider>
    );

    // Open modal
    const addBtn = screen.getByRole('button', { name: /Add Admin/i });
    fireEvent.click(addBtn);

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText('Add New Admin')).toBeInTheDocument();

    // Fill basic details
    fireEvent.change(modal.querySelector('#add-admin-name'), {
      target: { value: 'Priya Mehta' },
    });
    fireEvent.change(modal.querySelector('#add-admin-email'), {
      target: { value: 'priya@hired.com' },
    });
    fireEvent.change(modal.querySelector('#add-admin-phone'), {
      target: { value: '9845011223' },
    });
    // Weak password
    fireEvent.change(modal.querySelector('#add-admin-password'), {
      target: { value: 'weakpass' },
    });

    // Submit
    const submitBtn = modal.querySelector('#add-admin-submit-btn');
    fireEvent.click(submitBtn);

    // Should display password complexity error
    expect(within(modal).getByText(/Password must contain at least one uppercase letter/i)).toBeInTheDocument();
  });

  it('adds a new admin and unlocks deactivation when > 2 active admins exist', async () => {
    render(
      <AuthProvider>
        <AdminManagementPage />
      </AuthProvider>
    );

    // Open modal
    const addBtn = screen.getByRole('button', { name: /Add Admin/i });
    fireEvent.click(addBtn);

    const modal = await screen.findByRole('dialog');

    // Fill valid details
    fireEvent.change(modal.querySelector('#add-admin-name'), {
      target: { value: 'Karan Kapoor' },
    });
    fireEvent.change(modal.querySelector('#add-admin-email'), {
      target: { value: 'karan@hired.com' },
    });
    fireEvent.change(modal.querySelector('#add-admin-phone'), {
      target: { value: '9876501234' },
    });
    fireEvent.change(modal.querySelector('#add-admin-password'), {
      target: { value: 'Password@123' },
    });

    // Submit
    const submitBtn = modal.querySelector('#add-admin-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Karan Kapoor has been added as an admin/i)).toBeInTheDocument();
      expect(screen.getByText('Karan Kapoor')).toBeInTheDocument();
    });

    // Now with 3 active admins (Admin One, Neha Sharma, Karan Kapoor),
    // Neha Sharma's deactivate button is no longer disabled!
    const nehaDeactivateBtn = screen.getByRole('button', {
      name: 'Deactivate Neha Sharma',
    });
    expect(nehaDeactivateBtn).toBeEnabled();
  });
});
