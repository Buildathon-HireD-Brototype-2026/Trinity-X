/**
 * Safe client-side Google Maps link and address parser.
 * Operates purely synchronously on pasted text/URL without making any network calls or using any Google API.
 */

export function parseGoogleMapsInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { success: false, error: 'Please enter or paste an address.' };
  }

  // 1. Strip control characters and sanitize
  const stripped = rawInput.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!stripped) {
    return { success: false, error: 'Please enter or paste an address.' };
  }

  const cleaned = stripped.replace(/\s+/g, ' ');

  // 2. Check if the input looks like a URL
  let parsedUrl = null;
  if (/^https?:\/\//i.test(cleaned)) {
    try {
      parsedUrl = new URL(cleaned);
    } catch {
      parsedUrl = null;
    }
  }

  // 3. If NOT a URL: treat as plain address text
  if (!parsedUrl) {
    // Check if user accidentally pasted an unrecognized URL scheme like "www.something.com" without https
    if (/^(www\.[a-z0-9-]+\.[a-z]{2,})/i.test(cleaned) && !cleaned.includes('google.')) {
      return {
        success: false,
        error: 'Please paste a Google Maps link or type the address.'
      };
    }

    // Strip any HTML tags to guarantee plain text
    const textWithoutHtml = cleaned.replace(/<[^>]*>/g, '').trim();
    const finalAddress = textWithoutHtml.slice(0, 300);

    if (!finalAddress) {
      return { success: false, error: 'Please enter or paste a valid address.' };
    }

    return {
      success: true,
      text: finalAddress,
      isLink: false,
      isCoordinatesOnly: false,
      warning: null
    };
  }

  // 4. Input IS a URL: inspect hostname and path
  const hostname = parsedUrl.hostname.toLowerCase();

  // Short links check
  if (hostname === 'maps.app.goo.gl' || hostname === 'goo.gl' || hostname.endsWith('.goo.gl')) {
    return {
      success: false,
      isShortLink: true,
      error: 'This is a short link. Please open it, copy the address from Google Maps, and paste the address here.'
    };
  }

  // Allowed Google Maps domains
  const isGoogleMapsHost =
    hostname === 'maps.google.com' ||
    hostname === 'www.google.com' ||
    hostname === 'google.com' ||
    hostname === 'www.google.co.in' ||
    hostname === 'google.co.in' ||
    hostname.endsWith('.google.com') ||
    hostname.endsWith('.google.co.in');

  if (!isGoogleMapsHost) {
    return {
      success: false,
      error: 'Please paste a Google Maps link or type the address.'
    };
  }

  const path = parsedUrl.pathname;
  // Must be a /maps path or maps.google.com sub-domain
  if (!path.startsWith('/maps') && !hostname.startsWith('maps.google.')) {
    return {
      success: false,
      error: 'Please paste a Google Maps link or type the address.'
    };
  }

  // 5. Extract readable place name or coordinates
  let placeText = null;

  // Pattern A: /maps/place/<name>/
  const placeMatch = path.match(/\/maps\/place\/([^/@]+)/);
  if (placeMatch && placeMatch[1]) {
    try {
      placeText = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    } catch {
      placeText = placeMatch[1].replace(/\+/g, ' ');
    }
  }

  // Pattern B: query parameter "query=" or "q="
  if (!placeText) {
    const qParam = parsedUrl.searchParams.get('query') || parsedUrl.searchParams.get('q');
    if (qParam) {
      try {
        placeText = decodeURIComponent(qParam.replace(/\+/g, ' '));
      } catch {
        placeText = qParam.replace(/\+/g, ' ');
      }
    }
  }

  // Pattern C: /maps/@lat,lng
  if (!placeText) {
    const atCoordMatch = path.match(/\/maps\/@(-?\d+\.\d+,-?\d+\.\d+)/);
    if (atCoordMatch && atCoordMatch[1]) {
      placeText = atCoordMatch[1];
    }
  }

  if (!placeText || !placeText.trim()) {
    return {
      success: false,
      error: 'Could not extract place name from Google Maps link. Please type the address.'
    };
  }

  // Clean extracted place text
  const cleanedPlaceText = placeText.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
  const finalPlaceText = cleanedPlaceText.slice(0, 300);

  // Check if coordinates only, e.g. "9.9312,76.2673" or "9.9312, 76.2673"
  const isCoordsOnly = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(finalPlaceText);

  return {
    success: true,
    text: finalPlaceText,
    isLink: true,
    isCoordinatesOnly: isCoordsOnly,
    warning: isCoordsOnly
      ? 'Coordinates detected. Please add a landmark or area name for clarity.'
      : null
  };
}

/**
 * Builds Google Maps search URL from a location string or default Kerala fallback.
 */
export function buildGoogleMapsSearchUrl(query) {
  const q = (query && query.trim()) ? query.trim() : 'Kerala, India';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
