import { getFriendlyError, getFriendlyLoadError } from '../../utils/friendlyError';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Navigation,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  Eye,
  MapPin,
  ArrowRight,
  Phone,
  Car,
  AlertCircle,
  ShieldAlert,
  Building2,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  Check,
  Sparkles
} from 'lucide-react';
import { getTrips, assignDriverToTrip, updateTripStatus } from './tripService';
import { useAuth } from '../auth/AuthContext';
import AssignDriverModal from './AssignDriverModal';
import TripDetailsModal from './TripDetailsModal';

export default function TripsAssignmentPage() {
  const { user } = useAuth();
  // Role-Based Access Control: fail-closed permission check
  const canManageTrips = Boolean(user && ['Admin', 'SuperAdmin', 'Operations', 'Dispatcher'].includes(user.role));

  const [trips, setTrips] = useState([]);
  const [selectedTripForAssign, setSelectedTripForAssign] = useState(null);
  const [selectedTripForDetail, setSelectedTripForDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'UNASSIGNED' | 'DRIVER_ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'
  const [vehicleFilter, setVehicleFilter] = useState('ALL'); // 'ALL' | 'Sedan' | 'SUV' | 'Hatchback'

  // Toast feedback state
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // ── Load Trips ─────────────────────────────────────────────────────────────
  const loadTrips = useCallback(async () => {
    setIsLoading(true);
    setPageError('');
    try {
      const data = await getTrips({
        status: statusFilter,
        vehicleType: vehicleFilter,
        search: searchQuery
      });
      setTrips(data);
    } catch (err) {
      setPageError(getFriendlyLoadError(err));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, vehicleFilter, searchQuery]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleDriverAssigned = (updatedTrip) => {
    setTrips((prev) =>
      prev.map((t) => (t.tripId === updatedTrip.tripId ? updatedTrip : t))
    );
    setSelectedTripForAssign(null);
    showToast(`Driver ${updatedTrip.driverName} successfully assigned to Trip #TRP-${updatedTrip.tripId}!`);
  };

  const handleStatusUpdated = (updatedTrip) => {
    setTrips((prev) =>
      prev.map((t) => (t.tripId === updatedTrip.tripId ? updatedTrip : t))
    );
    setSelectedTripForDetail(null);
    showToast(`Trip #TRP-${updatedTrip.tripId} status updated to ${updatedTrip.tripStatus}.`);
  };

  // ── Stats Summary ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = trips.length;
    const unassigned = trips.filter((t) => t.tripStatus === 'UNASSIGNED' || t.tripStatus === 'ASSIGNMENT_PENDING').length;
    const assigned = trips.filter((t) => t.tripStatus === 'DRIVER_ASSIGNED' || t.tripStatus === 'DRIVER_ARRIVED').length;
    const inTransit = trips.filter((t) => t.tripStatus === 'IN_TRANSIT').length;
    const completed = trips.filter((t) => t.tripStatus === 'COMPLETED').length;
    const cancelled = trips.filter((t) => t.tripStatus === 'CANCELLED').length;
    return { total, unassigned, assigned, inTransit, completed, cancelled };
  }, [trips]);

  // PII phone masking helper
  const maskPhone = (phone) => {
    if (!phone) return '—';
    if (canManageTrips) return phone;
    const parts = phone.split(' ');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]} •••••`;
    }
    return phone.slice(0, 7) + '•••••';
  };

  // Status Badge Renderer
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'UNASSIGNED':
      case 'ASSIGNMENT_PENDING':
        return (
          <span
            className="badge badge-amber"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              fontWeight: 600
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />
            <span>Needs Driver</span>
          </span>
        );
      case 'DRIVER_ASSIGNED':
        return (
          <span
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontWeight: 600
            }}
          >
            <UserCheck size={11} />
            <span>Driver Assigned</span>
          </span>
        );
      case 'DRIVER_ARRIVED':
        return (
          <span
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              fontWeight: 600
            }}
          >
            <MapPin size={11} />
            <span>Driver Arrived</span>
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#faf5ff',
              color: '#7e22ce',
              border: '1px solid #e9d5ff',
              fontWeight: 600
            }}
          >
            <Navigation size={11} />
            <span>In Transit</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span
            className="badge badge-green"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}
          >
            <CheckCircle2 size={11} />
            <span>Completed</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            className="badge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              fontWeight: 600
            }}
          >
            <XCircle size={11} />
            <span>Cancelled</span>
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  // Format Vehicle Class Badge
  const renderVehicleBadge = (vehicleType) => {
    const isSUV = vehicleType === 'SUV';
    const isPremium = vehicleType === 'Premium';
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: 600,
          background: isSUV ? '#fff7ed' : isPremium ? '#fdf4ff' : '#f1f5f9',
          color: isSUV ? '#c2410c' : isPremium ? '#a21caf' : '#475569',
          border: '1px solid var(--border)'
        }}
      >
        <Car size={11} />
        <span>{vehicleType}</span>
      </span>
    );
  };

  return (
    <div className="trips-assignment-page admin-mgmt-page">
      {/* ── Top Header Bar ── */}
      <div className="admin-mgmt-header">
        <div className="admin-mgmt-header-left">
          <div className="page-icon-wrap" style={{ background: '#ede9fe', color: '#7c3aed' }}>
            <Navigation size={20} />
          </div>
          <div>
            <h1 className="page-title">Trip Dispatch & Driver Assignment</h1>
            <p className="page-subtitle">
              Allocate verified active drivers to confirmed corporate bookings, monitor in-transit fleet progress, and manage trip lifecycles.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={loadTrips}
            title="Refresh trips roster"
            aria-label="Refresh trips roster"
            id="refresh-trips-btn"
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin-animation' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Strip (Spacious, 4 Cards) ── */}
      <div className="trips-kpi-grid">
        {/* Card 1: Needs Driver */}
        <div
          className="stat-card"
          onClick={() => setStatusFilter('UNASSIGNED')}
          style={{
            cursor: 'pointer',
            borderLeft: '4px solid #d97706',
            background: 'var(--surface)',
            padding: '1.125rem 1.25rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            borderLeftWidth: '4px',
            borderLeftColor: '#d97706',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Needs Driver</span>
            <span style={{ padding: '0.35rem', background: '#fef3c7', color: '#b45309', borderRadius: '6px' }}>
              <AlertCircle size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#b45309' }}>{stats.unassigned}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Awaiting driver assignment</div>
        </div>

        {/* Card 2: Driver Assigned */}
        <div
          className="stat-card"
          onClick={() => setStatusFilter('DRIVER_ASSIGNED')}
          style={{
            cursor: 'pointer',
            background: 'var(--surface)',
            padding: '1.125rem 1.25rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            borderLeftWidth: '4px',
            borderLeftColor: '#2563eb',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Driver Assigned</span>
            <span style={{ padding: '0.35rem', background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px' }}>
              <UserCheck size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1d4ed8' }}>{stats.assigned}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>En route to pickup</div>
        </div>

        {/* Card 3: In Transit */}
        <div
          className="stat-card"
          onClick={() => setStatusFilter('IN_TRANSIT')}
          style={{
            cursor: 'pointer',
            background: 'var(--surface)',
            padding: '1.125rem 1.25rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            borderLeftWidth: '4px',
            borderLeftColor: '#7c3aed',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>In Transit</span>
            <span style={{ padding: '0.35rem', background: '#faf5ff', color: '#7e22ce', borderRadius: '6px' }}>
              <Navigation size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#7e22ce' }}>{stats.inTransit}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active passenger rides</div>
        </div>

        {/* Card 4: Completed Trips */}
        <div
          className="stat-card"
          onClick={() => setStatusFilter('COMPLETED')}
          style={{
            cursor: 'pointer',
            background: 'var(--surface)',
            padding: '1.125rem 1.25rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            borderLeftWidth: '4px',
            borderLeftColor: '#16a34a',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>Completed Trips</span>
            <span style={{ padding: '0.35rem', background: '#f0fdf4', color: '#15803d', borderRadius: '6px' }}>
              <CheckCircle2 size={15} />
            </span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d' }}>{stats.completed}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Successfully executed</div>
        </div>
      </div>

      {/* ── View-Only Access Banner for Non-Admin Roles (RBAC) ── */}
      {!canManageTrips && (
        <div
          className="view-only-banner"
          id="trips-view-only-notice"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '0.625rem 1rem',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            color: 'var(--text-muted)',
            fontSize: '0.8125rem'
          }}
        >
          <ShieldAlert size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span><strong>View-Only Mode:</strong> You are viewing trips in read-only mode. Dispatcher or Administrator privileges are required to assign drivers or update trip lifecycles.</span>
        </div>
      )}

      {/* ── Page Error Banner ── */}
      {pageError && (
        <div className="page-error-banner" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span>{pageError}</span>
        </div>
      )}

      {/* ── Filter Toolbar ── */}
      <div className="trips-toolbar">
        {/* Status Filter Segmented Pills */}
        <div
          style={{
            display: 'flex',
            gap: '0.35rem',
            background: 'var(--surface)',
            padding: '0.25rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            overflowX: 'auto',
            maxWidth: '100%'
          }}
        >
          {[
            { id: 'ALL', label: 'All Trips', count: stats.total },
            { id: 'UNASSIGNED', label: 'Needs Driver', count: stats.unassigned },
            { id: 'DRIVER_ASSIGNED', label: 'Assigned', count: stats.assigned },
            { id: 'IN_TRANSIT', label: 'In Transit', count: stats.inTransit },
            { id: 'COMPLETED', label: 'Completed', count: stats.completed },
            { id: 'CANCELLED', label: 'Cancelled', count: stats.cancelled }
          ].map((pill) => {
            const isActive = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                id={`filter-pill-${pill.id.toLowerCase()}`}
                onClick={() => setStatusFilter(pill.id)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'calc(var(--radius) - 2px)',
                  border: 'none',
                  background: isActive ? '#6A379F' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{pill.label}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '10px',
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--border)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Vehicle Filter */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Live Search Input */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            />
            <input
              type="text"
              id="trips-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trip, driver, passenger..."
              className="admin-input"
              style={{
                paddingLeft: '2.25rem',
                height: '36px',
                fontSize: '0.8125rem',
                width: '100%'
              }}
            />
          </div>

          {/* Vehicle Class Selector */}
          <div style={{ position: 'relative' }}>
            <select
              id="trips-vehicle-filter"
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="admin-input"
              style={{ height: '36px', fontSize: '0.8125rem', paddingRight: '1.75rem' }}
            >
              <option value="ALL">All Vehicle Types</option>
              <option value="Sedan">Sedan</option>
              <option value="SUV">SUV</option>
              <option value="Hatchback">Hatchback</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Trips Table Container ── */}
      <div
        className="trips-table-card"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
      >
        {isLoading ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ margin: 0, fontSize: '0.875rem' }}>Loading trips dispatch roster...</p>
          </div>
        ) : trips.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Navigation size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
            <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)', fontSize: '1rem' }}>
              No trips found
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem' }}>
              {searchQuery || statusFilter !== 'ALL' || vehicleFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter pills.'
                : 'No trips currently scheduled or in progress.'}
            </p>
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle, #f8fafc)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>TRIP & ORDER REF</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>CLIENT & PASSENGER</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>JOURNEY ROUTE</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>SCHEDULE & CLASS</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ASSIGNED DRIVER</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>FARE & SPLIT</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>STATUS</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => {
                  const isUnassigned = trip.tripStatus === 'UNASSIGNED' || trip.tripStatus === 'ASSIGNMENT_PENDING';
                  return (
                    <tr
                      key={trip.tripId}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.1s ease'
                      }}
                      className="admin-table-row"
                    >
                      {/* Trip Ref & Order Ref */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.8125rem',
                              color: 'var(--primary)'
                            }}
                          >
                            #TRP-{trip.tripId}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Ord #{trip.orderId}
                          </span>
                        </div>
                      </td>

                      {/* Client & Passenger */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                          {trip.companyName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <User size={11} />
                          <span>{trip.passengerName}</span>
                          <span>•</span>
                          <span>{maskPhone(trip.passengerPhone)}</span>
                        </div>
                      </td>

                      {/* Journey Route */}
                      <td style={{ padding: '0.875rem 1rem', maxWidth: '280px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78125rem', color: 'var(--text-main)' }}>
                            <MapPin size={12} style={{ color: '#16a34a', flexShrink: 0 }} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {trip.pickupSpot}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78125rem', color: 'var(--text-muted)' }}>
                            <ArrowRight size={11} style={{ flexShrink: 0 }} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {trip.dropoffSpot}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Schedule & Vehicle */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontSize: '0.78125rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                          {new Date(trip.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                          {new Date(trip.pickupTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                        <div>
                          {renderVehicleBadge(trip.vehicleType)}
                        </div>
                      </td>

                      {/* Assigned Driver */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {isUnassigned ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontSize: '0.78125rem', fontWeight: 600 }}>
                            <AlertCircle size={13} />
                            <span>Unallocated</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)' }}>
                              {trip.driverName}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {trip.vehicleNumber} {trip.vehicleModel && `(${trip.vehicleModel})`}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Fare & Payout Split */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          ₹{Number(trip.amount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 500 }}>
                          Driver: ₹{Number(trip.driverEarning || 0).toFixed(2)} ({trip.driverSplit}%)
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {renderStatusBadge(trip.tripStatus)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        {isUnassigned ? (
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => setSelectedTripForAssign(trip)}
                            disabled={!canManageTrips}
                            id={`assign-driver-btn-${trip.tripId}`}
                            style={{
                              padding: '0.35rem 0.7rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#6A379F',
                              cursor: canManageTrips ? 'pointer' : 'not-allowed',
                              opacity: canManageTrips ? 1 : 0.6
                            }}
                          >
                            <UserCheck size={13} />
                            <span>Assign Driver</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setSelectedTripForDetail(trip)}
                            id={`view-trip-btn-${trip.tripId}`}
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer'
                            }}
                          >
                            <Eye size={13} />
                            <span>Details</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`toast-notification toast-${toast.type}`}
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Assign Driver Dispatch Modal (PRD A-06) ── */}
      <AssignDriverModal
        isOpen={Boolean(selectedTripForAssign)}
        trip={selectedTripForAssign}
        onClose={() => setSelectedTripForAssign(null)}
        onAssigned={handleDriverAssigned}
        canManageTrips={canManageTrips}
      />

      {/* ── Trip Details & Lifecycle Modal (PRD A-07) ── */}
      <TripDetailsModal
        isOpen={Boolean(selectedTripForDetail)}
        trip={selectedTripForDetail}
        onClose={() => setSelectedTripForDetail(null)}
        onStatusUpdated={handleStatusUpdated}
        canManageTrips={canManageTrips}
      />
    </div>
  );
}
