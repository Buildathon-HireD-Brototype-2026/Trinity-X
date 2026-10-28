import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DashboardPage from '../features/dashboard/DashboardPage';
import { AuthProvider } from '../features/auth/AuthContext';

describe('Feature 3: Operations Dashboard & Recent Orders Snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders top operational metric cards for Ongoing Trips and Pending Invoices', async () => {
    render(
      <AuthProvider>
        <DashboardPage onNavigate={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText(/Operations/i)).toBeInTheDocument();
    expect(screen.getByText(/Real-time platform overview/i)).toBeInTheDocument();

    expect(screen.getByText('Ongoing Trips')).toBeInTheDocument();
    expect(screen.getByText('Pending Invoice Verification')).toBeInTheDocument();
    expect(screen.getByText('Live on Route')).toBeInTheDocument();
    expect(screen.getByText('Verification Queue')).toBeInTheDocument();
  });

  it('triggers onNavigate callback when clicking metric cards and View All button', async () => {
    const handleNavigate = vi.fn();

    render(
      <AuthProvider>
        <DashboardPage onNavigate={handleNavigate} />
      </AuthProvider>
    );

    // Click Ongoing Trips metric card action
    fireEvent.click(screen.getByText('View Ongoing Trips'));
    expect(handleNavigate).toHaveBeenCalledWith('trips');

    // Click Verify Invoices metric card action
    fireEvent.click(screen.getByText('Verify Invoices'));
    expect(handleNavigate).toHaveBeenCalledWith('invoices');

    // Click View All in Recent Orders section
    fireEvent.click(screen.getByRole('button', { name: /View All/i }));
    expect(handleNavigate).toHaveBeenCalledWith('orders');
  });

  it('filters recent orders by status pills', async () => {
    render(
      <AuthProvider>
        <DashboardPage onNavigate={vi.fn()} />
      </AuthProvider>
    );

    // Initial default filter is Pending Orders
    await waitFor(() => {
      expect(screen.getByText('ORD-615')).toBeInTheDocument();
      expect(screen.getByText('Vikrant Roy')).toBeInTheDocument();
    });

    const filterToolbar = screen.getByRole('tablist', { name: /Status Filters/i });

    // Switch to "All Orders"
    fireEvent.click(within(filterToolbar).getByRole('button', { name: /All Orders/i }));
    await waitFor(() => {
      expect(screen.getByText('ORD-501')).toBeInTheDocument(); // Ongoing order
    });

    // Switch to "Ongoing"
    fireEvent.click(within(filterToolbar).getByRole('button', { name: /Ongoing/i }));
    await waitFor(() => {
      expect(screen.queryByText('Vikrant Roy')).not.toBeInTheDocument(); // Pending filtered out
      expect(screen.getByText('Pooja Verma')).toBeInTheDocument();
    });
  });

  it('searches orders by query string', async () => {
    render(
      <AuthProvider>
        <DashboardPage onNavigate={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-615')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search booking, location, passenger/i);
    fireEvent.change(searchInput, { target: { value: 'Ananya' } });

    await waitFor(() => {
      expect(screen.getByText('Ananya Nair')).toBeInTheDocument();
      expect(screen.queryByText('Vikrant Roy')).not.toBeInTheDocument();
    });

    // Clear search
    fireEvent.click(screen.getByLabelText(/Clear search/i));
    await waitFor(() => {
      expect(screen.getByText('Vikrant Roy')).toBeInTheDocument();
    });
  });

  it('opens order detail modal, displays route and handles acceptance', async () => {
    render(
      <AuthProvider>
        <DashboardPage onNavigate={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-615')).toBeInTheDocument();
    });

    // Click View for ORD-615
    const viewButtons = screen.getAllByRole('button', { name: /^View$/i });
    fireEvent.click(viewButtons[0]);

    // Modal dialog is displayed
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/Order Details/i)).toBeInTheDocument();
    expect(within(modal).getByText(/PICKUP LOCATION/i)).toBeInTheDocument();
    expect(within(modal).getByText(/DROP-OFF LOCATION/i)).toBeInTheDocument();

    // Accept & Assign Trip action
    const acceptBtn = within(modal).getByRole('button', { name: /Accept & Assign Trip/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(within(modal).getByText('ONGOING')).toBeInTheDocument();
    });
  });
});
