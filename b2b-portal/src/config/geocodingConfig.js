/**
 * Geocoding and Map Configuration
 * Free OpenStreetMap and Nominatim configuration
 * No Google API keys or billing required.
 */

export const GEOCODING_CONFIG = {
  NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',
  MIN_REQUEST_INTERVAL_MS: 1000, // Strictly respect Nominatim usage policy (max 1 req/sec)
  DEFAULT_CENTER: [10.8505, 76.2711], // Kerala, India [lat, lng]
  DEFAULT_ZOOM: 11,
  DEFAULT_COUNTRY_CODES: 'in',
  ACCEPT_LANGUAGE: 'en',
  ATTRIBUTION_HTML: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ATTRIBUTION_TEXT: 'Map data © OpenStreetMap contributors',
  USER_AGENT: 'HireD-B2B-Partner-Portal/1.0',
};
