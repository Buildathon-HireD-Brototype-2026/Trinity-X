/**
 * Geocoding and Map Configuration
 * Free Photon (Komoot) and OpenStreetMap / Nominatim configuration.
 * All URLs, coordinates, and rate limits centralized in one file.
 */

export const GEOCODING_CONFIG = {
  // Primary search & reverse service: Photon (high performance, autocomplete-friendly)
  PHOTON_BASE_URL: 'https://photon.komoot.io',

  // Fallback service: Nominatim
  NOMINATIM_BASE_URL: 'https://nominatim.openstreetmap.org',

  // Rate limiting & Debouncing
  MIN_REQUEST_INTERVAL_MS: 1000, // Strictly respect 1 req/sec server limit
  DEBOUNCE_TYPING_MS: 400, // 400ms debounce for search-as-you-type
  DEBOUNCE_DRAG_MS: 300, // 300ms debounce on pin drag end
  MIN_SEARCH_CHARS: 3, // Start search-as-you-type at 3 characters
  MAX_SUGGESTIONS: 6, // Show up to 6 suggestions

  // Kerala, India geographic center & soft bias
  DEFAULT_CENTER: [10.8505, 76.2711], // [lat, lng]
  DEFAULT_ZOOM: 11,
  LOCATION_BIAS: {
    lat: 10.85,
    lon: 76.27,
    zoom: 7,
    scale: 0.4, // Soft bias toward Kerala (does NOT exclude valid places)
  },

  // Localization & Attribution
  ACCEPT_LANGUAGE: 'en',
  DEFAULT_COUNTRY_CODES: 'in',
  ATTRIBUTION_HTML: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ATTRIBUTION_TEXT: 'Map data © OpenStreetMap contributors',
  PHOTON_CREDIT_TEXT: 'Search by Photon',
  USER_AGENT: 'HireD-B2B-Partner-Portal/1.0 (contact: support@hired.local)',
};
