import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../src/features/auth/LoginPage';
import { AuthProvider } from '../src/features/auth/AuthContext';

describe('Admin LoginPage Component & Backend Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();

    // Default fetch mock returning 401 for bad credentials
    global.fetch = vi.fn().mockImplementation(async (url, options) => {
      const body = JSON.parse(options?.body || '{}');
      if (body.email_id === 'admin1@hired.com' && body.password === 'Admin@12345') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: {
              access_token: 'mock_jwt_access_token',
              refresh_token: 'mock_jwt_refresh_token',
              user: {
                adminId: 1,
                adminName: 'Lead Admin Savio',
                emailId: 'admin1@hired.com',
                userType: 'ADMIN',
              },
            },
          }),
        };
      }

      return {
        ok: false,
        status: 401,
        json: async () => ({
          status: 'error',
          message: 'Invalid email or password. Please try again.',
        }),
      };
    });
  });

  const renderWithAuth = () => {
    return render(
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    );
  };

  it('renders login page title, inputs, and submit button', () => {
    renderWithAuth();

    expect(screen.getByRole('heading', { name: /admin portal/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/admin@hired\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('TC-AUTH-VAL-01: displays validation errors when submitting blank fields', async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    expect(await screen.findByText(/email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('TC-AUTH-VAL-04: displays error on invalid email format', async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const emailInput = screen.getByPlaceholderText(/admin@hired\.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'Secret123');
    await user.click(submitBtn);

    expect(await screen.findByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('TC-AUTH-HP-03: toggles password visibility when eye icon clicked', async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    await user.click(toggleBtn);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideBtn = screen.getByRole('button', { name: /hide password/i });
    await user.click(hideBtn);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('TC-AUTH-HP-01: successfully logs in via backend API and stores session', async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const emailInput = screen.getByPlaceholderText(/admin@hired\.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'admin1@hired.com');
    await user.type(passwordInput, 'Admin@12345');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/admin/login'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      expect(localStorage.getItem('hired_admin_token')).toBeNull();
      expect(sessionStorage.getItem('hired_admin_profile')).toBeTruthy();
    });
  });

  it('TC-AUTH-HP-02: submits form when pressing Enter key in password field', async () => {
    const user = userEvent.setup();
    renderWithAuth();

    const emailInput = screen.getByPlaceholderText(/admin@hired\.com/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    await user.type(emailInput, 'notfound@hired.com');
    await user.type(passwordInput, 'wrongpass{Enter}');

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
