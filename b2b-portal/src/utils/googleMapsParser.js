/**
 * Safe client-side Google Maps link and address parser.
 * Operates purely synchronously on pasted text/URL without making any network calls or using any Google API.
 * Never fetches URLs, never follows redirects, never renders pasted text as HTML, strips control characters.
 */

export function parseGoogleMapsInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      success: false,
      type: 'empty',
      lineMessage: '',
      error: 'Please enter or paste an address.',
    };
  }

  // 1. Strip control characters and sanitize
  const stripped = rawInput.replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!stripped) {
    return {
      success: false,
      type: 'empty',
      lineMessage: '',
      error: 'Please enter or paste an address.',
    };
  }

  const cleaned = stripped.replace(/\s+/g, ' ');

  // 2. Check if the input looks like a URL
  let parsedUrl = null;
  const isHttpUrl = /^https?:\/\//i.test(cleaned);
  const isWwwUrl = /^www\.[a-z0-9-]+\.[a-z]{2,}/i.test(cleaned);

  if (isHttpUrl || isWwwUrl) {
    try {
      parsedUrl = new URL(isHttpUrl ? cleaned : `https://${cleaned}`);
    } catch {
      parsedUrl = null;
    }
  }

  // 3. If NOT a URL: treat as plain address text
  if (!parsedUrl) {
    // Strip HTML tags to guarantee plain text
    const textWithoutHtml = cleaned.replace(/<[^>]*>/g, '').trim();
    const finalAddress = textWithoutHtml.slice(0, 300);

    if (!finalAddress) {
      return {
        success: false,
        type: 'empty',
        lineMessage: '',
        error: 'Please enter or paste a valid address.',
      };
    }

    return {
      success: true,
      type: 'plain_text',
      text: finalAddress,
      address: finalAddress,
      isLink: false,
      lineMessage: '',
    };
  }

  // 4. Input IS a URL: inspect hostname
  const hostname = parsedUrl.hostname.toLowerCase();

  // Short links check (maps.app.goo.gl, goo.gl/maps)
  if (
    hostname === 'maps.app.goo.gl' ||
    hostname === 'goo.gl' ||
    hostname.endsWith('.goo.gl') ||
    (hostname.includes('google.') && parsedUrl.pathname.startsWith('/maps') && hostname.startsWith('goo.gl'))
  ) {
    return {
      success: false,
      type: 'short_link',
      isShortLink: true,
      lineMessage:
        'This is a short link. Please open it, copy the address from Google Maps, and paste the address in the box above.',
      error:
        'This is a short link. Please open it, copy the address from Google Maps, and paste the address in the box above.',
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
      type: 'invalid_link',
      lineMessage: 'Please paste a Google Maps link.',
      error: 'Please paste a Google Maps link.',
    };
  }

  const path = parsedUrl.pathname;
  // Must be a /maps path or maps.google.com sub-domain
  if (!path.startsWith('/maps') && !hostname.startsWith('maps.google.')) {
    return {
      success: false,
      type: 'invalid_link',
      lineMessage: 'Please paste a Google Maps link.',
      error: 'Please paste a Google Maps link.',
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
  let coordinateMatch = null;
  if (!placeText) {
    const atCoordMatch = path.match(/\/maps\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atCoordMatch) {
      coordinateMatch = {
        lat: parseFloat(atCoordMatch[1]),
        lng: parseFloat(atCoordMatch[2]),
      };
      placeText = `${atCoordMatch[1]}, ${atCoordMatch[2]}`;
    }
  }

  // Check if placeText itself is coordinate format (e.g. q=9.9312,76.2673)
  if (placeText && !coordinateMatch) {
    const coordRegex = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
    const m = placeText.trim().match(coordRegex);
    if (m) {
      coordinateMatch = {
        lat: parseFloat(m[1]),
        lng: parseFloat(m[3]),
      };
    }
  }

  if (!placeText || !placeText.trim()) {
    return {
      success: false,
      type: 'invalid_link',
      lineMessage: 'Please paste a Google Maps link.',
      error: 'Could not extract place name from Google Maps link. Please type the address.',
    };
  }

  // Clean extracted place text
  const cleanedPlaceText = placeText.replace(/<[^>]*>/g, '').trim().replace(/\s+/g, ' ');
  const finalPlaceText = cleanedPlaceText.slice(0, 300);

  if (coordinateMatch) {
    const formattedCoordText = `${coordinateMatch.lat}, ${coordinateMatch.lng}`;
    return {
      success: true,
      type: 'coordinates_link',
      text: formattedCoordText,
      address: formattedCoordText,
      placeName: formattedCoordText,
      isLink: true,
      isCoordinatesOnly: true,
      coordinates: coordinateMatch,
      lineMessage: `Place: ${formattedCoordText}`,
    };
  }

  return {
    success: true,
    type: 'place_link',
    text: finalPlaceText,
    address: finalPlaceText,
    placeName: finalPlaceText,
    isLink: true,
    isCoordinatesOnly: false,
    lineMessage: `Place: ${finalPlaceText}`,
  };
}

/**
 * Builds Google Maps search URL from a location string or default Kerala fallback.
 */
export function buildGoogleMapsSearchUrl(query) {
  const q = query && query.trim() ? query.trim() : 'Kerala, India';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
