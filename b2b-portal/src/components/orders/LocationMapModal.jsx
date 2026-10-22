import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, X, Check, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { GEOCODING_CONFIG } from '../../config/geocodingConfig';
import { reverseGeocode, searchPlaces } from '../../utils/geocodingService';

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

// Map Controller for resizing and moving center
function MapController({ center }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size after modal transitions into view
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

// Map Click and Marker Drag Handler
function MapInteraction({ position, onPositionChange }) {
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
          onPositionChange(latlng.lat, latlng.lng);
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const modalRef = useRef(null);
  const searchInputRef = useRef(null);
  const activeAbortControllerRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Auto-focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Initial geocoding or address sync when opening
  useEffect(() => {
    if (isOpen) {
      if (initialAddress) {
        setSelectedAddress(initialAddress);
        setEditableAddress(initialAddress);
        setSearchQuery(initialAddress);
        // Automatically attempt to find the initial address coordinates if provided
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

  // Reverse geocoding handler with cancellation of previous in-flight request
  const handleReverseLookup = useCallback(async (lat, lng) => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

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

  // Search places handler (only runs on explicit Search click or Enter key)
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const results = await searchPlaces(query);
      setIsSearching(false);
      if (results.length === 0) {
        setSearchError('No places found for this search. Try a nearby town or area.');
      } else {
        setSearchResults(results);
      }
    } catch {
      setIsSearching(false);
      setSearchError('Search failed. Please check your connection.');
    }
  };

  const handleSelectSearchResult = (item) => {
    setPosition([item.lat, item.lng]);
    setSelectedAddress(item.shortenedAddress);
    setEditableAddress(item.shortenedAddress);
    setSearchResults([]);
    setSearchQuery('');
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
        padding: '1rem',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '92vh',
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

        {/* Search Bar */}
        <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control"
                placeholder="Search place, town or landmark in Kerala, India..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  height: '42px',
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  fontSize: '0.875rem',
                }}
              />
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
              {isSearching ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
              <span>Search</span>
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div
              style={{
                marginTop: '0.5rem',
                maxHeight: '160px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 8px)',
                background: 'var(--bg-surface, #ffffff)',
              }}
            >
              {searchResults.map((item) => (
                <button
                  key={item.placeId || `${item.lat},${item.lng}`}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: 'none',
                    borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary, #1e293b)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-muted, #f8fafc)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <MapPin size={16} color="var(--primary, #2563eb)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.shortenedAddress}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>{item.displayName}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchError && (
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: 'var(--danger, #ef4444)' }}>
              {searchError}
            </p>
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
                <span>Could not find the address. Please try again or type it.</span>
              </div>
            ) : (
              <div>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>Selected: </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                  {editableAddress || selectedAddress || 'No location selected'}
                </span>
              </div>
            )}
          </div>

          {/* Editable fallback address input if address needs quick typing/tweaking */}
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
            <span>{GEOCODING_CONFIG.ATTRIBUTION_TEXT}</span>
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
