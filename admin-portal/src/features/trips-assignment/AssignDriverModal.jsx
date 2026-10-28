import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  MapPin,
  ArrowRight,
  Car,
  Calendar,
  Clock,
  Phone,
  User,
  Star,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  ShieldCheck
} from 'lucide-react';
import { getEligibleDrivers, assignDriverToTrip } from './tripService';

export default function AssignDriverModal({
  isOpen,
  onClose,
  trip,
  onAssigned,
  canManageTrips = false // Strict fail-closed default
}) {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch eligible drivers whenever modal opens for a trip
  useEffect(() => {
    if (isOpen && trip) {
      setSelectedDriverId('');
      setErrorMsg('');
      setIsSubmitting(false);
      setIsLoadingDrivers(true);

      getEligibleDrivers({ vehicleType: trip.vehicleType })
        .then((data) => {
          setDrivers(data);
          if (data.length > 0) {
            setSelectedDriverId(data[0].driverId);
          }
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Failed to fetch eligible drivers.');
        })
        .finally(() => {
          setIsLoadingDrivers(false);
        });
    }
  }, [isOpen, trip]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !trip) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleConfirmAssignment = async () => {
    setErrorMsg('');

    if (!selectedDriverId) {
      setErrorMsg('Please select an eligible driver from the list.');
      return;
    }

    if (!canManageTrips) {
      setErrorMsg('You do not have administrative permission to dispatch drivers.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await assignDriverToTrip(trip.tripId, selectedDriverId);
      onAssigned(updated);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign driver. Please try again.');
      setIsSubmitting(false);
    }
  };

  const selectedDriverObj = drivers.find((d) => d.driverId === Number(selectedDriverId));

  // Calculate live financial split
  const fare = Number(trip.amount);
  const driverPercent = Number(trip.driverSplit || 80);
  const hiredPercent = Number(trip.hiredSplit || 20);
  const driverPayout = ((fare * driverPercent) / 100).toFixed(2);
  const platformCommission = ((fare * hiredPercent) / 100).toFixed(2);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-driver-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '640px',
          width: '100%',
          padding: '0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          maxHeight: '92vh'
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ede9fe',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <UserCheck size={18} />
            </div>
            <div>
              <h2
                id="assign-driver-title"
                style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}
              >
                Assign Fleet Driver
              </h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Trip #TRP-{trip.tripId} • Order #{trip.orderId} • {trip.companyName}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            style={{ padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body (Scrollable) ── */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Error Banner */}
          {errorMsg && (
            <div className="page-error-banner" style={{ padding: '0.625rem 0.875rem', fontSize: '0.78125rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Trip Summary Card */}
          <div
            style={{
              background: 'var(--background)',
              padding: '1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                Trip Route & Passenger
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  background: '#eff6ff',
                  color: '#1d4ed8'
                }}
              >
                Requested Vehicle: {trip.vehicleType}
              </span>
            </div>

            {/* Visual Route */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-main)' }}>
                <MapPin size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span><strong>Pickup:</strong> {trip.pickupSpot}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                <ArrowRight size={12} style={{ flexShrink: 0 }} />
                <span><strong>Dropoff:</strong> {trip.dropoffSpot}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Passenger: <strong>{trip.passengerName}</strong></span>
              <span>Pickup Time: <strong>{new Date(trip.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(trip.pickupTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</strong></span>
            </div>
          </div>

          {/* Revenue Split & Earnings Card (PRD A-06, A-11) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-sm)',
              padding: '0.875rem 1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              textAlign: 'center'
            }}
          >
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Trip Fare</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>₹{fare.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#15803d', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Driver Payout ({driverPercent}%)</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#15803d' }}>₹{driverPayout}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#6A379F', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Platform Fee ({hiredPercent}%)</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#6A379F' }}>₹{platformCommission}</span>
            </div>
          </div>

          {/* Eligible Drivers Roster */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label
                style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}
              >
                SELECT ELIGIBLE DRIVER ({drivers.length} AVAILABLE)
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Matching Category: {trip.vehicleType}
              </span>
            </div>

            {isLoadingDrivers ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '0.8125rem' }}>Finding active drivers nearby...</div>
              </div>
            ) : drivers.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--background)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <AlertCircle size={24} style={{ color: '#d97706', margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 600 }}>
                  No active drivers available for {trip.vehicleType}
                </p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  All verified drivers in this category are currently offline or on an active trip.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                {drivers.map((driver) => {
                  const isSelected = selectedDriverId === driver.driverId;
                  return (
                    <div
                      key={driver.driverId}
                      onClick={() => !isSubmitting && setSelectedDriverId(driver.driverId)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '2px solid #6A379F' : '1px solid var(--border)',
                        background: isSelected ? '#faf5ff' : 'var(--surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.1s ease'
                      }}
                      className="driver-select-card"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: isSelected ? '#6A379F' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.875rem'
                          }}
                        >
                          {driver.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                              {driver.name}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
                              <Star size={11} fill="#d97706" />
                              <span>{driver.rating}</span>
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>{driver.vehicleModel}</span>
                            <span>•</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{driver.vehicleNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid #6A379F' : '2px solid var(--border)',
                            background: '#ffffff'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: 'var(--surface-subtle, #f8fafc)'
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ fontSize: '0.8125rem', padding: '0.5rem 1rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirmAssignment}
            disabled={isSubmitting || !selectedDriverId || drivers.length === 0 || !canManageTrips}
            id="confirm-assign-driver-btn"
            style={{
              fontSize: '0.8125rem',
              padding: '0.5rem 1.25rem',
              background: '#6A379F',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {isSubmitting ? (
              <span>Assigning Driver...</span>
            ) : (
              <>
                <UserCheck size={14} />
                <span>Confirm & Assign Driver</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
