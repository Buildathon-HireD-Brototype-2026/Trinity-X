import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../features/auth/LoginPage';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';

function TestConsumer() {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</div>
      <div data-testid="user-email">{user?.email || 'NONE'}</div>
      <button onClick={() => logout()} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
}

describe('Feature 1: Admin Authentication & Session Management', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders login page with input fields, labels and branding', () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    expect(screen.getByText('Admin Portal')).toBeInTheDocument();
    expect(screen.getByLabelText(/Admin Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Dashboard/i })).toBeInTheDocument();
  });

  it('validates empty email and password submission', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));

    expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Password is required/i)).toBeInTheDocument();
  });

  it('validates invalid email format', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'invalid-email-format' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'Password@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  it('authenticates valid admin credentials and updates session state', async () => {
    render(
      <AuthProvider>
        <LoginPage />
        <TestConsumer />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'admin1@hired.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'Password@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');
      expect(screen.getByTestId('user-email')).toHaveTextContent('admin1@hired.com');
    });

    // Validates secure storage persistence
    const savedSession = sessionStorage.getItem('hired_admin_session');
    expect(savedSession).toBeTruthy();
    const parsed = JSON.parse(savedSession);
    expect(parsed.email).toBe('admin1@hired.com');
    expect(parsed.token).toBeTruthy();
  });

  it('rejects wrong password and displays error message', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'admin1@hired.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'WrongPassword999' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));

    expect(
      await screen.findByText(/Invalid email or password\. Please try again\./i)
    ).toBeInTheDocument();
  });

  it('blocks deactivated admin from logging in', async () => {
    render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'inactive@hired.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'Password@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));

    expect(
      await screen.findByText(/Your account is deactivated\. Please contact support\./i)
    ).toBeInTheDocument();
  });

  it('signs out admin and clears storage cleanly on logout', async () => {
    render(
      <AuthProvider>
        <LoginPage />
        <TestConsumer />
      </AuthProvider>
    );

    // Login first
    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'admin1@hired.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'Password@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/i }));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');
    });

    // Now logout
    fireEvent.click(screen.getByTestId('logout-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
      expect(sessionStorage.getItem('hired_admin_session')).toBeNull();
    });
  });
});
