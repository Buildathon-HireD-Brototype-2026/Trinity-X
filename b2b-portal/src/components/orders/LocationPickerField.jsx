import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, ExternalLink, CheckCircle2, Compass, AlertCircle, Trash2 } from 'lucide-react';
import {
  checkPlaceWithPhoton,
  reversePhotonCoordinates,
  buildGoogleMapsSearchUrl,
  combinePlaceAndLandmark,
} from '../../utils/geocodingService.js';
import { parseGoogleMapsInput } from '../../utils/googleMapsParser.js';

export function LocationPickerField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  placeholder = 'Type a place name or paste a Google Maps link',
  pinColor = 'var(--primary, #2563eb)',
  required = true,
}) {
  const [inputText, setInputText] = useState(value || '');
  const [isTyping, setIsTyping] = useState(false);
  const [confirmedText, setConfirmedText] = useState(value ? value.trim().replace(/\s+/g, ' ') : '');
  const [checkStatus, setCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'found' | 'not_found'
  const [landmark, setLandmark] = useState('');
  const [activeGoogleLink, setActiveGoogleLink] = useState('');
  const [notfoundLinkInput, setNotfoundLinkInput] = useState('');
  const [linkFeedbackMessage, setLinkFeedbackMessage] = useState('');
  const [linkFeedbackType, setLinkFeedbackType] = useState(''); // 'success' | 'warning' | 'error'
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [coordFallbackMessage, setCoordFallbackMessage] = useState('');

  const inputRef = useRef(null);
  const activeAbortRef = useRef(null);
  const debounceLinkTimerRef = useRef(null);

  // Sync external changes (e.g. sample route or form reset)
  useEffect(() => {
    if (value !== undefined && !isTyping) {
      if (value !== inputText && value !== confirmedText) {
        setInputText(value);
        const cleaned = (value || '').trim().replace(/\s+/g, ' ');
        setConfirmedText(cleaned);
        if (!cleaned) {
          setCheckStatus('idle');
          setLandmark('');
          setActiveGoogleLink('');
          setNotfoundLinkInput('');
          setLinkFeedbackMessage('');
          setCoordFallbackMessage('');
        }
      }
    }
  }, [value, isTyping, inputText, confirmedText]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      if (debounceLinkTimerRef.current) {
        clearTimeout(debounceLinkTimerRef.current);
      }
    };
  }, []);

  // Run quiet place check with Photon
  const runQuietPlaceCheck = useCallback(
    async (text) => {
      const cleaned = (text || '').trim().replace(/\s+/g, ' ');
      if (!cleaned) {
        setCheckStatus('idle');
        return;
      }

      setCheckStatus('checking');

      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;

      try {
        const result = await checkPlaceWithPhoton(cleaned, { signal: controller.signal });
        if (result.found) {
          setCheckStatus('found');
          setLandmark('');
          onChange(name, cleaned);
        } else {
          setCheckStatus('not_found');
          const combined = combinePlaceAndLandmark(cleaned, landmark);
          onChange(name, combined);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setCheckStatus('not_found');
        const combined = combinePlaceAndLandmark(cleaned, landmark);
        onChange(name, combined);
      }
    },
    [landmark, name, onChange]
  );

  // Core link processing routine shared by primary input and not-found link input
  const processLinkString = async (rawUrl, source = 'main') => {
    const parsed = parseGoogleMapsInput(rawUrl);

    if (parsed.type === 'short_link') {
      const msg = 'This is a short link. Please open it, copy the place name from Google Maps, and type it in the place box.';
      setLinkFeedbackMessage(msg);
      setLinkFeedbackType('warning');
      if (source === 'notfound') {
        setActiveGoogleLink(parsed.rawUrl);
      }
      return false;
    }

    if (parsed.type === 'invalid_link') {
      const msg = 'Please paste a Google Maps link or type the place name.';
      setLinkFeedbackMessage(msg);
      setLinkFeedbackType('error');
      return false;
    }

    if (parsed.type === 'place_link') {
      const placeName = parsed.placeName;
      setInputText(placeName);
      setConfirmedText(placeName);
      setActiveGoogleLink(parsed.rawUrl);
      setLinkFeedbackMessage(`Place: ${placeName}`);
      setLinkFeedbackType('success');
      setCoordFallbackMessage('');
      setCheckStatus('found');
      setLandmark('');
      onChange(name, placeName);
      return true;
    }

    if (parsed.type === 'coordinates_link') {
      setActiveGoogleLink(parsed.rawUrl);
      const coords = parsed.coordinates;
      let resolvedAddress = null;

      try {
        resolvedAddress = await reversePhotonCoordinates(coords.lat, coords.lng);
      } catch {
        resolvedAddress = null;
      }

      if (resolvedAddress) {
        setInputText(resolvedAddress);
        setConfirmedText(resolvedAddress);
        setLinkFeedbackMessage(`Place: ${resolvedAddress}`);
        setLinkFeedbackType('success');
        setCoordFallbackMessage('');
        setCheckStatus('found');
        setLandmark('');
        onChange(name, resolvedAddress);
        return true;
      } else {
        const coordText = `${coords.lat}, ${coords.lng}`;
        setInputText(coordText);
        setConfirmedText(coordText);
        setCoordFallbackMessage('Please add the area or a landmark so the driver can find it.');
        setCheckStatus('not_found');
        const combined = combinePlaceAndLandmark(coordText, landmark);
        onChange(name, combined);
        return true;
      }
    }

    return false;
  };

  // Primary place text input change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);
    setIsTyping(true);
    setLinkFeedbackMessage('');
    setCoordFallbackMessage('');
    onChange(name, val);
  };

  // Primary input paste
  const handleInputPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    const parsed = parseGoogleMapsInput(pasted);
    if (parsed.isLink) {
      e.preventDefault();
      processLinkString(pasted, 'main');
    }
  };

  // Primary input commit on blur or Enter
  const handleInputCommit = () => {
    setIsTyping(false);
    const text = inputText.trim();

    if (!text) {
      setConfirmedText('');
      setCheckStatus('idle');
      setLandmark('');
      setActiveGoogleLink('');
      setLinkFeedbackMessage('');
      setCoordFallbackMessage('');
      onChange(name, '');
      return;
    }

    const parsed = parseGoogleMapsInput(text);
    if (parsed.isLink) {
      processLinkString(text, 'main');
      return;
    }

    // Standard place text commit
    const cleaned = text.replace(/\s+/g, ' ');
    setConfirmedText(cleaned);

    const combined = combinePlaceAndLandmark(cleaned, landmark);
    onChange(name, combined);

    runQuietPlaceCheck(cleaned);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputCommit();
    }
  };

  // Landmark input change
  const handleLandmarkChange = (e) => {
    const newLandmark = e.target.value.slice(0, 100);
    setLandmark(newLandmark);
    const combined = combinePlaceAndLandmark(confirmedText || inputText, newLandmark);
    onChange(name, combined);
  };

  // "View on map" action
  const handleViewOnMap = () => {
    const targetUrl = activeGoogleLink || buildGoogleMapsSearchUrl(confirmedText || inputText);
    const newTab = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      setPopupBlocked(true);
    } else {
      setPopupBlocked(false);
    }
  };

  // "Change" action
  const handleChangeClick = () => {
    setIsTyping(true);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  // "Remove link" action
  const handleRemoveLink = () => {
    setActiveGoogleLink('');
    setNotfoundLinkInput('');
    setLinkFeedbackMessage('');
  };

  // "Open Google Maps" button in not-found state
  const handleOpenGoogleMapsSearch = () => {
    const searchUrl = buildGoogleMapsSearchUrl(confirmedText || inputText);
    const newTab = window.open(searchUrl, '_blank', 'noopener,noreferrer');
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      setPopupBlocked(true);
    } else {
      setPopupBlocked(false);
    }
  };

  // Not-found Google Maps link input handlers
  const handleNotfoundLinkChange = (e) => {
    const val = e.target.value;
    setNotfoundLinkInput(val);
    setLinkFeedbackMessage('');

    if (debounceLinkTimerRef.current) {
      clearTimeout(debounceLinkTimerRef.current);
    }

    if (val.trim()) {
      debounceLinkTimerRef.current = setTimeout(() => {
        processLinkString(val, 'notfound');
      }, 300);
    }
  };

  const handleNotfoundLinkPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (pasted) {
      setNotfoundLinkInput(pasted);
      if (debounceLinkTimerRef.current) {
        clearTimeout(debounceLinkTimerRef.current);
      }
      processLinkString(pasted, 'notfound');
    }
  };

  // Computed layout states
  const showResultRow = !isTyping && confirmedText.length > 0;
  const showNotFoundBlock = showResultRow && checkStatus === 'not_found';
  const effectiveViewMapUrl = activeGoogleLink || buildGoogleMapsSearchUrl(confirmedText || inputText);

  // Shorten URL for display in the small link row (e.g. "maps.google.com/.../Lulu+Mall")
  const displayShortenedLink = activeGoogleLink
    ? activeGoogleLink.replace(/^https?:\/\//i, '').slice(0, 48) + (activeGoogleLink.length > 55 ? '...' : '')
    : '';

  const currentCombined = combinePlaceAndLandmark(confirmedText || inputText, landmark);
  const isNearLimit = currentCombined.length >= 260 || landmark.length >= 80;
  const remainingChars = Math.max(0, 300 - currentCombined.length);

  return (
    <div className="form-group" style={{ gridColumn: 'span 2' }}>
      <label className="form-label" htmlFor={id}>
        {label} {required && '*'}
      </label>

      {/* 1. Primary Place Text Input */}
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
          placeholder="Type a place name or paste a Google Maps link"
          value={inputText}
          maxLength={300}
          onChange={handleInputChange}
          onPaste={handleInputPaste}
          onBlur={handleInputCommit}
          onKeyDown={handleInputKeyDown}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>

      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          style={{
            color: 'var(--danger, #ef4444)',
            fontSize: '0.75rem',
            marginTop: '0.25rem',
            display: 'block',
          }}
        >
          {error}
        </span>
      )}

      {/* 2. Slim Result Row (Hidden while typing and when input is empty) */}
      {showResultRow && (
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
            padding: '0.45rem 0.65rem',
            background: 'var(--success-bg, #ecfdf5)',
            border: '1px solid var(--success-border, #a7f3d0)',
            borderRadius: 'var(--radius-sm, 6px)',
            fontSize: '0.8125rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--success, #059669)',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>Selected: {confirmedText}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Action A: View on map */}
            {!popupBlocked ? (
              <button
                type="button"
                onClick={handleViewOnMap}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary, #2563eb)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.8125rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  minHeight: '36px',
                }}
              >
                <span>View on map</span>
                <ExternalLink size={13} aria-hidden="true" />
              </button>
            ) : (
              <a
                href={effectiveViewMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--primary, #2563eb)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                  minHeight: '36px',
                }}
              >
                <span>View on map</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}

            {/* Action B: Change */}
            <button
              type="button"
              onClick={handleChangeClick}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary, #2563eb)',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                fontSize: '0.8125rem',
                textDecoration: 'underline',
                minHeight: '36px',
              }}
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Small Row: Google Maps link display with Remove link action */}
      {showResultRow && activeGoogleLink && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '0.35rem',
            padding: '0.3rem 0.5rem',
            background: 'var(--bg-muted, #f8fafc)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-sm, 6px)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary, #475569)',
          }}
        >
          <div
            title={activeGoogleLink}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: '0.5rem',
            }}
          >
            <span style={{ fontWeight: 600 }}>Google Maps link: </span>
            <span style={{ color: 'var(--primary, #2563eb)' }}>{displayShortenedLink}</span>
          </div>

          <button
            type="button"
            onClick={handleRemoveLink}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--danger, #ef4444)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '0 0.25rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
            aria-label="Remove link"
          >
            <Trash2 size={12} aria-hidden="true" />
            <span>Remove link</span>
          </button>
        </div>
      )}

      {/* Place Found Confirmation Note */}
      {showResultRow && checkStatus === 'found' && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: '0.375rem',
            fontSize: '0.75rem',
            color: 'var(--success, #059669)',
            fontWeight: 500,
          }}
        >
          Place found on the map.
        </div>
      )}

      {/* Coordinates link fallback reminder */}
      {showResultRow && coordFallbackMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: '0.375rem',
            fontSize: '0.75rem',
            color: 'var(--warning, #f59e0b)',
            fontWeight: 500,
          }}
        >
          {coordFallbackMessage}
        </div>
      )}

      {/* 3. Not-Found State Block */}
      {showNotFoundBlock && (
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
          {/* a) The Note */}
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: '0 0 0.75rem',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary, #475569)',
              lineHeight: '1.4',
            }}
          >
            We could not find this place automatically. You can find it on Google Maps and paste the link here, or add a landmark.
          </p>

          {/* b) Button "Open Google Maps" and short plain steps */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {!popupBlocked ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleOpenGoogleMapsSearch}
                  style={{
                    fontSize: '0.8125rem',
                    padding: '0.45rem 0.875rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    height: '36px',
                  }}
                >
                  <Compass size={15} aria-hidden="true" />
                  <span>Open Google Maps</span>
                </button>
              ) : (
                <a
                  href={buildGoogleMapsSearchUrl(confirmedText || inputText)}
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
                  <Compass size={15} aria-hidden="true" />
                  <span>Open Google Maps</span>
                </a>
              )}
            </div>

            <p
              style={{
                margin: '0.5rem 0 0',
                color: 'var(--text-muted, #64748b)',
                fontSize: '0.75rem',
                lineHeight: '1.4',
              }}
            >
              1. Find the place on Google Maps. 2. Click Share, then Copy link. 3. Paste the link below.
            </p>
          </div>

          {/* c) Field "Google Maps link" */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              htmlFor={`${id}-google-link`}
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
              id={`${id}-google-link`}
              type="text"
              className="form-control"
              placeholder="Paste Google Maps link here"
              value={notfoundLinkInput}
              onChange={handleNotfoundLinkChange}
              onPaste={handleNotfoundLinkPaste}
              style={{
                height: '38px',
                fontSize: '0.8125rem',
                backgroundColor: 'var(--bg-surface, #ffffff)',
              }}
              aria-label="Google Maps link"
            />

            {linkFeedbackMessage && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  marginTop: '0.375rem',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 500,
                  color:
                    linkFeedbackType === 'error'
                      ? 'var(--danger, #ef4444)'
                      : linkFeedbackType === 'warning'
                      ? 'var(--warning, #f59e0b)'
                      : 'var(--success, #059669)',
                }}
              >
                {linkFeedbackType === 'error' || linkFeedbackType === 'warning' ? (
                  <AlertCircle size={13} style={{ flexShrink: 0 }} aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={13} style={{ flexShrink: 0 }} aria-hidden="true" />
                )}
                <span>{linkFeedbackMessage}</span>
              </div>
            )}
          </div>

          {/* d) Landmark or nearby place (optional) */}
          <div>
            <label
              htmlFor={`${id}-landmark`}
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary, #475569)',
                marginBottom: '0.25rem',
              }}
            >
              Landmark or nearby place (optional)
            </label>
            <input
              id={`${id}-landmark`}
              type="text"
              className="form-control"
              placeholder="For example: near Bypass Road"
              value={landmark}
              maxLength={100}
              onChange={handleLandmarkChange}
              style={{
                height: '38px',
                fontSize: '0.8125rem',
                backgroundColor: 'var(--bg-surface, #ffffff)',
              }}
              aria-label="Landmark or nearby place (optional)"
            />

            {isNearLimit && (
              <div
                style={{
                  marginTop: '0.25rem',
                  fontSize: '0.7rem',
                  color: remainingChars < 10 ? 'var(--danger, #ef4444)' : 'var(--text-muted, #64748b)',
                  textAlign: 'right',
                }}
              >
                {remainingChars} characters remaining
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationPickerField;
