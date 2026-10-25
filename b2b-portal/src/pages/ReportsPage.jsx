import React, { useState, useEffect } from 'react';
import reportService from '../services/reportService';
import TripReportViewModal from '../components/reports/TripReportViewModal';
import { PageErrorState } from '../components/common/PageErrorState';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import {
  FileSpreadsheet,
  Search,
  Calendar,
  Download,
  Eye,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Receipt,
  Car,
} from 'lucide-react';

import useTableSubscription from '../hooks/useTableSubscription';

export function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = async (isQuiet = false) => {
    if (!isQuiet) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await reportService.getClosedTripReports();
      setReports(data || []);
      setError(null);
    } catch (err) {
      if (!isQuiet) {
        setError(getFriendlyErrorMessage(err, 'reports'));
      }
    } finally {
      if (!isQuiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Real-time automatic subscription to database changes on trips and expenses
  useTableSubscription(['trips', 'expenses'], () => {
    fetchReports(true);
  });

  // Filter logic
  const filteredReports = reports.filter((rep) => {
    if (periodFilter === 'OCT_2026') {
      const date = new Date(rep.closed_at);
      if (date.getFullYear() !== 2026 || date.getMonth() !== 9) return false;
    } else if (periodFilter === 'SEP_2026') {
      const date = new Date(rep.closed_at);
      if (date.getFullYear() !== 2026 || date.getMonth() !== 8) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = `trip-${rep.trip_id}`.toLowerCase().includes(q) || `ord-${rep.order_id}`.toLowerCase().includes(q);
      const matchPickup = rep.pickup_spot?.toLowerCase().includes(q);
      const matchDrop = rep.dropoff_spot?.toLowerCase().includes(q);
      const matchDriver = rep.driver_name?.toLowerCase().includes(q);
      return matchId || matchPickup || matchDrop || matchDriver;
    }

    return true;
  });

  // Calculate statistics
  const totalBaseAmount = filteredReports.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const totalExpenses = filteredReports.reduce((acc, r) => acc + Number(r.expenses_total || 0), 0);
  const totalGrossSpend = totalBaseAmount + totalExpenses;

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = ['Trip ID', 'Order ID', 'Pickup Spot', 'Dropoff Spot', 'Driver Name', 'Closed Date', 'Base Amount (INR)', 'Expenses (INR)', 'Total Spend (INR)'];
    const rows = filteredReports.map((r) => [
      `TRIP-${r.trip_id}`,
      `ORD-${r.order_id}`,
      `"${r.pickup_spot.replace(/"/g, '""')}"`,
      `"${r.dropoff_spot.replace(/"/g, '""')}"`,
      `"${(r.driver_name || '').replace(/"/g, '""')}"`,
      r.closed_at ? new Date(r.closed_at).toISOString().slice(0, 10) : 'N/A',
      r.amount,
      r.expenses_total,
      r.total_spend,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hired_closed_trips_${periodFilter}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Trip Reports</h1>
          <p className="page-subtitle">
            Inspect verified completion reports for closed trips, including fare breakdown and out-of-pocket expenses.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleExportCSV}
          disabled={filteredReports.length === 0}
          title="Download CSV"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-value">{filteredReports.length}</div>
            <div className="metric-label">Closed Trips</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#FAF5FF', color: 'var(--primary)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="metric-value">₹{totalBaseAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="metric-label">Base Trip Fares</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#FFFBEB', color: '#D97706' }}>
            <Receipt size={24} />
          </div>
          <div>
            <div className="metric-value">₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="metric-label">Logged Expenses</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="metric-value">₹{totalGrossSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="metric-label">Total Incurred</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '420px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '38px' }}
            placeholder="Search by Trip ID, route, or driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <Calendar size={16} />
            <span>Billing Period:</span>
          </div>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '160px' }}
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="ALL">All Recorded Months</option>
            <option value="OCT_2026">October 2026</option>
            <option value="SEP_2026">September 2026</option>
          </select>
        </div>
      </div>

      {/* Reports Table or Error State */}
      {error && reports.length === 0 ? (
        <PageErrorState message={error} onRetry={() => fetchReports(false)} />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trip & Order ID</th>
                  <th>Route (Pickup ➔ Destination)</th>
                  <th>Closed Timestamp</th>
                  <th>Driver</th>
                  <th style={{ textAlign: 'right' }}>Base Fare</th>
                  <th style={{ textAlign: 'right' }}>Expenses</th>
                  <th style={{ textAlign: 'right' }}>Total Cost</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Loading trip reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                        {reports.length === 0 ? 'No trip reports yet' : 'No closed trip reports found'}
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {reports.length === 0
                          ? 'Trip reports become available once trips are completed.'
                          : 'Try adjusting the search query or billing period filter.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                filteredReports.map((rep) => (
                  <tr key={rep.trip_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>TRIP-{rep.trip_id}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ORD-{rep.order_id}</div>
                    </td>

                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {rep.pickup_spot}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        ➔ {rep.dropoff_spot}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        {new Date(rep.closed_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(rep.closed_at).toLocaleTimeString('en-IN', {
                          timeStyle: 'short',
                        })}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 500 }}>{rep.driver_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rep.driver_phone}</div>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{Number(rep.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      {rep.expenses_total > 0 ? (
                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                          ₹{Number(rep.expenses_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>₹0.00</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{Number(rep.total_spend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                        onClick={() => setSelectedReport(rep)}
                        title="View Official Report"
                      >
                        <Eye size={15} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Official Trip Report View Modal */}
      {selectedReport && (
        <TripReportViewModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

export default ReportsPage;
