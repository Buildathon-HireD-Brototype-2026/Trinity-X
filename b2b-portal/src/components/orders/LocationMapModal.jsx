import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, X, Check, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { GEOCODING_CONFIG } from '../../config/geocodingConfig.js';
import {
  reverseGeocode,
  searchPlaces,
  parseCoordinatesString,
} from '../../utils/geocodingService.js';
import { parseGoogleMapsInput } from '../../utils/googleMapsParser.js';

// Custom SVG Pin Icon for Leaflet map - 100% self-contained without asset 404s
const mapPinIcon = L.divIcon({
  className: 'hired-leaflet-marker',
  html: `
    <div style="
      position: relative;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #2563eb;
      color: #ffffff;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: #ffffff;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

// Map Controller for resizing and animating center
function MapController({ center }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.setView(center, Math.max(map.getZoom(), 14), { animate: true });
    }
  }, [center, map]);

  return null;
}

// Map Click and Marker Drag Handler with 300ms drag debounce
function MapInteraction({ position, onPositionChange }) {
  const dragTimeoutRef = useRef(null);

  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      icon={mapPinIcon}
      eventHandlers={{
        dragend(e) {
          const latlng = e.target.getLatLng();
          if (dragTimeoutRef.current) {
            clearTimeout(dragTimeoutRef.current);
          }
          // Debounce drag end by 300ms per requirements
          dragTimeoutRef.current = setTimeout(() => {
            onPositionChange(latlng.lat, latlng.lng);
          }, GEOCODING_CONFIG.DEBOUNCE_DRAG_MS);
        },
      }}
    />
  );
}

export function LocationMapModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Choose on map',
  initialAddress = '',
}) {
  const [position, setPosition] = useState(GEOCODING_CONFIG.DEFAULT_CENTER);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '');
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [editableAddress, setEditableAddress] = useState('');

  // Search-as-you-type state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const modalRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchAbortRef = useRef(null);
  const reverseAbortRef = useRef(null);
  const searchDebounceTimerRef = useRef(null);
  const searchRequestIdRef = useRef(0);

  // Reverse geocoding handler (Photon /reverse first, Nominatim fallback)
  const handleReverseLookup = useCallback(async (lat, lng) => {
    if (reverseAbortRef.current) {
      reverseAbortRef.current.abort();
    }
    const controller = new AbortController();
    reverseAbortRef.current = controller;

    setIsFetchingAddress(true);
    setFetchError(false);

    try {
      const res = await reverseGeocode(lat, lng, { signal: controller.signal });
      const address = res.addressText;
      setSelectedAddress(address);
      setEditableAddress(address);
      setIsFetchingAddress(false);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setIsFetchingAddress(false);
      setFetchError(true);
    }
  }, []);

  const handlePositionChange = (lat, lng) => {
    setPosition([lat, lng]);
    handleReverseLookup(lat, lng);
  };

  // Keyboard accessibility: Escape and Arrow navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        if (showSuggestions) {
          setShowSuggestions(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowDown' && showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp' && showSuggestions && suggestions.length > 0) {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, showSuggestions, suggestions]);

  // Initial geocoding or address sync when opening modal
  useEffect(() => {
    if (isOpen) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchFeedback('');
      setActiveSuggestionIndex(-1);

      if (initialAddress) {
        setSelectedAddress(initialAddress);
        setEditableAddress(initialAddress);
        setSearchQuery(initialAddress);

        // Pre-locate initial address
        searchPlaces(initialAddress)
          .then((res) => {
            if (res && res.length > 0) {
              setPosition([res[0].lat, res[0].lng]);
            }
          })
          .catch(() => {});
      } else {
        setPosition(GEOCODING_CONFIG.DEFAULT_CENTER);
        handleReverseLookup(GEOCODING_CONFIG.DEFAULT_CENTER[0], GEOCODING_CONFIG.DEFAULT_CENTER[1]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Core Search Execution (called by debounced typing or explicit Search click)
  const executeSearch = useCallback(
    async (text) => {
      const query = (text || '').trim();
      if (!query) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSearchFeedback('');
        setIsSearching(false);
        return;
      }

      // Check 1: Is query raw coordinates (e.g. "10.0158, 76.3418")?
      const coords = parseCoordinatesString(query);
      if (coords) {
        setPosition([coords.lat, coords.lng]);
        handleReverseLookup(coords.lat, coords.lng);
        setSuggestions([]);
        setShowSuggestions(false);
        setSearchFeedback('');
        setIsSearching(false);
        return;
      }

      // Check 2: Is query a pasted Google Maps link?
      const parsedGoogle = parseGoogleMapsInput(query);
      if (parsedGoogle.isLink) {
        if (parsedGoogle.isCoordinatesOnly && parsedGoogle.coordinates) {
          setPosition([parsedGoogle.coordinates.lat, parsedGoogle.coordinates.lng]);
          handleReverseLookup(parsedGoogle.coordinates.lat, parsedGoogle.coordinates.lng);
          setSuggestions([]);
          setShowSuggestions(false);
          setSearchFeedback('');
          setIsSearching(false);
          return;
        } else if (parsedGoogle.placeName) {
          // Use extracted place name for search
          return executeSearch(parsedGoogle.placeName);
        }
      }

      // Need minimum characters for text search
      if (query.length < GEOCODING_CONFIG.MIN_SEARCH_CHARS) {
        setSuggestions([]);
        setShowSuggestions(false);
        setSearchFeedback('');
        setIsSearching(false);
        return;
      }

      // Cancel previous in-flight request
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortRef.current = controller;

      const currentReqId = ++searchRequestIdRef.current;
      setIsSearching(true);
      setSearchFeedback('');

      try {
        const results = await searchPlaces(query, { signal: controller.signal });

        // Ignore stale responses if user typed further
        if (currentReqId !== searchRequestIdRef.current) return;

        setIsSearching(false);
        if (results.length === 0) {
          setSuggestions([]);
          setShowSuggestions(true);
          setSearchFeedback('No places found. Try adding the town or district name, or tap the map to place the pin.');
        } else {
          setSuggestions(results);
          setShowSuggestions(true);
          setSearchFeedback('');
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (currentReqId !== searchRequestIdRef.current) return;

        setIsSearching(false);
        setSuggestions([]);
        setShowSuggestions(true);
        setSearchFeedback('No places found. Try adding the town or district name, or tap the map to place the pin.');
      }
    },
    [handleReverseLookup]
  );

  // Search-as-you-type input change handler (debounced 400ms)
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    if (val.trim().length >= GEOCODING_CONFIG.MIN_SEARCH_CHARS) {
      searchDebounceTimerRef.current = setTimeout(() => {
        executeSearch(val);
      }, GEOCODING_CONFIG.DEBOUNCE_TYPING_MS);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchFeedback('');
      setIsSearching(false);
    }
  };

  // Submit on Enter or Search Button
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    // If an item is active in the list with Arrow keys, select it
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
      handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      return;
    }

    executeSearch(searchQuery);
  };

  // Select suggestion: moves map/pin and sets address directly without waiting
  const handleSelectSuggestion = (item) => {
    setPosition([item.lat, item.lng]);
    const chosenAddress = item.shortenedAddress || item.displayName;
    setSelectedAddress(chosenAddress);
    setEditableAddress(chosenAddress);
    setShowSuggestions(false);
    setSuggestions([]);
    setSearchQuery('');
    setSearchFeedback('');
  };

  const handleConfirm = () => {
    const finalVal = editableAddress.trim() || selectedAddress.trim();
    if (finalVal) {
      onConfirm(finalVal, position[0], position[1]);
    }
    onClose();
  };

  if (!isOpen) return null;

  const lat = position[0].toFixed(5);
  const lng = position[1].toFixed(5);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
      ref={modalRef}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          borderRadius: 'var(--radius-lg, 12px)',
          backgroundColor: 'var(--bg-surface, #ffffff)',
          color: 'var(--text-primary, #1e293b)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} color="var(--primary, #2563eb)" aria-hidden="true" />
            <h2 id="map-modal-title" style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close map"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm, 6px)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar with Search-As-You-Type */}
        <div
          style={{
            position: 'relative',
            padding: '0.875rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
            zIndex: 1000,
          }}
        >
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder="Search place, town, landmark or coordinates in Kerala..."
                value={searchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                style={{
                  height: '42px',
                  paddingLeft: '1rem',
                  paddingRight: '2.5rem',
                  fontSize: '0.875rem',
                }}
                aria-autocomplete="list"
                aria-controls="location-suggestions-list"
              />
              {isSearching && (
                <div
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--primary, #2563eb)',
                  }}
                >
                  <Loader2 size={16} className="spin" />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSearching}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                height: '42px',
                padding: '0 1.25rem',
                fontSize: '0.875rem',
                minWidth: '95px',
                justifyContent: 'center',
              }}
            >
              <Search size={16} />
              <span>Search</span>
            </button>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && (
            <div
              id="location-suggestions-list"
              role="listbox"
              style={{
                position: 'absolute',
                top: 'calc(100% - 2px)',
                left: '1.25rem',
                right: '1.25rem',
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--bg-surface, #ffffff)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.18)',
                zIndex: 2000,
              }}
            >
              {isSearching && suggestions.length === 0 && (
                <div
                  style={{
                    padding: '0.875rem 1rem',
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted, #64748b)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Loader2 size={15} className="spin" />
                  <span>Searching...</span>
                </div>
              )}

              {suggestions.map((item, idx) => {
                const isActive = idx === activeSuggestionIndex;
                return (
                  <button
                    key={item.placeId || `${item.lat},${item.lng}-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.625rem',
                      width: '100%',
                      minHeight: '48px', // Large tap targets for mobile
                      padding: '0.65rem 0.875rem',
                      border: 'none',
                      borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                      background: isActive ? 'var(--bg-muted, #f1f5f9)' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--text-primary, #1e293b)',
                    }}
                    onMouseEnter={() => setActiveSuggestionIndex(idx)}
                  >
                    <MapPin
                      size={17}
                      color="var(--primary, #2563eb)"
                      style={{ flexShrink: 0, marginTop: '2px' }}
                      aria-hidden="true"
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: 'var(--text-primary, #0f172a)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.primaryText}
                      </div>
                      {item.secondaryText && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted, #64748b)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px',
                          }}
                        >
                          {item.secondaryText}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {searchFeedback && suggestions.length === 0 && !isSearching && (
                <div
                  style={{
                    padding: '0.875rem 1rem',
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary, #475569)',
                    lineHeight: '1.4',
                  }}
                >
                  {searchFeedback}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map View Area */}
        <div style={{ position: 'relative', height: '360px', width: '100%', backgroundColor: '#e2e8f0' }}>
          <MapContainer
            center={position}
            zoom={GEOCODING_CONFIG.DEFAULT_ZOOM}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution={GEOCODING_CONFIG.ATTRIBUTION_HTML}
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={position} />
            <MapInteraction position={position} onPositionChange={handlePositionChange} />
          </MapContainer>
        </div>

        {/* Status & Address Area */}
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            backgroundColor: 'var(--bg-muted, #f8fafc)',
            fontSize: '0.8125rem',
          }}
        >
          <div aria-live="polite">
            {isFetchingAddress ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary, #2563eb)' }}>
                <Loader2 size={16} className="spin" />
                <span>Finding address...</span>
              </div>
            ) : fetchError ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger, #ef4444)' }}>
                <AlertCircle size={16} />
                <span>Could not find the address. You can type it yourself.</span>
              </div>
            ) : (
              <div>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Selected: </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                  {editableAddress || selectedAddress || 'No location selected'}
                </span>
              </div>
            )}
          </div>

          {/* Editable fallback address input */}
          <div style={{ marginTop: '0.5rem' }}>
            <input
              type="text"
              className="form-control"
              value={editableAddress}
              maxLength={300}
              placeholder="Confirm or edit address text..."
              onChange={(e) => setEditableAddress(e.target.value)}
              style={{
                height: '36px',
                fontSize: '0.8125rem',
                backgroundColor: 'var(--bg-surface, #ffffff)',
              }}
              aria-label="Editable location address"
            />
          </div>

          {/* Attribution and Google Maps Link Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted, #64748b)',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{GEOCODING_CONFIG.ATTRIBUTION_TEXT}</span>
              <span>•</span>
              <span style={{ fontStyle: 'italic' }}>{GEOCODING_CONFIG.PHOTON_CREDIT_TEXT}</span>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--primary, #2563eb)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: 500,
              }}
            >
              <span>View on Google Maps</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            backgroundColor: 'var(--bg-surface, #ffffff)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ height: '40px', padding: '0 1.25rem', fontSize: '0.875rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!editableAddress.trim() && !selectedAddress.trim()}
            style={{
              height: '40px',
              padding: '0 1.25rem',
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Check size={16} />
            <span>Confirm location</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationMapModal;
