import { GEOCODING_CONFIG } from '../config/geocodingConfig.js';

// In-memory caches to prevent redundant requests
const reverseCache = new Map();
const searchCache = new Map();

// Rate limiter state
let lastRequestTime = 0;
let pendingQueuePromise = Promise.resolve();

/**
 * Clean and shorten an address to a human-readable form:
 * name or road, area, city, state (no country, no postal duplicates).
 * Strictly caps at 300 characters.
 */
export function shortenAddress(data) {
  if (!data) return '';

  let addressObj = null;
  let displayName = '';
  let directName = '';

  if (typeof data === 'string') {
    displayName = data;
  } else if (typeof data === 'object') {
    addressObj = data.address || null;
    displayName = data.display_name || '';
    directName = data.name || '';
  }

  const parts = [];

  if (addressObj) {
    // 1. Primary place name or amenity or building
    const placeName =
      directName ||
      addressObj.amenity ||
      addressObj.building ||
      addressObj.shop ||
      addressObj.office ||
      addressObj.leisure ||
      addressObj.tourism ||
      addressObj.historic;

    if (placeName) {
      parts.push(placeName);
    }

    // 2. Road or street
    const road = addressObj.road || addressObj.street || addressObj.pedestrian || addressObj.path;
    if (road && !parts.some((p) => p.toLowerCase() === road.toLowerCase())) {
      parts.push(road);
    }

    // 3. Area, neighborhood or suburb
    const area =
      addressObj.suburb ||
      addressObj.neighbourhood ||
      addressObj.residential ||
      addressObj.subdistrict ||
      addressObj.locality;
    if (area && !parts.some((p) => p.toLowerCase() === area.toLowerCase())) {
      parts.push(area);
    }

    // 4. City, town or village
    const city =
      addressObj.city ||
      addressObj.town ||
      addressObj.village ||
      addressObj.municipality ||
      addressObj.county ||
      addressObj.state_district;
    if (city && !parts.some((p) => p.toLowerCase() === city.toLowerCase())) {
      parts.push(city);
    }

    // 5. State (no country, no postcode)
    const state = addressObj.state;
    if (state && !parts.some((p) => p.toLowerCase() === state.toLowerCase())) {
      parts.push(state);
    }
  }

  // Fallback to display_name cleaning if structured parts are empty or insufficient
  if (parts.length === 0 && displayName) {
    const rawTokens = displayName.split(',').map((t) => t.trim()).filter(Boolean);
    const cleanedTokens = rawTokens.filter((token) => {
      // Exclude country names like 'India'
      if (token.toLowerCase() === 'india') return false;
      // Exclude 5 or 6 digit postal codes (e.g. 682024 or 110001)
      if (/^\d{5,6}$/.test(token)) return false;
      return true;
    });

    // Deduplicate tokens
    const seen = new Set();
    for (const t of cleanedTokens) {
      const lower = t.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        parts.push(t);
      }
    }
  }

  let result = parts.join(', ');
  // Collapse whitespace
  result = result.replace(/\s+/g, ' ').trim();

  // Strip control characters
  result = result.replace(/[\x00-\x1F\x7F]/g, '');

  // Truncate to 300 chars max
  if (result.length > 300) {
    result = result.substring(0, 300).trim();
  }

  return result;
}

/**
 * Throttle queue ensuring at least MIN_REQUEST_INTERVAL_MS between outbound requests
 */
async function scheduleRateLimitedRequest(requestFn) {
  // Chain behind existing queue
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

  // Catch errors in queue chain so next requests still run
  pendingQueuePromise = currentPromise.catch(() => {});
  return currentPromise;
}

/**
 * Reverse geocode a latitude and longitude to a human-readable address
 */
export async function reverseGeocode(lat, lng, options = {}) {
  const { signal, fetchFn = fetch } = options;

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid coordinates for reverse geocoding');
  }

  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey);
  }

  const result = await scheduleRateLimitedRequest(async () => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const url = `${GEOCODING_CONFIG.NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&accept-language=${GEOCODING_CONFIG.ACCEPT_LANGUAGE}&countrycodes=${
      GEOCODING_CONFIG.DEFAULT_COUNTRY_CODES
    }`;

    const res = await fetchFn(url, {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Reverse geocoding failed with HTTP ${res.status}`);
    }

    const json = await res.json();
    const shortened = shortenAddress(json);
    return {
      raw: json,
      displayName: json.display_name || '',
      addressText: shortened || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
    };
  });

  reverseCache.set(cacheKey, result);
  return result;
}

/**
 * Search places by query text (runs only on explicit user search/enter)
 */
export async function searchPlaces(query, options = {}) {
  const { signal, fetchFn = fetch } = options;
  const trimmed = (query || '').trim();

  if (!trimmed) {
    return [];
  }

  const cacheKey = trimmed.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const results = await scheduleRateLimitedRequest(async () => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const url = `${GEOCODING_CONFIG.NOMINATIM_BASE_URL}/search?format=jsonv2&q=${encodeURIComponent(
      trimmed
    )}&limit=5&accept-language=${GEOCODING_CONFIG.ACCEPT_LANGUAGE}&countrycodes=${
      GEOCODING_CONFIG.DEFAULT_COUNTRY_CODES
    }`;

    const res = await fetchFn(url, {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Search places failed with HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!Array.isArray(json)) return [];

    return json.slice(0, 5).map((item) => ({
      placeId: item.place_id,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name || '',
      shortenedAddress: shortenAddress(item) || item.display_name,
    }));
  });

  searchCache.set(cacheKey, results);
  return results;
}

/**
 * Clear in-memory caches (useful in testing)
 */
export function clearGeocodingCache() {
  reverseCache.clear();
  searchCache.clear();
  lastRequestTime = 0;
  pendingQueuePromise = Promise.resolve();
}

/**
 * Reset rate limit timestamp for testing
 */
export function resetRateLimitTimestamp() {
  lastRequestTime = 0;
}
