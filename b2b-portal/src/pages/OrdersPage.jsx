import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../services/orderService';
import { StatusBadge } from '../components/common/StatusBadge';
import OrderDetailModal from '../components/orders/OrderDetailModal';
import {
  Search,
  Filter,
  PlusCircle,
  Clock,
  Car,
  Eye,
  KeyRound,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, ORDERS, ACTIVE_TRIPS, CLOSED_TRIPS
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    // Tab filter
    if (activeTab === 'ORDERS' && order.status === 'ACCEPTED' && order.trip) {
      return false;
    }
    if (activeTab === 'ACTIVE_TRIPS') {
      if (!order.trip || order.trip.status === 'CLOSED') return false;
    }
    if (activeTab === 'CLOSED_TRIPS') {
      if (!order.trip || order.trip.status !== 'CLOSED') return false;
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (order.status !== statusFilter && order.trip?.status !== statusFilter) {
        return false;
      }
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchId = `ord-${order.order_id}`.toLowerCase().includes(query) || (order.trip && `trip-${order.trip.trip_id}`.toLowerCase().includes(query));
      const matchPickup = order.pickup_spot?.toLowerCase().includes(query);
      const matchDrop = order.dropoff_spot?.toLowerCase().includes(query);
      const matchContact = order.contact_name?.toLowerCase().includes(query);
      return matchId || matchPickup || matchDrop || matchContact;
    }

    return true;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders & Trips</h1>
          <p className="page-subtitle">
            Track incoming transport requests, driver assignments, and live fulfillment.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchOrders}
            title="Refresh Orders"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          <Link to="/orders/new" className="btn btn-primary">
            <PlusCircle size={18} />
            <span>Create New Order</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'ALL', label: 'All Bookings', count: orders.length },
          { id: 'ORDERS', label: 'Pending Orders', count: orders.filter((o) => o.status === 'RECEIVED').length },
          { id: 'ACTIVE_TRIPS', label: 'Active Trips', count: orders.filter((o) => o.trip && o.trip.status !== 'CLOSED').length },
          { id: 'CLOSED_TRIPS', label: 'Completed Trips', count: orders.filter((o) => o.trip && o.trip.status === 'CLOSED').length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: activeTab === tab.id ? 'var(--primary-100)' : 'var(--bg-muted)',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters & Search */}
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
            placeholder="Search by ID, route, or passenger..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <Filter size={16} />
            <span>Filter Status:</span>
          </div>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="UNASSIGNED">Trip: Unassigned</option>
            <option value="ASSIGNED">Trip: Assigned</option>
            <option value="ONGOING">Trip: Ongoing</option>
            <option value="CLOSED">Trip: Closed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Route (Pickup ➔ Drop-off)</th>
                <th>Pickup Date & Time</th>
                <th>Passenger</th>
                <th>Order Status</th>
                <th>Trip Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                      No transport bookings match your query
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      Try adjusting the search filters or create a new transport order.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.order_id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>ORD-{order.order_id}</div>
                      {order.trip && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                          TRIP-{order.trip.trip_id}
                        </div>
                      )}
                    </td>

                    <td style={{ maxWidth: '320px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {order.pickup_spot}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        ➔ {order.dropoff_spot}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {new Date(order.pickup_time).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 500 }}>{order.contact_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.contact_phone}</div>
                    </td>

                    <td>
                      <StatusBadge status={order.status} />
                    </td>

                    <td>
                      {order.trip ? (
                        <StatusBadge status={order.trip.status} />
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}
                          onClick={() => setSelectedOrder(order)}
                          title="View full booking & OTP details"
                        >
                          <Eye size={15} />
                          <span>Details</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

export default OrdersPage;
