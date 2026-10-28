import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DriverOnboardingPage from '../features/driver-onboarding/DriverOnboardingPage';
import { AuthProvider } from '../features/auth/AuthContext';

describe('Feature 7: Driver Onboarding & 4-Doc KYC Verification', () => {
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

  it('renders driver onboarding page with metrics, tabs, and pending queue', async () => {
    render(
      <AuthProvider>
        <DriverOnboardingPage />
      </AuthProvider>
    );

    expect(screen.getByText(/Driver Onboarding & Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Applications/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Review/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Drivers/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Review/i }).length).toBeGreaterThan(0);
    });
  });

  it('switches between Verification Queue and Driver Directory tabs', async () => {
    render(
      <AuthProvider>
        <DriverOnboardingPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Review/i }).length).toBeGreaterThan(0);
    });

    const directoryTab = screen.getByRole('button', { name: /Driver Directory/i });
    fireEvent.click(directoryTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by name, phone, area/i)).toBeInTheDocument();
    });
  });

  it('opens KYC Review modal and displays the 4 required documents checklist', async () => {
    render(
      <AuthProvider>
        <DriverOnboardingPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Review/i }).length).toBeGreaterThan(0);
    });

    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText('Driving Licence')).toBeInTheDocument();
    expect(within(modal).getByText('Aadhaar Card')).toBeInTheDocument();
    expect(within(modal).getByText('PAN Card')).toBeInTheDocument();
    expect(within(modal).getByText('Police Clearance Certificate')).toBeInTheDocument();
  });

  it('approves a pending driver through the KYC review modal', async () => {
    render(
      <AuthProvider>
        <DriverOnboardingPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Review/i }).length).toBeGreaterThan(0);
    });

    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    const modal = await screen.findByRole('dialog');
    const approveBtn = within(modal).getByRole('button', { name: /Approve & Mark Active/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/approved and marked ACTIVE/i)).toBeInTheDocument();
    });
  });

  it('opens Onboard Driver modal and registers a new driver', async () => {
    render(
      <AuthProvider>
        <DriverOnboardingPage />
      </AuthProvider>
    );

    // Open Add Driver modal
    const onboardBtn = screen.getByRole('button', { name: /Onboard Driver/i });
    fireEvent.click(onboardBtn);

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/Onboard New Driver/i)).toBeInTheDocument();

    // Fill form
    const nameInput = modal.querySelector('#driver-name-input');
    const phoneInput = modal.querySelector('#driver-phone-input');

    fireEvent.change(nameInput, { target: { value: 'Ganesh Sharma' } });
    fireEvent.change(phoneInput, { target: { value: '9845012345' } });

    // Submit
    const submitBtn = within(modal).getByRole('button', { name: /Register Driver/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ganesh Sharma onboarded successfully/i)).toBeInTheDocument();
    });
  });
});
