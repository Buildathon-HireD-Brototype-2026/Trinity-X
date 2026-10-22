import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { MapPin, ExternalLink, CheckCircle2, Compass, AlertCircle, Trash2 } from 'lucide-react';
import {
  checkPlaceWithPhoton,
  reversePhotonCoordinates,
  buildGoogleMapsSearchUrl,
  combinePlaceAndLandmark,
} from '../../utils/geocodingService.js';
import { parseGoogleMapsInput, normalizeLinkInput } from '../../utils/googleMapsParser.js';

export const LocationPickerField = forwardRef(function LocationPickerField(
  {
    id,
    name,
    label,
    value,
    onChange,
    error,
    placeholder = 'Type a place name or paste a Google Maps link',
    pinColor = 'var(--primary, #2563eb)',
    required = true,
  },
  ref
) {
  // Three separate values for place and landmark
  const [placeText, setPlaceText] = useState(value || '');
  const [landmark, setLandmark] = useState(''); // Applied landmark only
  const [landmarkDraft, setLandmarkDraft] = useState(''); // Live draft in landmark box
  const [isTyping, setIsTyping] = useState(false);
  const [confirmedText, setConfirmedText] = useState(value ? value.trim().replace(/\s+/g, ' ') : '');
  const [checkStatus, setCheckStatus] = useState('idle'); // 'idle' | 'checking' | 'found' | 'not_found'
  const [activeGoogleLink, setActiveGoogleLink] = useState('');
  const [notfoundLinkInput, setNotfoundLinkInput] = useState('');
  const [linkFeedbackMessage, setLinkFeedbackMessage] = useState('');
  const [linkFeedbackType, setLinkFeedbackType] = useState(''); // 'info' | 'success' | 'error'
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [coordFallbackMessage, setCoordFallbackMessage] = useState('');

  const inputRef = useRef(null);
  const activeAbortRef = useRef(null);
  const debounceLinkTimerRef = useRef(null);
  const isPastingRef = useRef(false);

  // Keep refs for live values in async/event handlers
  const placeTextRef = useRef(placeText);
  const landmarkRef = useRef(landmark);
  const landmarkDraftRef = useRef(landmarkDraft);
  const onChangeRef = useRef(onChange);
  const lastSentValueRef = useRef(value || '');

  placeTextRef.current = placeText;
  landmarkRef.current = landmark;
  landmarkDraftRef.current = landmarkDraft;
  onChangeRef.current = onChange;

  // Apply draft landmark helper
  const applyDraft = useCallback(() => {
    const draft = (landmarkDraftRef.current || '').trim().slice(0, 100);
    if (draft && !landmarkRef.current) {
      setLandmark(draft);
      const combined = combinePlaceAndLandmark(placeTextRef.current, draft);
      lastSentValueRef.current = combined;
      onChangeRef.current?.(name, combined);
      return combined;
    }
    return combinePlaceAndLandmark(placeTextRef.current, landmarkRef.current);
  }, [name]);

  // Expose imperative methods to parent form (e.g. submit handler)
  useImperativeHandle(ref, () => ({
    applyDraft,
    getFinalValue: () => {
      const draft = (landmarkDraftRef.current || '').trim().slice(0, 100);
      const effectiveLandmark = landmarkRef.current || draft;
      return combinePlaceAndLandmark(placeTextRef.current, effectiveLandmark);
    },
  }));

  // Sync external changes (e.g. sample route auto-fill or form reset)
  useEffect(() => {
    if (value !== undefined) {
      if (value === lastSentValueRef.current) {
        // Echo of our own onChange update - do not overwrite local placeText or draft
        return;
      }
      lastSentValueRef.current = value;
      const cleaned = (value || '').trim().replace(/\s+/g, ' ');
      setPlaceText(cleaned);
      setConfirmedText(cleaned);
      if (!cleaned) {
        setCheckStatus('idle');
        setLandmark('');
        setLandmarkDraft('');
        setActiveGoogleLink('');
        setNotfoundLinkInput('');
        setLinkFeedbackMessage('');
        setCoordFallbackMessage('');
      }
    }
  }, [value]);

  // Apply unapplied landmark draft if the enclosing form submits
  useEffect(() => {
    const form = inputRef.current?.closest('form');
    if (!form) return;

    const handleFormSubmit = () => {
      applyDraft();
    };

    form.addEventListener('submit', handleFormSubmit, true);
    return () => {
      form.removeEventListener('submit', handleFormSubmit, true);
    };
  }, [applyDraft]);

  // Clean up timers and abort controller on unmount
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
          // If found, drop applied landmark and hide not-found landmark box
          setCheckStatus('found');
          setLandmark('');
          setLandmarkDraft('');
          lastSentValueRef.current = cleaned;
          onChange(name, cleaned);
        } else {
          setCheckStatus('not_found');
          const combined = combinePlaceAndLandmark(cleaned, landmarkRef.current);
          lastSentValueRef.current = combined;
          onChange(name, combined);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        setCheckStatus('not_found');
        const combined = combinePlaceAndLandmark(cleaned, landmarkRef.current);
        lastSentValueRef.current = combined;
        onChange(name, combined);
      }
    },
    [name, onChange]
  );

  // Core link processing routine shared by primary input and not-found link input
  const processLinkString = async (rawUrl, source = 'main') => {
    const normalized = normalizeLinkInput(rawUrl);
    const parsed = parseGoogleMapsInput(normalized);

    // Share link (maps.app.goo.gl or goo.gl/maps)
    if (parsed.type === 'share_link') {
      setActiveGoogleLink(parsed.rawUrl);
      setNotfoundLinkInput(parsed.rawUrl);

      const hasPlaceText = Boolean((confirmedText || placeText).trim());
      const msg = hasPlaceText
        ? 'Link added.'
        : 'Link added. Please type the place name in the box above so the driver can find it.';

      setLinkFeedbackMessage(msg);
      setLinkFeedbackType('info');
      setCoordFallbackMessage('');
      return true;
    }

    if (parsed.type === 'invalid_link') {
      const msg = 'Please paste a Google Maps link or type the place name.';
      setLinkFeedbackMessage(msg);
      setLinkFeedbackType('error');
      return false;
    }

    if (parsed.type === 'place_link') {
      const extractedPlace = parsed.placeName;
      setPlaceText(extractedPlace);
      setConfirmedText(extractedPlace);
      setActiveGoogleLink(parsed.rawUrl);
      setNotfoundLinkInput(parsed.rawUrl);
      setLinkFeedbackMessage(`Place: ${extractedPlace}`);
      setLinkFeedbackType('success');
      setCoordFallbackMessage('');
      setCheckStatus('found');
      setLandmark('');
      setLandmarkDraft('');
      lastSentValueRef.current = extractedPlace;
      onChange(name, extractedPlace);
      return true;
    }

    if (parsed.type === 'coordinates_link') {
      setActiveGoogleLink(parsed.rawUrl);
      setNotfoundLinkInput(parsed.rawUrl);
      const coords = parsed.coordinates;
      let resolvedAddress = null;

      try {
        resolvedAddress = await reversePhotonCoordinates(coords.lat, coords.lng);
      } catch {
        resolvedAddress = null;
      }

      if (resolvedAddress) {
        setPlaceText(resolvedAddress);
        setConfirmedText(resolvedAddress);
        setLinkFeedbackMessage(`Place: ${resolvedAddress}`);
        setLinkFeedbackType('success');
        setCoordFallbackMessage('');
        setCheckStatus('found');
        setLandmark('');
        setLandmarkDraft('');
        lastSentValueRef.current = resolvedAddress;
        onChange(name, resolvedAddress);
        return true;
      } else {
        const coordText = `${coords.lat}, ${coords.lng}`;
        setPlaceText(coordText);
        setConfirmedText(coordText);
        setCoordFallbackMessage('Please add the area or a landmark so the driver can find it.');
        setCheckStatus('not_found');
        const combined = combinePlaceAndLandmark(coordText, landmarkRef.current);
        lastSentValueRef.current = combined;
        onChange(name, combined);
        return true;
      }
    }

    return false;
  };

  // Primary place text input change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setPlaceText(val);
    setIsTyping(true);
    setLinkFeedbackMessage('');
    setCoordFallbackMessage('');
    const combined = combinePlaceAndLandmark(val, landmark);
    lastSentValueRef.current = combined;
    onChange(name, combined);
  };

  // Primary input paste: one paste = one link
  const handleInputPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') || '';
    const normalized = normalizeLinkInput(pasted);
    const parsed = parseGoogleMapsInput(normalized);

    if (parsed.isLink) {
      e.preventDefault();
      isPastingRef.current = true;
      setTimeout(() => {
        isPastingRef.current = false;
      }, 50);

      setNotfoundLinkInput(normalized);
      processLinkString(normalized, 'main');
    }
  };

  // Primary input commit on blur or Enter
  const handleInputCommit = () => {
    setIsTyping(false);
    const text = placeText.trim();

    if (!text) {
      setConfirmedText('');
      setCheckStatus('idle');
      setLandmark('');
      setLandmarkDraft('');
      setActiveGoogleLink('');
      setLinkFeedbackMessage('');
      setCoordFallbackMessage('');
      lastSentValueRef.current = '';
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

    // Keep applied landmark when editing place text
    const combined = combinePlaceAndLandmark(cleaned, landmark);
    lastSentValueRef.current = combined;
    onChange(name, combined);

    runQuietPlaceCheck(cleaned);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputCommit();
    }
  };

  // Landmark draft input change: changes ONLY landmarkDraft, nothing else
  const handleLandmarkDraftChange = (e) => {
    const newDraft = e.target.value.slice(0, 100);
    setLandmarkDraft(newDraft);
  };

  // Landmark is applied ONLY when pressing Enter or clicking "Add"
  const handleApplyLandmark = () => {
    const trimmed = (landmarkDraft || '').trim().slice(0, 100);
    setLandmark(trimmed);
    const combined = combinePlaceAndLandmark(confirmedText || placeText, trimmed);
    lastSentValueRef.current = combined;
    onChange(name, combined);
  };

  const handleLandmarkKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Enter must not submit the form
      handleApplyLandmark();
    }
  };

  // "Remove" action in result row clears landmark
  const handleRemoveLandmark = () => {
    setLandmark('');
    setLandmarkDraft('');
    const combined = (confirmedText || placeText).trim();
    lastSentValueRef.current = combined;
    onChange(name, combined);
  };

  // "View on map" action
  const handleViewOnMap = () => {
    const targetUrl = activeGoogleLink || buildGoogleMapsSearchUrl(confirmedText || placeText);
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
    const searchUrl = buildGoogleMapsSearchUrl(confirmedText || placeText);
    const newTab = window.open(searchUrl, '_blank', 'noopener,noreferrer');
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      setPopupBlocked(true);
    } else {
      setPopupBlocked(false);
    }
  };

  // Not-found Google Maps link input handlers
  const handleNotfoundLinkChange = (e) => {
    if (isPastingRef.current) return;
    const val = e.target.value;
    const normalized = normalizeLinkInput(val);
    setNotfoundLinkInput(normalized);
    setLinkFeedbackMessage('');

    if (debounceLinkTimerRef.current) {
      clearTimeout(debounceLinkTimerRef.current);
    }

    if (normalized.trim()) {
      debounceLinkTimerRef.current = setTimeout(() => {
        processLinkString(normalized, 'notfound');
      }, 300);
    }
  };

  const handleNotfoundLinkPaste = (e) => {
    e.preventDefault();
    isPastingRef.current = true;
    setTimeout(() => {
      isPastingRef.current = false;
    }, 50);

    const pasted = e.clipboardData?.getData('text') || '';
    const normalized = normalizeLinkInput(pasted);
    setNotfoundLinkInput(normalized);

    if (debounceLinkTimerRef.current) {
      clearTimeout(debounceLinkTimerRef.current);
    }

    if (normalized.trim()) {
      processLinkString(normalized, 'notfound');
    }
  };

  // Computed layout states
  const showResultRow = !isTyping && confirmedText.length > 0;
  const showNotFoundBlock = showResultRow && checkStatus === 'not_found';
  const effectiveViewMapUrl = activeGoogleLink || buildGoogleMapsSearchUrl(confirmedText || placeText);

  // Shorten URL for display in the small link row
  const displayShortenedLink = activeGoogleLink
    ? activeGoogleLink.replace(/^https?:\/\//i, '').slice(0, 48) + (activeGoogleLink.length > 55 ? '...' : '')
    : '';

  const currentDerived = combinePlaceAndLandmark(confirmedText || placeText, landmark);
  const isNearLimit = landmarkDraft.length >= 80 || (currentDerived.length + landmarkDraft.length) >= 260;
  const remainingLandmarkChars = Math.max(0, 100 - landmarkDraft.length);

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
          placeholder={placeholder}
          value={placeText}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
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
              <span>Selected: {currentDerived}</span>
            </div>

            {landmark && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                  paddingLeft: '1.35rem',
                }}
              >
                <span style={{ color: 'var(--text-secondary, #475569)' }}>
                  Landmark added: <strong>{landmark}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleRemoveLandmark}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--danger, #ef4444)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Remove
                </button>
              </div>
            )}
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
                  href={buildGoogleMapsSearchUrl(confirmedText || placeText)}
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
                      : linkFeedbackType === 'info'
                      ? 'var(--text-secondary, #475569)'
                      : 'var(--success, #059669)',
                }}
              >
                {linkFeedbackType === 'error' ? (
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
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                id={`${id}-landmark`}
                type="text"
                className="form-control"
                placeholder="For example: near Bypass Road"
                value={landmarkDraft}
                maxLength={100}
                onChange={handleLandmarkDraftChange}
                onKeyDown={handleLandmarkKeyDown}
                style={{
                  height: '38px',
                  fontSize: '0.8125rem',
                  backgroundColor: 'var(--bg-surface, #ffffff)',
                }}
                aria-label="Landmark or nearby place (optional)"
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleApplyLandmark}
                style={{
                  height: '38px',
                  padding: '0 0.875rem',
                  fontSize: '0.8125rem',
                  flexShrink: 0,
                }}
              >
                Add
              </button>
            </div>

            {isNearLimit && (
              <div
                style={{
                  marginTop: '0.25rem',
                  fontSize: '0.7rem',
                  color: remainingLandmarkChars < 10 ? 'var(--danger, #ef4444)' : 'var(--text-muted, #64748b)',
                  textAlign: 'right',
                }}
              >
                {remainingLandmarkChars} characters remaining
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default LocationPickerField;
