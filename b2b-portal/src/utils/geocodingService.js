import { GEOCODING_CONFIG } from '../config/geocodingConfig.js';

// In-memory session caches to eliminate redundant requests
const reverseCache = new Map();
const searchCache = new Map();

// Rate limiter state
let lastRequestTime = 0;
let pendingQueuePromise = Promise.resolve();

/**
 * Clean and shorten an address or place feature to a human-readable form:
 * name or road, area, city, state (no country, no postal duplicates).
 * Strictly caps at 300 characters.
 */
export function shortenAddress(data) {
  if (!data) return '';

  let name = '';
  let road = '';
  let area = '';
  let city = '';
  let state = '';
  let displayName = '';

  // Case 1: Photon GeoJSON Feature or properties object
  if (data.properties || (data.name && data.country)) {
    const p = data.properties || data;
    name = p.name || '';
    road = p.street || '';
    area = p.district || p.locality || p.suburb || '';
    city = p.city || p.town || p.county || '';
    state = p.state || '';
  }
  // Case 2: Nominatim structured object
  else if (data.address) {
    const a = data.address;
    name =
      data.name ||
      a.amenity ||
      a.building ||
      a.shop ||
      a.office ||
      a.leisure ||
      a.tourism ||
      a.historic ||
      '';
    road = a.road || a.street || a.pedestrian || a.path || '';
    area = a.suburb || a.neighbourhood || a.residential || a.subdistrict || a.locality || '';
    city = a.city || a.town || a.village || a.municipality || a.county || a.state_district || '';
    state = a.state || '';
    displayName = data.display_name || '';
  }
  // Case 3: Raw string
  else if (typeof data === 'string') {
    displayName = data;
  }

  const parts = [];

  // Helper to add unique tokens
  const addToken = (token) => {
    if (!token) return;
    const clean = token.replace(/[\x00-\x1F\x7F]/g, '').trim();
    if (!clean) return;
    // Disallow country 'India'
    if (clean.toLowerCase() === 'india') return;
    // Disallow 5-6 digit postal codes
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

  // Fallback to display_name cleaning if structured tokens are empty
  if (parts.length === 0 && displayName) {
    const rawTokens = displayName.split(',').map((t) => t.trim()).filter(Boolean);
    for (const t of rawTokens) {
      addToken(t);
    }
  }

  let result = parts.join(', ');
  // Collapse whitespace
  result = result.replace(/\s+/g, ' ').trim();

  // Truncate to 300 chars max
  if (result.length > 300) {
    result = result.substring(0, 300).trim();
  }

  return result;
}

/**
 * Format a Photon GeoJSON feature into a suggestion object
 */
export function formatPhotonFeature(feature) {
  if (!feature || !feature.properties || !feature.geometry) return null;

  const p = feature.properties;
  const coords = feature.geometry.coordinates || [0, 0];
  const lng = parseFloat(coords[0]);
  const lat = parseFloat(coords[1]);

  const primaryText = p.name || p.street || p.district || p.city || 'Location';

  const secondaryParts = [];
  if (p.street && p.street.toLowerCase() !== primaryText.toLowerCase()) secondaryParts.push(p.street);
  if (p.district && p.district.toLowerCase() !== primaryText.toLowerCase()) secondaryParts.push(p.district);
  if (p.city && !secondaryParts.some((s) => s.toLowerCase() === p.city.toLowerCase())) secondaryParts.push(p.city);
  if (p.state && !secondaryParts.some((s) => s.toLowerCase() === p.state.toLowerCase())) secondaryParts.push(p.state);

  const secondaryText = secondaryParts.filter(Boolean).join(', ');
  const shortenedAddress = shortenAddress(feature);

  return {
    placeId: p.osm_id ? `${p.osm_type || 'W'}${p.osm_id}` : `${lat},${lng}`,
    lat,
    lng,
    primaryText,
    secondaryText,
    shortenedAddress: shortenedAddress || primaryText,
    displayName: shortenedAddress || primaryText,
  };
}

/**
 * Rate-limiting scheduler ensuring at least MIN_REQUEST_INTERVAL_MS between outbound requests
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
 * Internal single Photon search attempt
 */
async function fetchPhotonSearch(query, options = {}) {
  const { signal, fetchFn = fetch } = options;
  const bias = GEOCODING_CONFIG.LOCATION_BIAS;

  const url = `${GEOCODING_CONFIG.PHOTON_BASE_URL}/api?q=${encodeURIComponent(
    query
  )}&limit=${GEOCODING_CONFIG.MAX_SUGGESTIONS}&lang=${GEOCODING_CONFIG.ACCEPT_LANGUAGE}&lat=${bias.lat}&lon=${
    bias.lon
  }&zoom=${bias.zoom}&location_bias_scale=${bias.scale}`;

  const res = await fetchFn(url, {
    signal,
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Photon search failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  const features = json.features || [];
  return features.map(formatPhotonFeature).filter(Boolean);
}

/**
 * Fallback search using Nominatim
 */
async function fetchNominatimSearch(query, options = {}) {
  const { signal, fetchFn = fetch } = options;

  const url = `${GEOCODING_CONFIG.NOMINATIM_BASE_URL}/search?format=jsonv2&q=${encodeURIComponent(
    query
  )}&limit=${GEOCODING_CONFIG.MAX_SUGGESTIONS}&accept-language=${
    GEOCODING_CONFIG.ACCEPT_LANGUAGE
  }&countrycodes=${GEOCODING_CONFIG.DEFAULT_COUNTRY_CODES}`;

  const res = await fetchFn(url, {
    signal,
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Nominatim search failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!Array.isArray(json)) return [];

  return json.map((item) => {
    const shortened = shortenAddress(item);
    const tokens = (item.display_name || '').split(',').map((t) => t.trim());
    return {
      placeId: item.place_id ? String(item.place_id) : `${item.lat},${item.lon}`,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      primaryText: tokens[0] || shortened,
      secondaryText: tokens.slice(1, 4).join(', '),
      shortenedAddress: shortened,
      displayName: item.display_name || shortened,
    };
  });
}

/**
 * Primary search function with Photon, smart retries, and Nominatim fallback.
 * - Cache per query for the session
 * - Rate limit: <= 1 req/sec server limit
 * - Smart retries: retry with "<query>, Kerala", retry first 3 words if > 3 words
 * - Fallback chain: fallback to Nominatim if Photon fails
 */
export async function searchPlaces(query, options = {}) {
  const trimmed = (query || '').trim();
  if (!trimmed || trimmed.length < GEOCODING_CONFIG.MIN_SEARCH_CHARS) {
    return [];
  }

  const cacheKey = trimmed.toLowerCase();
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }

  const { signal, fetchFn = fetch } = options;

  const results = await scheduleRateLimitedRequest(async () => {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    let items = [];
    let photonFailed = false;

    // 1. Try Photon primary search
    try {
      items = await fetchPhotonSearch(trimmed, { signal, fetchFn });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      photonFailed = true;
    }

    // 2. Smart retries if Photon succeeded but returned 0 results
    if (!photonFailed && items.length === 0) {
      // Retry A: "<query>, Kerala"
      if (!trimmed.toLowerCase().includes('kerala')) {
        try {
          items = await fetchPhotonSearch(`${trimmed}, Kerala`, { signal, fetchFn });
        } catch (err) {
          if (err.name === 'AbortError') throw err;
        }
      }

      // Retry B: if > 3 words, try first 3 words
      if (items.length === 0) {
        const words = trimmed.split(/\s+/);
        if (words.length > 3) {
          const firstThree = words.slice(0, 3).join(' ');
          try {
            items = await fetchPhotonSearch(firstThree, { signal, fetchFn });
          } catch (err) {
            if (err.name === 'AbortError') throw err;
          }
        }
      }
    }

    // 3. Fallback chain: if Photon failed, try Nominatim
    if (photonFailed) {
      try {
        items = await fetchNominatimSearch(trimmed, { signal, fetchFn });
      } catch (nomErr) {
        if (nomErr.name === 'AbortError') throw nomErr;
        // If both failed, return empty array (UI will show polite message)
        items = [];
      }
    }

    return items.slice(0, GEOCODING_CONFIG.MAX_SUGGESTIONS);
  });

  searchCache.set(cacheKey, results);
  return results;
}

/**
 * Reverse geocoding (Photon /reverse first, Nominatim /reverse fallback)
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

    let addressText = '';

    // 1. Try Photon /reverse first
    try {
      const photonUrl = `${GEOCODING_CONFIG.PHOTON_BASE_URL}/reverse?lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`;

      const res = await fetchFn(photonUrl, {
        signal,
        headers: { 'Accept': 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.features && json.features.length > 0) {
          addressText = shortenAddress(json.features[0]);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') throw err;
    }

    // 2. Fallback to Nominatim /reverse if Photon yielded nothing
    if (!addressText) {
      try {
        const nomUrl = `${GEOCODING_CONFIG.NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lng)}&accept-language=${GEOCODING_CONFIG.ACCEPT_LANGUAGE}&countrycodes=${
          GEOCODING_CONFIG.DEFAULT_COUNTRY_CODES
        }`;

        const res = await fetchFn(nomUrl, {
          signal,
          headers: { 'Accept': 'application/json' },
        });

        if (res.ok) {
          const json = await res.json();
          addressText = shortenAddress(json);
        }
      } catch (nomErr) {
        if (nomErr.name === 'AbortError') throw nomErr;
      }
    }

    if (!addressText) {
      throw new Error('Reverse geocoding failed on both Photon and Nominatim');
    }

    return {
      lat,
      lng,
      addressText,
    };
  });

  reverseCache.set(cacheKey, result);
  return result;
}

/**
 * Helper to check if string contains coordinates like "10.0158, 76.3418"
 */
export function parseCoordinatesString(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.trim().match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[3]);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

/**
 * Clear in-memory caches (for testing and resets)
 */
export function clearGeocodingCache() {
  reverseCache.clear();
  searchCache.clear();
  lastRequestTime = 0;
  pendingQueuePromise = Promise.resolve();
}
