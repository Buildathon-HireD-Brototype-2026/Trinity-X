import React, { useState } from 'react';
import { StatusBadge } from '../common/StatusBadge';
import {
  X,
  MapPin,
  Calendar,
  User,
  Phone,
  FileText,
  KeyRound,
  Car,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

export function OrderDetailModal({ order, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const handleCopyOtp = (otp) => {
    if (otp) {
      navigator.clipboard.writeText(otp);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const trip = order.trip;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Order #{order.order_id}
              </h2>
              <StatusBadge status={order.status} />
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Created on {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Route Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            Route & Timing
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#F8FAFC', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <MapPin size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PICKUP SPOT</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{order.pickup_spot}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <MapPin size={18} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DROP-OFF SPOT</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>{order.dropoff_spot}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Calendar size={18} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>REQUESTED PICKUP TIME</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {new Date(order.pickup_time).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger & Service Notes */}
        <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-surface)', padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
              PASSENGER CONTACT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>
              <User size={16} color="var(--text-secondary)" />
              <span>{order.contact_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <Phone size={14} color="var(--text-muted)" />
              <span>{order.contact_phone}</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-surface)', padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
              SERVICE NOTES
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <FileText size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{order.notes || 'No vehicle or special instructions specified.'}</span>
            </div>
          </div>
        </div>

        {/* Rejection Details (if applicable) */}
        {order.status === 'REJECTED' && (
          <div className="notice-box" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Order Rejected by Administrator:</strong>
              <div style={{ marginTop: '0.25rem' }}>
                {order.reject_reason || 'Administrative capacity constraint.'}
              </div>
              {order.decided_at && (
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.85 }}>
                  Decided at: {new Date(order.decided_at).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Linked Trip & OTP Section (PRD B-04 & D-09) */}
        {trip ? (
          <div style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-200)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Car size={20} color="var(--primary)" />
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Fulfillment Trip #{trip.trip_id}</span>
              </div>
              <StatusBadge status={trip.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DRIVER</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{trip.driver_name || 'Pending assignment'}</div>
                {trip.driver_phone && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{trip.driver_phone}</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ESTIMATED TIME (ETA)</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={15} color="var(--primary)" />
                  <span>{trip.eta || 'Calculating route...'}</span>
                </div>
              </div>
            </div>

            {/* Trip-Close OTP Display (PRD D-09) */}
            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--primary-300)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  <KeyRound size={14} />
                  <span>Trip-Close OTP (PRD D-09)</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Share this 6-digit code with the driver upon drop-off to verify trip completion.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="otp-pill">{trip.otp}</span>
                <button
                  type="button"
                  onClick={() => handleCopyOtp(trip.otp)}
                  title="Copy OTP"
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                >
                  {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        ) : order.status === 'ACCEPTED' ? (
          <div className="notice-box notice-info" style={{ marginBottom: '1rem' }}>
            <Clock size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Order Accepted:</strong> Converted to trip. Dispatcher is assigning an optimal verified driver.
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailModal;
