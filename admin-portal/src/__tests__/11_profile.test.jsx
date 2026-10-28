import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminProfilePage from '../features/profile/AdminProfilePage';
import { AuthProvider } from '../features/auth/AuthContext';

describe('Feature 11: Admin Profile & Credential Management', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(
      'hired_admin_session',
      JSON.stringify({
        id: 'ADM-001',
        name: 'Admin One',
        email: 'admin1@hired.com',
        phone: '+91 98450 11223',
        role: 'Admin',
        token: 'test_token',
      })
    );
  });

  it('renders admin profile with hero banner, credentials, and verification privileges', () => {
    render(
      <AuthProvider>
        <AdminProfilePage />
      </AuthProvider>
    );

    expect(screen.getByText('Admin Profile')).toBeInTheDocument();
    expect(screen.getAllByText('Admin One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin1@hired.com').length).toBeGreaterThan(0);
    expect(screen.getByText('ADMIN')).toBeInTheDocument();

    // Verification privileges
    expect(screen.getByText('Security & Verification Authority')).toBeInTheDocument();
    expect(screen.getByText('Two-Person Verification Sign-off')).toBeInTheDocument();
  });

  it('navigates back to dashboard when back button is clicked', () => {
    const handleNavigate = vi.fn();
    render(
      <AuthProvider>
        <AdminProfilePage onNavigate={handleNavigate} />
      </AuthProvider>
    );

    const backBtn = screen.getByRole('button', { name: /Back to Dashboard/i });
    fireEvent.click(backBtn);

    expect(handleNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('switches to edit mode, validates form fields, and cancels editing', async () => {
    render(
      <AuthProvider>
        <AdminProfilePage />
      </AuthProvider>
    );

    // Switch to edit mode
    const editBtn = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Administrator Profile')).toBeInTheDocument();

    const nameInput = document.getElementById('admin-name-input');
    expect(nameInput).toHaveValue('Admin One');

    // Validation: Clear name and submit
    fireEvent.change(nameInput, { target: { value: '' } });
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();

    // Cancel editing
    const cancelButtons = screen.getAllByRole('button', { name: /^Cancel$/i });
    fireEvent.click(cancelButtons[0]);

    expect(screen.queryByText('Edit Administrator Profile')).not.toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('updates admin contact credentials successfully', async () => {
    render(
      <AuthProvider>
        <AdminProfilePage />
      </AuthProvider>
    );

    // Open edit mode
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));

    const phoneInput = document.getElementById('admin-phone-input');
    fireEvent.change(phoneInput, { target: { value: '+91 99887 76655' } });

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Profile credentials updated successfully/i)).toBeInTheDocument();
      expect(screen.getByText('+91 99887 76655')).toBeInTheDocument();
    });
  });

  it('copies credential to clipboard when copy button is clicked', () => {
    render(
      <AuthProvider>
        <AdminProfilePage />
      </AuthProvider>
    );

    const copyButtons = screen.getAllByRole('button', { name: /Copy/i });
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);

    expect(screen.getByText(/Copied/i)).toBeInTheDocument();
  });
});
