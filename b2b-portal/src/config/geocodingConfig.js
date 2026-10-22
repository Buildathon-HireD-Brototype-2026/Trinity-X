/**
 * Photon Configuration
 * Centralized configuration for quiet place check.
 * Free public Photon API with 4s timeout and rate-limit controls.
 */

export const GEOCODING_CONFIG = {
  PHOTON_BASE_URL: 'https://photon.komoot.io',
  TIMEOUT_MS: 4000, // 4 seconds timeout
  MIN_REQUEST_INTERVAL_MS: 1000, // At most 1 request per second
  LOCATION_BIAS: {
    lat: 10.85,
    lon: 76.27,
    zoom: 7,
    scale: 0.4,
  },
  ACCEPT_LANGUAGE: 'en',
};
