import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  Building2,
  User,
  Phone,
  MapPin,
  Calendar,
  Car,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { getActiveCompanies } from './orderService';

const getDefaultPickupTime = () => {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getInitialForm = () => ({
  companyId: '',
  source: 'PHONE', // 'PHONE' | 'WHATSAPP'
  contactName: '',
  contactPhone: '',
  pickupSpot: '',
  dropoffSpot: '',
  pickupTime: getDefaultPickupTime(),
  vehicleType: 'Sedan',
  estimatedFare: '',
  notes: ''
});

const INITIAL_ERRORS = {
  companyId: '',
  contactName: '',
  contactPhone: '',
  pickupSpot: '',
  dropoffSpot: '',
  pickupTime: '',
  estimatedFare: ''
};

export default function CreateOrderModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState(getInitialForm);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [companies, setCompanies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load available active companies when modal opens
  useEffect(() => {
    if (isOpen) {
      const initial = getInitialForm();
      setForm(initial);
      setErrors(INITIAL_ERRORS);
      setIsSubmitting(false);
      setSubmitError('');
      setSubmitSuccess(false);

      getActiveCompanies().then((data) => {
        setCompanies(data);
        if (data.length > 0) {
          setForm((prev) => ({ ...prev, companyId: String(data[0].companyId) }));
        }
      });
    }
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // ── Validation Rules ───────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = { ...INITIAL_ERRORS };
    let isValid = true;

    if (!form.companyId) {
      newErrors.companyId = 'Please select a registered corporate client.';
      isValid = false;
    }

    if (!form.contactName.trim()) {
      newErrors.contactName = 'Passenger name is required.';
      isValid = false;
    } else if (form.contactName.trim().length < 2) {
      newErrors.contactName = 'Passenger name must be at least 2 characters.';
      isValid = false;
    } else if (form.contactName.trim().length > 100) {
      newErrors.contactName = 'Passenger name cannot exceed 100 characters.';
      isValid = false;
    }

    const cleanPhone = form.contactPhone.replace(/\D/g, '');
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!cleanPhone) {
      newErrors.contactPhone = 'Passenger contact phone number is required.';
      isValid = false;
    } else if (!indianMobileRegex.test(cleanPhone.slice(-10))) {
      newErrors.contactPhone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      isValid = false;
    }

    if (!form.pickupSpot.trim()) {
      newErrors.pickupSpot = 'Pickup location address is required.';
      isValid = false;
    } else if (form.pickupSpot.trim().length > 250) {
      newErrors.pickupSpot = 'Pickup location cannot exceed 250 characters.';
      isValid = false;
    }

    if (!form.dropoffSpot.trim()) {
      newErrors.dropoffSpot = 'Dropoff destination address is required.';
      isValid = false;
    } else if (form.dropoffSpot.trim().length > 250) {
      newErrors.dropoffSpot = 'Dropoff destination cannot exceed 250 characters.';
      isValid = false;
    }

    if (!form.pickupTime) {
      newErrors.pickupTime = 'Scheduled pickup date and time is required.';
      isValid = false;
    }

    const fare = Number(form.estimatedFare);
    if (!form.estimatedFare || isNaN(fare) || fare <= 0 || fare > 500000) {
      newErrors.estimatedFare = 'Enter a valid estimated trip fare between ₹1.00 and ₹5,00,000.00.';
      isValid = false;
    }

    if (form.notes && form.notes.length > 500) {
      newErrors.notes = 'Special notes cannot exceed 500 characters.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const rawDigits = form.contactPhone.replace(/\D/g, '');
      const formattedPhone = `+91 ${rawDigits.slice(-10, -5)} ${rawDigits.slice(-5)}`;

      await onSubmit({
        companyId: Number(form.companyId),
        source: form.source,
        contactName: form.contactName.trim(),
        contactPhone: formattedPhone,
        pickupSpot: form.pickupSpot.trim(),
        dropoffSpot: form.dropoffSpot.trim(),
        pickupTime: new Date(form.pickupTime).toISOString(),
        vehicleType: form.vehicleType,
        estimatedFare: Number(Number(form.estimatedFare).toFixed(2)),
        notes: form.notes.trim()
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setSubmitError(err.message || 'Failed to create order. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const selectedCompanyObj = companies.find((c) => c.companyId === Number(form.companyId));

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-order-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-panel"
        style={{
          maxWidth: '660px',
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
            background: 'var(--background)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PlusCircle size={20} />
            </div>
            <div>
              <h2
                id="create-order-title"
                style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}
              >
                Log Phone / WhatsApp Order (PRD A-03)
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Record an offline booking on behalf of an active B2B corporate client.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isSubmitting}
            style={{ padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form Container ── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Success Banner */}
            {submitSuccess && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              >
                <CheckCircle2 size={16} />
                <span>Order successfully created and queued in inbox!</span>
              </div>
            )}

            {/* Error Banner */}
            {submitError && (
              <div className="page-error-banner" style={{ padding: '0.625rem 0.875rem', fontSize: '0.78125rem' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{submitError}</span>
              </div>
            )}

            {/* Section 1: Client Company & Channel */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '1rem',
                background: 'var(--background)',
                padding: '1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)'
              }}
            >
              <div>
                <label
                  htmlFor="order-company-select"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  CORPORATE CLIENT *
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="order-company-select"
                    name="companyId"
                    value={form.companyId}
                    onChange={handleChange}
                    className="admin-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.8125rem' }}
                    disabled={isSubmitting}
                  >
                    {companies.map((c) => (
                      <option key={c.companyId} value={c.companyId}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedCompanyObj && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                    Agreed split: {selectedCompanyObj.driverSplit}% Driver / {selectedCompanyObj.hiredSplit}% Platform
                  </span>
                )}
                {errors.companyId && <span className="field-error-text">{errors.companyId}</span>}
              </div>

              <div>
                <label
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  INQUIRY CHANNEL *
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', height: '38px' }}>
                  {[
                    { id: 'PHONE', label: 'Phone Call', icon: Phone },
                    { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare }
                  ].map((ch) => {
                    const IconComp = ch.icon;
                    const isSelected = form.source === ch.id;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, source: ch.id }))}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          borderRadius: 'var(--radius-sm)',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                          color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                          fontSize: '0.78125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <IconComp size={13} />
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 2: Passenger Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="contactName-input"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  PASSENGER NAME *
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={14}
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    id="contactName-input"
                    type="text"
                    name="contactName"
                    maxLength={100}
                    value={form.contactName}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh Chandra"
                    className="admin-input"
                    style={{ paddingLeft: '2.25rem', width: '100%', height: '38px', fontSize: '0.8125rem' }}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.contactName && <span className="field-error-text">{errors.contactName}</span>}
              </div>

              <div>
                <label
                  htmlFor="contactPhone-input"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  CONTACT MOBILE NUMBER *
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={14}
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    id="contactPhone-input"
                    type="tel"
                    name="contactPhone"
                    maxLength={15}
                    value={form.contactPhone}
                    onChange={handleChange}
                    placeholder="e.g. 9845011223"
                    className="admin-input"
                    style={{ paddingLeft: '2.25rem', width: '100%', height: '38px', fontSize: '0.8125rem' }}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.contactPhone && <span className="field-error-text">{errors.contactPhone}</span>}
              </div>
            </div>

            {/* Section 3: Journey & Route */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label
                  htmlFor="pickupSpot-input"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  PICKUP SPOT / LANDMARK *
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin
                    size={14}
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#16a34a' }}
                  />
                  <input
                    id="pickupSpot-input"
                    type="text"
                    name="pickupSpot"
                    maxLength={250}
                    value={form.pickupSpot}
                    onChange={handleChange}
                    placeholder="e.g. Tech Park Gate 2, Outer Ring Road, Bengaluru"
                    className="admin-input"
                    style={{ paddingLeft: '2.25rem', width: '100%', height: '38px', fontSize: '0.8125rem' }}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.pickupSpot && <span className="field-error-text">{errors.pickupSpot}</span>}
              </div>

              <div>
                <label
                  htmlFor="dropoffSpot-input"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  DROPOFF DESTINATION *
                </label>
                <div style={{ position: 'relative' }}>
                  <MapPin
                    size={14}
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }}
                  />
                  <input
                    id="dropoffSpot-input"
                    type="text"
                    name="dropoffSpot"
                    maxLength={250}
                    value={form.dropoffSpot}
                    onChange={handleChange}
                    placeholder="e.g. Kempegowda International Airport (BLR), Terminal 2"
                    className="admin-input"
                    style={{ paddingLeft: '2.25rem', width: '100%', height: '38px', fontSize: '0.8125rem' }}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.dropoffSpot && <span className="field-error-text">{errors.dropoffSpot}</span>}
              </div>
            </div>

            {/* Section 4: Schedule, Vehicle & Fare */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label
                  htmlFor="pickupTime-input"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  SCHEDULED PICKUP *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="pickupTime-input"
                    type="datetime-local"
                    name="pickupTime"
                    value={form.pickupTime}
                    onChange={handleChange}
                    className="admin-input"
                    style={{ width: '100%', height: '38px', fontSize: '0.78125rem' }}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.pickupTime && <span className="field-error-text">{errors.pickupTime}</span>}
              </div>

              <div>
                <label
                  htmlFor="vehicleType-select"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  VEHICLE TYPE *
                </label>
                <select
                  id="vehicleType-select"
                  name="vehicleType"
                  value={form.vehicleType}
                  onChange={handleChange}
                  className="admin-input"
                  style={{ width: '100%', height: '38px', fontSize: '0.8125rem' }}
                  disabled={isSubmitting}
                >
                  <option value="Sedan">Sedan (Dzire, Etios)</option>
                  <option value="SUV">SUV (Innova, Ertiga)</option>
                  <option value="Hatchback">Hatchback (WagonR)</option>
                  <option value="Premium">Premium Executive</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="estimatedFare-input"
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
                >
                  ESTIMATED FARE (₹) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}
                  >
                    ₹
                  </span>
                  <input
                    id="estimatedFare-input"
                    type="number"
                    step="0.01"
                    min="1"
                    max="500000"
                    name="estimatedFare"
                    value={form.estimatedFare}
                    onChange={handleChange}
                    placeholder="1200.00"
                    className="admin-input"
                    style={{ paddingLeft: '1.85rem', width: '100%', height: '38px', fontSize: '0.8125rem', fontWeight: 600 }}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.estimatedFare && <span className="field-error-text">{errors.estimatedFare}</span>}
              </div>
            </div>

            {/* Section 5: Optional Special Notes */}
            <div>
              <label
                htmlFor="order-notes-textarea"
                style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}
              >
                SPECIAL NOTES / DISPATCH INSTRUCTIONS (OPTIONAL)
              </label>
              <textarea
                id="order-notes-textarea"
                name="notes"
                rows={2}
                maxLength={500}
                value={form.notes}
                onChange={handleChange}
                placeholder="e.g. VIP client delegate, luggage assistance needed, call passenger 15 mins prior..."
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  resize: 'none',
                  background: 'var(--surface)'
                }}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* ── Modal Footer Controls ── */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--background)'
            }}
          >
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              id="submit-create-order-btn"
            >
              <PlusCircle size={15} />
              <span>{isSubmitting ? 'Logging Order...' : 'Log & Queue Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
