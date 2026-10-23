import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import orderService from '../services/orderService';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import statementService from '../services/statementService';
import useTableSubscription from '../hooks/useTableSubscription';
import {
  Car,
  Clock,
  CheckCircle2,
  FileText,
  PlusCircle,
  ArrowRight,
  Info,
  Eye,
} from 'lucide-react';

export function DashboardPage() {
  const { partner } = useAuth();
  const [orders, setOrders] = useState([]);
  const [publishedStatementsCount, setPublishedStatementsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const loadData = async (isQuiet = false) => {
    if (!isQuiet) setLoading(true);
    try {
      const [ordersData, statementsData] = await Promise.all([
        orderService.getOrders(),
        statementService.getPublishedStatements(),
      ]);
      setOrders(ordersData);
      setPublishedStatementsCount(statementsData.length);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      if (!isQuiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time automatic subscription to database changes on orders, trips, and invoices
  useTableSubscription(['orders', 'trips', 'invoices'], () => {
    loadData(true);
  });

  const ongoingTripsCount = orders.filter((o) => o.trip && (o.trip.status === 'ONGOING' || o.trip.trip_status === 'ONGOING')).length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'RECEIVED').length;
  const closedTripsCount = orders.filter((o) => o.trip && (o.trip.status === 'CLOSED' || o.trip.trip_status === 'CLOSED')).length;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome, {partner?.name || 'Partner'}</h1>
          <p className="page-subtitle">
            Manage your transport bookings, monitor active trips, view closed trip reports, and inspect verified statements.
          </p>
        </div>
        <Link to="/orders/new" className="btn btn-primary">
          <PlusCircle size={18} />
          <span>Create Transport Order</span>
        </Link>
      </div>

      {/* Offline Settlement Notice (PRD Phase 1 requirement) */}
      <div className="notice-box notice-info">
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Phase 1 Settlement Policy:</strong> Monthly statements become accessible in this portal only after mandatory verification by two administrators. All invoice settlements are conducted directly between your organization and HireD outside the platform.
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F0F9FF', color: '#0284C7' }}>
            <Car size={24} />
          </div>
          <div>
            <div className="metric-value">{ongoingTripsCount}</div>
            <div className="metric-label">Ongoing Trips</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="metric-value">{pendingOrdersCount}</div>
            <div className="metric-label">Pending Orders</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-value">{closedTripsCount}</div>
            <div className="metric-label">Closed Trips</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrap" style={{ backgroundColor: '#FAF5FF', color: 'var(--primary)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="metric-value">{publishedStatementsCount}</div>
            <div className="metric-label">Verified Statements</div>
          </div>
        </div>
      </div>

      {/* Recent Orders Overview */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent Transport Orders</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Real-time status of orders placed by your company.
            </p>
          </div>
          <Link
            to="/orders"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--primary)',
            }}
          >
            <span>View All</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Pickup Location</th>
                <th>Drop-off Location</th>
                <th>Scheduled Date & Time</th>
                <th>Passenger</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading recent orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No transport orders found. Click &quot;Create Transport Order&quot; to place your first booking.
                  </td>
                </tr>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <tr key={order.order_id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>ORD-{order.order_id}</span>
                      {order.trip && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                          TRIP-{order.trip.trip_id}
                        </div>
                      )}
                    </td>
                    <td>{order.pickup_spot}</td>
                    <td>{order.dropoff_spot}</td>
                    <td>{new Date(order.pickup_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td>
                      <div>{order.contact_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.contact_phone}</div>
                    </td>
                    <td>
                      <StatusBadge status={order.trip ? order.trip.status : order.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={() => setSelectedOrder(order)}
                        title="View details"
                      >
                        <Eye size={14} />
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

      {/* Details Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

export default DashboardPage;
