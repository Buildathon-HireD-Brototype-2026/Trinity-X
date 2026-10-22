import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import orderService from '../services/orderService';
import { LocationPickerField } from '../components/orders/LocationPickerField';
import { DateTimePicker12H } from '../components/orders/DateTimePicker12H';
import {
  MapPin,
  Calendar,
  User,
  Phone,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

export function CreateOrderPage() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    pickup_spot: '',
    dropoff_spot: '',
    pickup_time: '',
    contact_name: '',
    contact_phone: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const pickupPickerRef = React.useRef(null);
  const dropoffPickerRef = React.useRef(null);

  // Field change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleLocationChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Validation
  const validateForm = (data = formData) => {
    const errs = {};
    const trimmedPickup = (data.pickup_spot || '').trim();
    const trimmedDropoff = (data.dropoff_spot || '').trim();

    if (!trimmedPickup) {
      errs.pickup_spot = 'Please select the pickup location.';
    } else if (trimmedPickup.length > 300) {
      errs.pickup_spot = 'Location is too long. Please shorten it.';
    }

    if (!trimmedDropoff) {
      errs.dropoff_spot = 'Please select the drop location.';
    } else if (trimmedDropoff.length > 300) {
      errs.dropoff_spot = 'Location is too long. Please shorten it.';
    }

    if (
      trimmedPickup &&
      trimmedDropoff &&
      trimmedPickup.toLowerCase() === trimmedDropoff.toLowerCase()
    ) {
      errs.dropoff_spot = 'Pickup and drop locations must be different.';
    }
    if (!data.pickup_time) {
      errs.pickup_time = 'Scheduled pickup date and time are required.';
    } else {
      const selected = new Date(data.pickup_time).getTime();
      if (isNaN(selected)) {
        errs.pickup_time = 'Please enter a valid date and time.';
      }
    }
    if (!data.contact_name.trim()) {
      errs.contact_name = 'Passenger or coordinator contact name is required.';
    }
    if (!data.contact_phone.trim()) {
      errs.contact_phone = 'Contact phone number is required.';
    } else if (!/^[0-9+ -]{8,15}$/.test(data.contact_phone.trim())) {
      errs.contact_phone = 'Please enter a valid phone number.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Apply any unapplied landmark drafts on submit
    const pickupFinal = pickupPickerRef.current?.applyDraft?.() ?? formData.pickup_spot;
    const dropoffFinal = dropoffPickerRef.current?.applyDraft?.() ?? formData.dropoff_spot;

    const currentFormData = {
      ...formData,
      pickup_spot: pickupFinal,
      dropoff_spot: dropoffFinal,
    };

    if (!validateForm(currentFormData)) return;

    setIsSubmitting(true);
    try {
      const result = await orderService.createOrder(currentFormData);
      setCreatedOrder(result.order);
    } catch (err) {
      setErrors({ form: err.message || 'Failed to submit transport order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillSample = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localISOTime = new Date(tomorrow - tzOffset).toISOString().slice(0, 16);

    setFormData({
      pickup_spot: 'Cyber City Tower C, DLF Phase 2, Gurugram',
      dropoff_spot: 'Terminal 3 International Departures, IGI Airport, New Delhi',
      pickup_time: localISOTime,
      contact_name: 'Vikrant Roy',
      contact_phone: '+91 98450 12345',
      notes: 'Executive guest transfer; sedan vehicle required with large luggage boot.',
    });
    setErrors({});
  };

  if (createdOrder) {
    return (
      <div style={{ maxWidth: '640px', margin: '2rem auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Order Placed Successfully!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
            Your transport request has been received with ID{' '}
            <strong style={{ color: 'var(--primary)' }}>ORD-{createdOrder.order_id}</strong> and initial status{' '}
            <span className="status-badge status-received">Received</span>.
          </p>

          <div
            style={{
              background: '#F8FAFC',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '2rem',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Pickup:</strong> {createdOrder.pickup_spot}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Drop-off:</strong> {createdOrder.dropoff_spot}
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>Scheduled Time:</strong>{' '}
              {new Date(createdOrder.pickup_time).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
            <div>
              <strong>Passenger:</strong> {createdOrder.contact_name} ({createdOrder.contact_phone})
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setCreatedOrder(null);
                setFormData({
                  pickup_spot: '',
                  dropoff_spot: '',
                  pickup_time: '',
                  contact_name: '',
                  contact_phone: '',
                  notes: '',
                });
              }}
            >
              Book Another Order
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/orders')}
            >
              <span>View in My Orders</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Transport Order</h1>
          <p className="page-subtitle">
            Request an on-demand or scheduled commercial driver for corporate transfers.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleFillSample}
          style={{ fontSize: '0.8125rem' }}
        >
          Auto-fill Sample Route
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', maxWidth: '860px' }}>
        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
          {errors.form && (
            <div className="notice-box" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger)', marginBottom: '1.5rem' }}>
              <AlertCircle size={20} />
              <span>{errors.form}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Pickup Location */}
            <LocationPickerField
              ref={pickupPickerRef}
              id="pickup_spot"
              name="pickup_spot"
              label="Pickup location"
              value={formData.pickup_spot}
              onChange={handleLocationChange}
              error={errors.pickup_spot}
              placeholder="e.g. DLF Cyber City, Tower B, Gurugram"
              pinColor="var(--primary)"
              required={true}
            />

            {/* Drop-off Location */}
            <LocationPickerField
              ref={dropoffPickerRef}
              id="dropoff_spot"
              name="dropoff_spot"
              label="Drop location"
              value={formData.dropoff_spot}
              onChange={handleLocationChange}
              error={errors.dropoff_spot}
              placeholder="e.g. Indira Gandhi International Airport, Terminal 3"
              pinColor="#0D9488"
              required={true}
            />

            {/* Pickup Date & Time (12-Hour) */}
            <DateTimePicker12H
              id="pickup_time"
              name="pickup_time"
              label="Pickup Date & Time"
              value={formData.pickup_time}
              onChange={handleChange}
              error={errors.pickup_time}
              required={true}
            />

            {/* Passenger Contact Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="contact_name">
                Passenger / Coordinator Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="contact_name"
                  name="contact_name"
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="e.g. Rahul Sharma"
                  value={formData.contact_name}
                  onChange={handleChange}
                />
              </div>
              {errors.contact_name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.contact_name}</span>}
            </div>

            {/* Passenger Contact Phone */}
            <div className="form-group">
              <label className="form-label" htmlFor="contact_phone">
                Contact Phone Number *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="contact_phone"
                  name="contact_phone"
                  type="tel"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="e.g. +91 98765 43210"
                  value={formData.contact_phone}
                  onChange={handleChange}
                />
              </div>
              {errors.contact_phone && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>{errors.contact_phone}</span>}
            </div>

            {/* Vehicle & Service Notes */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label" htmlFor="notes">
                Vehicle or Service Notes (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="form-control"
                  placeholder="e.g. Executive transfer, 3 passenger bags, preference for English-speaking driver."
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <ShieldCheck size={16} color="var(--success)" />
              <span>Orders are immediately dispatched to HireD Admin Inbox with status Received.</span>
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ minWidth: '160px' }}>
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateOrderPage;
