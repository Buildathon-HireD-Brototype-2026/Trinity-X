import { GEOCODING_CONFIG } from '../config/geocodingConfig.js';

// In-memory cache per query for the session
const placeCheckCache = new Map();

let lastRequestTime = 0;
let pendingQueuePromise = Promise.resolve();

/**
 * Builds Google Maps search URL from a location string.
 */
export function buildGoogleMapsSearchUrl(query) {
  const q = (query || '').trim().replace(/\s+/g, ' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/**
 * Shorten Photon feature into readable place string:
 * name or road, area, city, state (no country, no postal duplicates).
 * Max 300 characters.
 */
export function shortenAddress(data) {
  if (!data) return '';

  let name = '';
  let road = '';
  let area = '';
  let city = '';
  let state = '';
  let displayName = '';

  if (data.properties) {
    const p = data.properties;
    name = p.name || '';
    road = p.street || '';
    area = p.district || p.locality || p.suburb || '';
    city = p.city || p.town || p.county || '';
    state = p.state || '';
  } else if (typeof data === 'string') {
    displayName = data;
  }

  const parts = [];

  const addToken = (token) => {
    if (!token) return;
    const clean = token.replace(/[\x00-\x1F\x7F]/g, '').trim();
    if (!clean) return;
    if (clean.toLowerCase() === 'india') return;
    if (/^\d{5,6}$/.test(clean)) return;

    const lower = clean.toLowerCase();
    if (!parts.some((p) => p.toLowerCase() === lower)) {
      parts.push(clean);
    }
  };

  addToken(name);
  if (road && road.toLowerCase() !== name.toLowerCase()) {
    addToken(road);
  }
  if (area && area.toLowerCase() !== name.toLowerCase() && area.toLowerCase() !== road.toLowerCase()) {
    addToken(area);
  }
  if (city && city.toLowerCase() !== area.toLowerCase()) {
    addToken(city);
  }
  if (state && state.toLowerCase() !== city.toLowerCase()) {
    addToken(state);
  }

  if (parts.length === 0 && displayName) {
    const rawTokens = displayName.split(',').map((t) => t.trim());
    for (const t of rawTokens) {
      addToken(t);
    }
  }

  let result = parts.join(', ');
  result = result.replace(/\s+/g, ' ').trim();
  result = result.replace(/[\x00-\x1F\x7F]/g, '');

  if (result.length > 300) {
    result = result.substring(0, 300).trim();
  }

  return result;
}

/**
 * Combines place text and optional landmark:
 * Format: "<place text> (<landmark>)"
 * Trimmed to 300 characters total (shortens landmark first, never cuts main place text).
 */
export function combinePlaceAndLandmark(placeText, landmark) {
  const cleanedPlace = (placeText || '').trim().replace(/\s+/g, ' ');
  const cleanedLandmark = (landmark || '').trim().replace(/\s+/g, ' ');

  if (!cleanedLandmark) {
    return cleanedPlace.slice(0, 300);
  }

  // If place text is already 297 chars or longer, landmark cannot fit with " ()"
  if (cleanedPlace.length >= 297) {
    return cleanedPlace.slice(0, 300);
  }

  const maxLandmarkLen = 300 - cleanedPlace.length - 3; // 3 chars for " (" and ")"
  const shortenedLandmark = cleanedLandmark.slice(0, Math.min(100, Math.max(0, maxLandmarkLen)));

  if (!shortenedLandmark) {
    return cleanedPlace;
  }

  return `${cleanedPlace} (${shortenedLandmark})`;
}

/**
 * Rate limiter ensuring at most 1 outbound request per second.
 */
async function scheduleRateLimitedRequest(requestFn) {
  const currentPromise = pendingQueuePromise.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    const waitTime = Math.max(0, GEOCODING_CONFIG.MIN_REQUEST_INTERVAL_MS - elapsed);

    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    lastRequestTime = Date.now();
    return requestFn();
  });

  pendingQueuePromise = currentPromise.catch(() => {});
  return currentPromise;
}

/**
 * Quiet place check with Photon.
 * Runs once after the user leaves the field (blur / Enter).
 * Timeout: 4 seconds.
 * Rate limit: at most 1 request per second.
 * Caches results per query.
 */
export async function checkPlaceWithPhoton(query, options = {}) {
  const trimmed = (query || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { found: false, error: 'Empty query' };
  }

  const cacheKey = trimmed.toLowerCase();
  if (placeCheckCache.has(cacheKey)) {
    return placeCheckCache.get(cacheKey);
  }

  const { signal: externalSignal, fetchFn = fetch } = options;

  const result = await scheduleRateLimitedRequest(async () => {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, GEOCODING_CONFIG.TIMEOUT_MS);

    const onExternalAbort = () => timeoutController.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new DOMException('Aborted', 'AbortError');
      }
      externalSignal.addEventListener('abort', onExternalAbort);
    }

    try {
      const bias = GEOCODING_CONFIG.LOCATION_BIAS;
      const url = `${GEOCODING_CONFIG.PHOTON_BASE_URL}/api/?q=${encodeURIComponent(
        trimmed
      )}&limit=1&lang=${GEOCODING_CONFIG.ACCEPT_LANGUAGE}&lat=${bias.lat}&lon=${bias.lon}&zoom=${
        bias.zoom
      }&location_bias_scale=${bias.scale}`;

      const res = await fetchFn(url, {
        signal: timeoutController.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return { found: false, error: `HTTP ${res.status}` };
      }

      const json = await res.json();
      const features = json.features || [];

      if (features.length > 0) {
        const placeName = features[0].properties?.name || trimmed;
        return { found: true, name: placeName };
      }

      return { found: false, reason: 'No results' };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        if (externalSignal?.aborted) {
          throw err;
        }
        return { found: false, error: 'Timeout after 4s' };
      }
      return { found: false, error: err.message || 'Network error' };
    } finally {
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  });

  placeCheckCache.set(cacheKey, result);
  return result;
}

/**
 * Reverse lookup for coordinates-only Google Maps links with Photon
 * GET https://photon.komoot.io/reverse?lat=<lat>&lon=<lon>&lang=en
 */
export async function reversePhotonCoordinates(lat, lon, options = {}) {
  const { signal, fetchFn = fetch } = options;
  const url = `${GEOCODING_CONFIG.PHOTON_BASE_URL}/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(
    lon
  )}&lang=${GEOCODING_CONFIG.ACCEPT_LANGUAGE}`;

  return scheduleRateLimitedRequest(async () => {
    try {
      const res = await fetchFn(url, {
        signal,
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        return null;
      }

      const json = await res.json();
      const features = json.features || [];
      if (features.length === 0) return null;

      const shortened = shortenAddress(features[0]);
      return shortened || null;
    } catch {
      return null;
    }
  });
}

/**
 * Clear cache for unit tests and session resets
 */
export function clearPlaceCheckCache() {
  placeCheckCache.clear();
  lastRequestTime = 0;
  pendingQueuePromise = Promise.resolve();
}
