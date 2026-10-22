import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ExternalLink, CheckCircle2, AlertCircle, Compass } from 'lucide-react';
import { parseGoogleMapsInput, buildGoogleMapsSearchUrl } from '../../utils/googleMapsParser';

export function LocationPickerField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  placeholder,
  pinColor = 'var(--primary)',
  required = true,
}) {
  const [pasteInput, setPasteInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [parseWarning, setParseWarning] = useState('');
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const [confirmedPlace, setConfirmedPlace] = useState(value || '');

  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Sync confirmation if parent clears/changes value externally
  useEffect(() => {
    if (!value) {
      setConfirmedPlace('');
    } else if (confirmedPlace && value !== confirmedPlace) {
      setConfirmedPlace(value);
    }
  }, [value]);

  // Open Google Maps in a new tab
  const handleOpenGoogleMaps = () => {
    const url = buildGoogleMapsSearchUrl(value);
    const newTab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      setPopupBlocked(true);
    } else {
      setPopupBlocked(false);
    }
    setShowHelper(true);
  };

  // Process text or pasted link
  const processInput = (text) => {
    if (!text || !text.trim()) return;

    const res = parseGoogleMapsInput(text);
    if (!res.success) {
      setParseError(res.error || 'Please paste a Google Maps link or type the address.');
      setParseWarning('');
      return;
    }

    setParseError('');
    setParseWarning(res.warning || '');
    setConfirmedPlace(res.text);
    onChange(name, res.text);
    setPasteInput('');
  };

  const handlePasteChange = (e) => {
    const val = e.target.value;
    setPasteInput(val);
    setParseError('');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        processInput(val);
      }, 300);
    }
  };

  const handlePasteDirect = (e) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      e.preventDefault();
      setPasteInput('');
      processInput(pasted);
    }
  };

  return (
    <div className="form-group" style={{ gridColumn: 'span 2' }}>
      <label className="form-label" htmlFor={id}>
        {label} {required && '*'}
      </label>

      {/* Primary Editable Address Input */}
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
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          className="form-control"
          style={{ paddingLeft: '38px', height: '44px' }}
          placeholder={placeholder}
          value={value}
          maxLength={300}
          onChange={(e) => {
            onChange(name, e.target.value);
            setConfirmedPlace(e.target.value);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>

      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}
        >
          {error}
        </span>
      )}

      {/* Google Maps Helper & Link Block */}
      <div
        style={{
          marginTop: '0.625rem',
          padding: '0.875rem 1rem',
          background: 'var(--bg-muted)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.8125rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Compass size={16} color="var(--primary)" aria-hidden="true" />
            <span>Google Maps Location Finder</span>
          </div>

          {!popupBlocked ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenGoogleMaps}
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                height: '34px',
              }}
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span>Select on Google Maps</span>
            </button>
          ) : (
            <a
              href={buildGoogleMapsSearchUrl(value)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                height: '34px',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span>Open Google Maps</span>
            </a>
          )}
        </div>

        {/* Short Helper Steps */}
        <p style={{ margin: '0.5rem 0 0.625rem', color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.4' }}>
          1. Search and choose the place on Google Maps. 2. Click Share, then Copy link (or copy the address). 3. Come back here and paste it below.
        </p>

        {/* Paste Field */}
        <div style={{ position: 'relative' }}>
          <input
            id={`${id}-paste`}
            type="text"
            className="form-control"
            style={{
              fontSize: '0.8125rem',
              padding: '0.5rem 0.75rem',
              height: '38px',
              backgroundColor: 'var(--bg-surface)',
            }}
            placeholder="Paste Google Maps link or address here..."
            value={pasteInput}
            onChange={handlePasteChange}
            onPaste={handlePasteDirect}
            aria-label={`Paste Google Maps link or address for ${label}`}
          />
        </div>

        {/* Parse Error Display */}
        {parseError && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--danger)',
              fontSize: '0.75rem',
              marginTop: '0.375rem',
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Coordinate Warning */}
        {parseWarning && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--warning)',
              fontSize: '0.75rem',
              marginTop: '0.375rem',
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{parseWarning}</span>
          </div>
        )}

        {/* Confirmation Line */}
        {confirmedPlace && !parseError && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '0.5rem',
              padding: '0.4rem 0.6rem',
              background: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)', fontWeight: 600 }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>Selected: {confirmedPlace}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
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
                href={buildGoogleMapsSearchUrl(confirmedPlace)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--primary)',
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
    </div>
  );
}

export default LocationPickerField;
