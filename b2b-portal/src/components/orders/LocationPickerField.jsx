import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Map, ExternalLink, CheckCircle2, AlertCircle, Compass, Loader2 } from 'lucide-react';
import { parseGoogleMapsInput, buildGoogleMapsSearchUrl } from '../../utils/googleMapsParser';
import { reverseGeocode } from '../../utils/geocodingService';
import LocationMapModal from './LocationMapModal';

export function LocationPickerField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  placeholder,
  pinColor = 'var(--primary, #2563eb)',
  required = true,
}) {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [linkStatus, setLinkStatus] = useState(null); // { type: 'place' | 'short_link' | 'invalid_link' | 'loading' | 'error', message: '' }
  const [popupBlocked, setPopupBlocked] = useState(false);

  const addressInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const activeAbortRef = useRef(null);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
    };
  }, []);

  // Open Google Maps in a new browser tab
  const handleOpenGoogleMaps = () => {
    const url = buildGoogleMapsSearchUrl(value);
    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      setPopupBlocked(true);
    } else {
      setPopupBlocked(false);
    }
  };

  // Process pasted or typed Google Maps link / text
  const processLinkInput = async (rawText) => {
    const text = (rawText || '').trim();
    if (!text) {
      setLinkStatus(null);
      return;
    }

    const parsed = parseGoogleMapsInput(text);

    if (parsed.type === 'short_link') {
      setLinkStatus({
        type: 'short_link',
        message: 'This is a short link. Please open it, copy the address from Google Maps, and paste the address in the box above.',
      });
      return;
    }

    if (parsed.type === 'invalid_link') {
      setLinkStatus({
        type: 'invalid_link',
        message: 'Please paste a Google Maps link.',
      });
      return;
    }

    if (parsed.type === 'plain_text') {
      setLinkStatus(null);
      onChange(name, parsed.address);
      return;
    }

    if (parsed.type === 'place_link') {
      onChange(name, parsed.placeName);
      setLinkStatus({
        type: 'place',
        message: `Place: ${parsed.placeName}`,
      });
      return;
    }

    if (parsed.type === 'coordinates_link') {
      setLinkStatus({
        type: 'loading',
        message: 'Finding address from coordinates...',
      });

      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;

      try {
        const res = await reverseGeocode(parsed.coordinates.lat, parsed.coordinates.lng, {
          signal: controller.signal,
        });
        const resolvedAddress = res.addressText;
        onChange(name, resolvedAddress);
        setLinkStatus({
          type: 'place',
          message: `Place: ${resolvedAddress}`,
        });
      } catch (err) {
        if (err.name === 'AbortError') return;
        onChange(name, parsed.text);
        setLinkStatus({
          type: 'place',
          message: `Place: ${parsed.text}`,
        });
      }
    }
  };

  const handleLinkChange = (e) => {
    const val = e.target.value;
    setGoogleMapsLink(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        processLinkInput(val);
      }, 300);
    } else {
      setLinkStatus(null);
    }
  };

  const handleLinkPaste = (e) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      setGoogleMapsLink(pasted);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      processLinkInput(pasted);
    }
  };

  const handleMapConfirm = (confirmedAddress) => {
    onChange(name, confirmedAddress);
  };

  return (
    <div className="form-group" style={{ gridColumn: 'span 2' }}>
      <label className="form-label" htmlFor={id}>
        {label} {required && '*'}
      </label>

      {/* A) Primary Address Text Input */}
      <div style={{ position: 'relative' }}>
        <MapPin
          size={18}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: pinColor,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
        <input
          ref={addressInputRef}
          id={id}
          name={name}
          type="text"
          className="form-control"
          style={{ paddingLeft: '38px', height: '44px' }}
          placeholder={placeholder}
          value={value}
          maxLength={300}
          onChange={(e) => onChange(name, e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>

      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          style={{ color: 'var(--danger, #ef4444)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}
        >
          {error}
        </span>
      )}

      {/* Auxiliary Location Actions & Tools */}
      <div
        style={{
          marginTop: '0.625rem',
          padding: '0.875rem 1rem',
          background: 'var(--bg-muted, #f8fafc)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          borderRadius: 'var(--radius-md, 8px)',
          fontSize: '0.8125rem',
        }}
      >
        {/* Action Buttons Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.625rem',
          }}
        >
          {/* B) Choose on map button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsMapOpen(true)}
            style={{
              fontSize: '0.8125rem',
              padding: '0.45rem 0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              height: '36px',
            }}
          >
            <Map size={16} aria-hidden="true" />
            <span>Choose on map</span>
          </button>

          {/* C) Open Google Maps button */}
          <div>
            {!popupBlocked ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleOpenGoogleMaps}
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.45rem 0.875rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  height: '36px',
                }}
              >
                <Compass size={16} aria-hidden="true" />
                <span>Open Google Maps</span>
              </button>
            ) : (
              <a
                href={buildGoogleMapsSearchUrl(value)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.8125rem',
                  padding: '0.45rem 0.875rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  height: '36px',
                  textDecoration: 'none',
                }}
              >
                <Compass size={16} aria-hidden="true" />
                <span>Open Google Maps</span>
              </a>
            )}
          </div>
        </div>

        {/* Short Plain Steps */}
        <p
          style={{
            margin: '0.625rem 0 0.5rem',
            color: 'var(--text-muted, #64748b)',
            fontSize: '0.75rem',
            lineHeight: '1.4',
          }}
        >
          1. Choose the place on Google Maps. 2. Click Share, then Copy link. 3. Paste the link below.
        </p>

        {/* D) Field "Google Maps link" */}
        <div style={{ position: 'relative' }}>
          <label
            htmlFor={`${id}-google-maps-link`}
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-secondary, #475569)',
              marginBottom: '0.25rem',
            }}
          >
            Google Maps link
          </label>
          <input
            id={`${id}-google-maps-link`}
            type="text"
            className="form-control"
            style={{
              fontSize: '0.8125rem',
              padding: '0.5rem 0.75rem',
              height: '38px',
              backgroundColor: 'var(--bg-surface, #ffffff)',
            }}
            placeholder="Paste Google Maps link here..."
            value={googleMapsLink}
            onChange={handleLinkChange}
            onPaste={handleLinkPaste}
            aria-label={`Google Maps link for ${label}`}
          />
        </div>

        {/* Status Line below Link Field */}
        {linkStatus && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: '0.375rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color:
                linkStatus.type === 'invalid_link'
                  ? 'var(--danger, #ef4444)'
                  : linkStatus.type === 'short_link'
                  ? 'var(--warning, #f59e0b)'
                  : linkStatus.type === 'loading'
                  ? 'var(--primary, #2563eb)'
                  : 'var(--success, #10b981)',
              fontWeight: 500,
            }}
          >
            {linkStatus.type === 'loading' ? (
              <Loader2 size={13} className="spin" style={{ flexShrink: 0 }} aria-hidden="true" />
            ) : linkStatus.type === 'place' ? (
              <CheckCircle2 size={13} style={{ flexShrink: 0 }} aria-hidden="true" />
            ) : (
              <AlertCircle size={13} style={{ flexShrink: 0 }} aria-hidden="true" />
            )}
            <span>{linkStatus.message}</span>
          </div>
        )}

        {/* E) Confirmation row under the field */}
        {value && value.trim() && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '0.625rem',
              padding: '0.45rem 0.65rem',
              background: 'var(--success-bg, #ecfdf5)',
              border: '1px solid var(--success-border, #a7f3d0)',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '0.75rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--success, #059669)',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>Selected: {value.trim()}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsMapOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #2563eb)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                }}
              >
                Change
              </button>
              <a
                href={buildGoogleMapsSearchUrl(value)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--primary, #2563eb)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontSize: '0.75rem',
                  textDecoration: 'none',
                }}
              >
                <span>View on Google Maps</span>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Leaflet OpenStreetMap Modal */}
      <LocationMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirm={handleMapConfirm}
        title={`Choose ${label} on map`}
        initialAddress={value}
      />
    </div>
  );
}

export default LocationPickerField;
