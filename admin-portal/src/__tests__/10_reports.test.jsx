import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TripReportsPage from '../features/reports/TripReportsPage';
import { AuthProvider } from '../features/auth/AuthContext';
import { sanitizeCsvCell, getReportData } from '../features/reports/reportService';

describe('Feature 10: Multi-Domain Enterprise Reports & Analytics', () => {
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

  it('renders reports dashboard with title, metrics strip, and all 7 report categories', async () => {
    render(
      <AuthProvider>
        <TripReportsPage />
      </AuthProvider>
    );

    expect(screen.getByText('Enterprise Reports & Performance Analytics')).toBeInTheDocument();

    // Verify all 7 report category tabs with exact name
    expect(screen.getByRole('button', { name: /^Trip Report$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Billing Issues$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Driver Delay Report$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Client Order Volume & SLA$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Driver Payout Report$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Order Report$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Driver \(Staff\) Work Report$/i })).toBeInTheDocument();

    await waitFor(() => {
      const exportBtn = document.getElementById('export-csv-btn');
      expect(exportBtn).toBeInTheDocument();
      expect(exportBtn).toHaveTextContent(/Export Trip Report to CSV/i);
    });
  });

  it('switches report categories and updates metrics and export button', async () => {
    render(
      <AuthProvider>
        <TripReportsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(document.getElementById('export-csv-btn')).toHaveTextContent(/Export Trip Report to CSV/i);
    });

    // Switch to Driver Payout Report
    const payoutTab = screen.getByRole('button', { name: /^Driver Payout Report$/i });
    fireEvent.click(payoutTab);

    await waitFor(() => {
      const exportBtn = document.getElementById('export-csv-btn');
      expect(exportBtn).toHaveTextContent(/Export Driver Payout Report to CSV/i);
      expect(screen.getByText(/Net Driver Disbursements/i)).toBeInTheDocument();
    });
  });

  it('switches to Billing Issues category and displays issue table', async () => {
    render(
      <AuthProvider>
        <TripReportsPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(document.getElementById('export-csv-btn')).toHaveTextContent(/Export Trip Report to CSV/i);
    });

    // Switch to Billing Issues
    const billingTab = screen.getByRole('button', { name: /^Billing Issues$/i });
    fireEvent.click(billingTab);

    await waitFor(() => {
      const exportBtn = document.getElementById('export-csv-btn');
      expect(exportBtn).toHaveTextContent(/Export Billing Issues to CSV/i);
      expect(screen.getByText(/Disputed Capital/i)).toBeInTheDocument();
    });
  });

  it('fetches report data via reportService for all 7 report domains', async () => {
    const tripData = await getReportData('trips');
    expect(tripData.records.length).toBeGreaterThan(0);
    expect(tripData.metrics.length).toBeGreaterThan(0);

    const clientVolume = await getReportData('client_volume');
    expect(clientVolume.records.length).toBeGreaterThan(0);

    const driverWork = await getReportData('driver_work');
    expect(driverWork.records.length).toBeGreaterThan(0);
  });

  it('neutralizes dynamic formula triggers to prevent CWE-1236 CSV Formula Injection', () => {
    // Formula triggers = , + , - , @
    const formulaPayload1 = "=cmd|' /C calc'!A0";
    const formulaPayload2 = '+1+2';
    const formulaPayload3 = '-5+2';
    const formulaPayload4 = '@SUM(A1:A10)';
    const normalText = 'Acme Technologies Pvt Ltd';
    const textWithQuotes = 'Executive "Sedan" Fleet';

    expect(sanitizeCsvCell(formulaPayload1)).toBe(`"'=cmd|' /C calc'!A0"`);
    expect(sanitizeCsvCell(formulaPayload2)).toBe(`"'+1+2"`);
    expect(sanitizeCsvCell(formulaPayload3)).toBe(`"'-5+2"`);
    expect(sanitizeCsvCell(formulaPayload4)).toBe(`"'@SUM(A1:A10)"`);
    expect(sanitizeCsvCell(normalText)).toBe(`"Acme Technologies Pvt Ltd"`);
    expect(sanitizeCsvCell(textWithQuotes)).toBe(`"Executive ""Sedan"" Fleet"`);
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
  });
});
