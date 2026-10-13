import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Car,
  X,
  Phone,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';

const MOCK_ORDERS = [
  {
    id: 'ORD-615',
    tripId: null,
    company: 'Apex Global Logistics',
    pickup: 'Cyber City Tower C, DLF Phase 2, Gurugram',
    dropoff: 'Terminal 3 International Departures, IGI Airport, New Delhi',
    scheduledDate: '2026-10-12T10:00:00',
    displayDate: '12 Oct 2026, 10:00 am',
    passenger: 'Vikrant Roy',
    passengerPhone: '+91 98450 12345',
    status: 'PENDING',
    fare: '₹1,450',
    vehicleType: 'Sedan (Prime)',
  },
  {
    id: 'ORD-618',
    tripId: null,
    company: 'Kochi Tech Ventures',
    pickup: 'Infopark Expressway, Kakkanad, Kochi',
    dropoff: 'Cochin International Airport (COK), Nedumbassery',
    scheduledDate: '2026-10-13T07:30:00',
    displayDate: '13 Oct 2026, 07:30 am',
    passenger: 'Ananya Nair',
    passengerPhone: '+91 94471 88920',
    status: 'PENDING',
    fare: '₹950',
    vehicleType: 'EV Sedan',
  },
  {
    id: 'ORD-621',
    tripId: null,
    company: 'Apex Global Logistics',
    pickup: 'Lulu Cyber Tower 2, Infopark Kochi',
    dropoff: 'Grand Hyatt Kochi Bolgatty, Mulavukad',
    scheduledDate: '2026-10-14T14:15:00',
    displayDate: '14 Oct 2026, 02:15 pm',
    passenger: 'Siddharth Menon',
    passengerPhone: '+91 98950 44321',
    status: 'PENDING',
    fare: '₹620',
    vehicleType: 'SUV',
  },
  {
    id: 'ORD-501',
    tripId: 'TRIP-1001',
    company: 'Apex Global Logistics',
    pickup: 'DLF Cyber City, Tower B, Gurugram',
    dropoff: 'IGI Airport, Terminal 3, New Delhi',
    scheduledDate: '2026-10-10T20:00:00',
    displayDate: '10 Oct 2026, 08:00 pm',
    passenger: 'Pooja Verma',
    passengerPhone: '+91 98111 22334',
    status: 'ONGOING',
    fare: '₹1,280',
    vehicleType: 'Sedan (Prime)',
  },
  {
    id: 'ORD-505',
    tripId: 'TRIP-1008',
    company: 'Malabar Logistics',
    pickup: 'Marine Drive Walkway, Ernakulam, Kochi',
    dropoff: 'SmartCity Kochi, Kakkanad',
    scheduledDate: '2026-10-11T09:00:00',
    displayDate: '11 Oct 2026, 09:00 am',
    passenger: 'Rahul Krishna',
    passengerPhone: '+91 97441 55667',
    status: 'ONGOING',
    fare: '₹780',
    vehicleType: 'Hatchback',
  },
  {
    id: 'ORD-480',
    tripId: 'TRIP-982',
    company: 'Apex Global Logistics',
    pickup: 'Aerocity Hospitality District, New Delhi',
    dropoff: 'Sector 29 Hub, Gurugram',
    scheduledDate: '2026-10-09T18:30:00',
    displayDate: '09 Oct 2026, 06:30 pm',
    passenger: 'Arjun Kapoor',
    passengerPhone: '+91 98200 11223',
    status: 'COMPLETED',
    fare: '₹1,150',
    vehicleType: 'Sedan (Prime)',
  },
];

export default function RecentOrdersTable({ onNavigate }) {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [statusFilter, setStatusFilter] = useState('PENDING'); // Default to Pending Orders filter per request
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' = Newest first, 'asc' = Oldest first
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // Status Filter
        if (statusFilter !== 'ALL' && order.status !== statusFilter) {
          return false;
        }
        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = order.id.toLowerCase().includes(q);
          const matchPickup = order.pickup.toLowerCase().includes(q);
          const matchDropoff = order.dropoff.toLowerCase().includes(q);
          const matchPassenger = order.passenger.toLowerCase().includes(q);
          const matchCompany = order.company.toLowerCase().includes(q);
          return matchId || matchPickup || matchDropoff || matchPassenger || matchCompany;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduledDate).getTime();
        const dateB = new Date(b.scheduledDate).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [orders, statusFilter, sortDirection, searchQuery]);

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleDecision = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const ongoingCount = orders.filter((o) => o.status === 'ONGOING').length;
  const totalCount = orders.length;

  return (
    <div className="recent-orders-card">
      {/* Header matching B2B template */}
      <div className="recent-orders-header">
        <div className="recent-orders-title-group">
          <h2 className="recent-orders-title">Recent orders</h2>
          <p className="recent-orders-subtitle">
            Real-time status of incoming orders and assigned trips across platform accounts.
          </p>
        </div>

        <button
          type="button"
          className="recent-orders-view-all-btn"
          onClick={() => onNavigate && onNavigate('orders')}
          title="Open full Orders Inbox"
        >
          <span>View All</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Filter and Sorting Toolbar */}
      <div className="orders-filter-toolbar">
        {/* Status Filter Pills */}
        <div className="orders-status-filters" role="tablist" aria-label="Status Filters">
          <button
            type="button"
            className={`orders-filter-pill ${statusFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PENDING')}
            aria-selected={statusFilter === 'PENDING'}
          >
            <Clock size={14} className="filter-pill-icon" />
            <span>Pending Orders</span>
            <span className="filter-pill-count">{pendingCount}</span>
          </button>

          <button
            type="button"
            className={`orders-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
            aria-selected={statusFilter === 'ALL'}
          >
            <span>All Orders</span>
            <span className="filter-pill-count">{totalCount}</span>
          </button>

          <button
            type="button"
            className={`orders-filter-pill ${statusFilter === 'ONGOING' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ONGOING')}
            aria-selected={statusFilter === 'ONGOING'}
          >
            <Car size={14} className="filter-pill-icon" />
            <span>Ongoing</span>
            <span className="filter-pill-count">{ongoingCount}</span>
          </button>
        </div>

        {/* Right side: Search and Order by Date button */}
        <div className="orders-toolbar-right">
          <div className="orders-search-box">
            <Search size={15} className="orders-search-icon" />
            <input
              type="text"
              placeholder="Search booking, location, passenger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="orders-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="orders-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="orders-sort-btn"
            onClick={toggleSortDirection}
            title={`Order by Date: ${sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}`}
            aria-label="Order by Date"
          >
            <Calendar size={14} />
            <span>Order by Date</span>
            {sortDirection === 'desc' ? (
              <ArrowDown size={14} className="sort-indicator" />
            ) : (
              <ArrowUp size={14} className="sort-indicator" />
            )}
          </button>
        </div>
      </div>

      {/* Orders Data Table */}
      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Pickup Location</th>
              <th>Drop-off Location</th>
              <th className="sortable-col" onClick={toggleSortDirection} title="Toggle date sorting">
                <div className="th-sort-wrap">
                  <span>Scheduled Date & Time</span>
                  <ArrowUpDown size={13} className="th-sort-icon" />
                </div>
              </th>
              <th>Passenger</th>
              <th>Status</th>
              <th className="th-action">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="orders-empty-state">
                  <AlertCircle size={28} className="empty-state-icon" />
                  <p className="empty-state-title">No orders found</p>
                  <p className="empty-state-desc">
                    {statusFilter === 'PENDING'
                      ? 'There are currently no pending orders awaiting decision.'
                      : 'No orders match your filter criteria.'}
                  </p>
                  {statusFilter !== 'ALL' && (
                    <button
                      type="button"
                      className="empty-state-reset-btn"
                      onClick={() => setStatusFilter('ALL')}
                    >
                      Show All Orders
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const isPending = order.status === 'PENDING';
                const isOngoing = order.status === 'ONGOING';
                const isCompleted = order.status === 'COMPLETED';

                return (
                  <tr key={order.id} className="orders-table-row">
                    {/* Booking ID */}
                    <td className="col-booking-id">
                      <span className="booking-id-main">{order.id}</span>
                      {order.tripId && (
                        <span className="trip-id-sub">{order.tripId}</span>
                      )}
                    </td>

                    {/* Pickup Location */}
                    <td className="col-location" title={order.pickup}>
                      <span className="location-cell-text">{order.pickup}</span>
                    </td>

                    {/* Drop-off Location */}
                    <td className="col-location" title={order.dropoff}>
                      <span className="location-cell-text">{order.dropoff}</span>
                    </td>

                    {/* Scheduled Date & Time */}
                    <td className="col-date">
                      <span className="date-cell-text">{order.displayDate}</span>
                    </td>

                    {/* Passenger */}
                    <td className="col-passenger">
                      <span className="passenger-name">{order.passenger}</span>
                      <span className="passenger-phone">{order.passengerPhone}</span>
                    </td>

                    {/* Status Badge (Matching B2B visual badge) */}
                    <td className="col-status">
                      <span
                        className={`b2b-status-badge ${
                          isPending
                            ? 'b2b-status-badge--pending'
                            : isOngoing
                            ? 'b2b-status-badge--ongoing'
                            : 'b2b-status-badge--completed'
                        }`}
                      >
                        <span className="status-dot" />
                        <span>{order.status}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td className="col-action">
                      <button
                        type="button"
                        className="b2b-view-btn"
                        onClick={() => setSelectedOrder(order)}
                        title={`View details for ${order.id}`}
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal (When clicking View) */}
      {selectedOrder && (
        <div className="order-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="order-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="modal-order-title"
          >
            <div className="order-modal-header">
              <div className="order-modal-header-left">
                <h3 id="modal-order-title" className="modal-title">
                  Order Details — {selectedOrder.id}
                </h3>
                {selectedOrder.tripId && (
                  <span className="modal-trip-pill">{selectedOrder.tripId}</span>
                )}
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="order-modal-body">
              <div className="modal-info-grid">
                <div className="modal-info-item">
                  <span className="modal-info-label">Company Account</span>
                  <span className="modal-info-val">{selectedOrder.company}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Current Status</span>
                  <span
                    className={`b2b-status-badge ${
                      selectedOrder.status === 'PENDING'
                        ? 'b2b-status-badge--pending'
                        : selectedOrder.status === 'ONGOING'
                        ? 'b2b-status-badge--ongoing'
                        : 'b2b-status-badge--completed'
                    }`}
                  >
                    <span className="status-dot" />
                    <span>{selectedOrder.status}</span>
                  </span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Scheduled Departure</span>
                  <span className="modal-info-val">{selectedOrder.displayDate}</span>
                </div>
                <div className="modal-info-item">
                  <span className="modal-info-label">Estimated Fare</span>
                  <span className="modal-info-val modal-fare-highlight">
                    {selectedOrder.fare}
                  </span>
                </div>
              </div>

              <div className="modal-route-card">
                <div className="modal-route-point">
                  <div className="route-bullet route-bullet--pickup" />
                  <div className="route-point-text">
                    <span className="route-label">PICKUP LOCATION</span>
                    <span className="route-address">{selectedOrder.pickup}</span>
                  </div>
                </div>

                <div className="route-line-connector" />

                <div className="modal-route-point">
                  <div className="route-bullet route-bullet--dropoff" />
                  <div className="route-point-text">
                    <span className="route-label">DROP-OFF LOCATION</span>
                    <span className="route-address">{selectedOrder.dropoff}</span>
                  </div>
                </div>
              </div>

              <div className="modal-passenger-card">
                <div className="passenger-icon-wrap">
                  <Phone size={16} />
                </div>
                <div className="passenger-details">
                  <span className="passenger-card-name">{selectedOrder.passenger}</span>
                  <span className="passenger-card-phone">
                    {selectedOrder.passengerPhone} · {selectedOrder.vehicleType}
                  </span>
                </div>
              </div>
            </div>

            <div className="order-modal-footer">
              {selectedOrder.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    className="modal-action-btn modal-reject-btn"
                    onClick={() => handleDecision(selectedOrder.id, 'REJECTED')}
                  >
                    Reject Order
                  </button>
                  <button
                    type="button"
                    className="modal-action-btn modal-accept-btn"
                    onClick={() => handleDecision(selectedOrder.id, 'ONGOING')}
                  >
                    Accept & Assign Trip
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="modal-action-btn modal-close-action-btn"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
