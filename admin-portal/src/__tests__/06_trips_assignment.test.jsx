import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TripsAssignmentPage from '../features/trips-assignment/TripsAssignmentPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { getEligibleDrivers } from '../features/trips-assignment/tripService';

describe('Feature 6: Trips Dispatch & Driver Assignment', () => {
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

  it('renders trips page with header, operational metrics, and table', async () => {
    render(
      <AuthProvider>
        <TripsAssignmentPage />
      </AuthProvider>
    );

    expect(screen.getByText(/Trip Dispatch & Driver Assignment/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Needs Driver').length).toBeGreaterThan(0);
      expect(screen.getByText('#TRP-2001')).toBeInTheDocument();
    });
  });

  it('filters trips by needs driver vs assigned status tabs', async () => {
    render(
      <AuthProvider>
        <TripsAssignmentPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('#TRP-2001')).toBeInTheDocument();
    });

    // Filter to Needs Driver
    const needsDriverTab = screen.getByRole('button', { name: /Needs Driver/i });
    fireEvent.click(needsDriverTab);

    await waitFor(() => {
      expect(screen.getByText('#TRP-2001')).toBeInTheDocument();
      expect(screen.queryByText('#TRP-2003')).not.toBeInTheDocument(); // Already assigned trip
    });

    // Switch to Assigned
    const assignedTab = screen.getByRole('button', { name: /Assigned/i });
    fireEvent.click(assignedTab);

    await waitFor(() => {
      expect(screen.getByText('#TRP-2003')).toBeInTheDocument();
      expect(screen.queryByText('#TRP-2001')).not.toBeInTheDocument();
    });
  });

  it('fetches eligible drivers matching vehicle category via service', async () => {
    const eligible = await getEligibleDrivers({ vehicleType: 'Sedan' });
    expect(eligible).toBeDefined();
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible.every((d) => d.vehicleType === 'Sedan')).toBe(true);
  });

  it('opens Assign Driver modal for unassigned trip and assigns driver', async () => {
    render(
      <AuthProvider>
        <TripsAssignmentPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('#TRP-2001')).toBeInTheDocument();
    });

    // Click Assign Driver button for an unassigned trip
    const assignButtons = screen.getAllByRole('button', { name: /Assign Driver/i });
    expect(assignButtons.length).toBeGreaterThan(0);
    fireEvent.click(assignButtons[0]);

    // Modal dialog opens
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/Assign Driver/i)).toBeInTheDocument();
    expect(within(modal).getByText(/SELECT ELIGIBLE DRIVER/i)).toBeInTheDocument();

    // Select the first eligible driver in the modal after loading
    await waitFor(() => {
      const cards = modal.querySelectorAll('.driver-select-card');
      expect(cards.length).toBeGreaterThan(0);
    });

    const driverCards = modal.querySelectorAll('.driver-select-card');
    fireEvent.click(driverCards[0]);

    // Confirm assignment
    const confirmBtn = within(modal).getByRole('button', { name: /Confirm & Assign Driver/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/successfully assigned to Trip/i)).toBeInTheDocument();
    });
  });

  it('opens Trip Details modal and inspects trip information', async () => {
    render(
      <AuthProvider>
        <TripsAssignmentPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('#TRP-2003')).toBeInTheDocument();
    });

    // Click Details button for assigned trip
    const detailsButtons = screen.getAllByRole('button', { name: /Details/i });
    expect(detailsButtons.length).toBeGreaterThan(0);
    fireEvent.click(detailsButtons[0]);

    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/Trip Start Security OTP/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Journey Route & Schedule/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Pickup Location/i)).toBeInTheDocument();
  });
});
