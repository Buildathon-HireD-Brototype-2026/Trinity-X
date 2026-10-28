import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import OrdersInboxPage from '../features/orders-inbox/OrdersInboxPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { getOrders, acceptOrder, rejectOrder, createManualOrder } from '../features/orders-inbox/orderService';

describe('Feature 5: Orders & Enquiries Inbox', () => {
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

  it('renders orders inbox with header, actions, and table', async () => {
    render(
      <AuthProvider>
        <OrdersInboxPage />
      </AuthProvider>
    );

    expect(screen.getByText(/Orders & Bookings Inbox/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('ORD-1001')).toBeInTheDocument();
      expect(screen.getAllByText('Acme Technologies Pvt Ltd').length).toBeGreaterThan(0);
    });
  });

  it('filters orders by status tabs', async () => {
    render(
      <AuthProvider>
        <OrdersInboxPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-1001')).toBeInTheDocument();
    });

    // Switch to Accepted Orders tab
    const acceptedTab = screen.getByRole('button', { name: /Accepted/i });
    fireEvent.click(acceptedTab);

    await waitFor(() => {
      expect(screen.getByText('ORD-1004')).toBeInTheDocument();
      expect(screen.queryByText('ORD-1001')).not.toBeInTheDocument(); // Pending filtered out
    });
  });

  it('searches orders by order ID or passenger name', async () => {
    render(
      <AuthProvider>
        <OrdersInboxPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('ORD-1001')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search ID, passenger, company/i);
    fireEvent.change(searchInput, { target: { value: 'Shreya' } });

    await waitFor(() => {
      expect(screen.getByText('Shreya Sengupta')).toBeInTheDocument();
      expect(screen.queryByText('Raghavan Iyer')).not.toBeInTheDocument();
    });
  });

  it('opens order detail modal, displays route and handles acceptance', async () => {
    render(
      <AuthProvider>
        <OrdersInboxPage />
      </AuthProvider>
    );

    // Switch to Pending tab to ensure pending order is selected
    fireEvent.click(screen.getByRole('button', { name: /^Pending$/i }));

    await waitFor(() => {
      expect(screen.getByText('ORD-1001')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(viewButtons[0]);

    // Modal dialog is displayed
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getByText(/Order #/i)).toBeInTheDocument();
    expect(within(modal).getByText(/PICKUP LOCATION/i)).toBeInTheDocument();

    // Accept order
    const acceptBtn = within(modal).getByRole('button', { name: /Accept & Convert to Trip/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(screen.getByText(/accepted and converted to live trip/i)).toBeInTheDocument();
    });
  });

  it('creates a new manual booking order via service', async () => {
    const newOrder = await createManualOrder({
      companyId: 1,
      companyName: 'Acme Technologies Pvt Ltd',
      pickupSpot: 'Indiranagar 100ft Rd',
      dropoffSpot: 'Electronic City Phase 1',
      pickupTime: '2026-10-25T10:00:00Z',
      contactName: 'Test Passenger',
      contactPhone: '+91 98450 99887',
      vehicleType: 'Sedan',
      notes: 'Urgent airport transfer',
      source: 'PHONE',
      estimatedFare: 1250.00
    });

    expect(newOrder.orderId).toBeDefined();
    expect(newOrder.status).toBe('RECEIVED');
    expect(newOrder.contactName).toBe('Test Passenger');
  });
});
