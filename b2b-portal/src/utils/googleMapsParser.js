/**
 * Safe client-side Google Maps link and address parser.
 * Operates purely synchronously on pasted text/URL without making any network calls or using any Google API.
 * Never fetches URLs, never follows redirects, never renders pasted text as HTML, strips control characters.
 */

/**
 * Normalizes input text containing a potential Google Maps link:
 * - Trims whitespace
 * - Strips control characters and zero-width characters
 * - If text contains the same URL repeated (joined like https://xhttps://x, or separated by spaces/newlines), keeps one copy
 * - If text contains several different URLs or extra words, picks the first valid Google Maps URL and ignores the rest
 * - Collapses spaces
 */
export function normalizeLinkInput(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  // 1. Strip control characters and zero-width characters
  const stripped = rawText
    .replace(/[\x00-\x1F\x7F\u200B-\u200D\uFEFF]/g, '')
    .trim();

  if (!stripped) {
    return '';
  }

  // 2. Separate joined URLs (e.g. https://xhttps://x or https://xhttp://x or www.xhttps://x)
  const separated = stripped
    .replace(/([^\s:/])(https?:\/\/)/gi, '$1 $2')
    .replace(/([^\s:/])(www\.[a-z0-9-]+\.[a-z]{2,})/gi, '$1 $2');

  const tokens = separated.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return '';
  }

  const isValidGoogleMapsUrl = (token) => {
    let parsed;
    try {
      const isHttp = /^https?:\/\//i.test(token);
      parsed = new URL(isHttp ? token : `https://${token}`);
    } catch {
      return false;
    }

    const host = parsed.hostname.toLowerCase();
    const proto = parsed.protocol.toLowerCase();

    if (proto !== 'https:') {
      return false;
    }

    if (host === 'maps.app.goo.gl' || (host === 'goo.gl' && parsed.pathname.startsWith('/maps'))) {
      return true;
    }

    const isGoogleHost =
      host === 'maps.google.com' ||
      host === 'www.google.com' ||
      host === 'google.com' ||
      host === 'www.google.co.in' ||
      host === 'google.co.in' ||
      host.endsWith('.google.com') ||
      host.endsWith('.google.co.in');

    if (isGoogleHost && (parsed.pathname.startsWith('/maps') || host.startsWith('maps.google.'))) {
      return true;
    }

    return false;
  };

  // 3. If the text contains valid Google Maps URLs, pick the first one and ignore the rest
  const firstValidGoogleUrl = tokens.find(isValidGoogleMapsUrl);
  if (firstValidGoogleUrl) {
    return firstValidGoogleUrl;
  }

  // 4. If all tokens are identical URLs (e.g., duplicated non-Google URLs), keep one copy
  const firstToken = tokens[0];
  if (tokens.every((t) => t === firstToken)) {
    return firstToken;
  }

  // 5. Otherwise return collapsed spaces
  return tokens.join(' ');
}

export function parseGoogleMapsInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      success: false,
      type: 'empty',
      isLink: false,
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
      isLink: false,
      lineMessage: '',
      error: 'Please enter or paste an address.',
    };
  }

  const cleaned = stripped.replace(/\s+/g, ' ');

  // 2. Check if the input looks like a URL
  let parsedUrl = null;
  const isHttpUrl = /^https?:\/\//i.test(cleaned);
  const isWwwUrl = /^www\.[a-z0-9-]+\.[a-z]{2,}/i.test(cleaned);
  const isSchemeUrl = /^(javascript|data|file|ftp|blob):/i.test(cleaned);

  if (isHttpUrl || isWwwUrl || isSchemeUrl) {
    try {
      parsedUrl = new URL(isHttpUrl || isSchemeUrl ? cleaned : `https://${cleaned}`);
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
        isLink: false,
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

  // 4. Input IS a URL: inspect hostname and protocol
  const hostname = parsedUrl.hostname.toLowerCase();
  const protocol = parsedUrl.protocol.toLowerCase();

  // Accept Google Maps share links (maps.app.goo.gl or goo.gl/maps)
  // Must be https and exact hostname
  const isShareLink =
    protocol === 'https:' &&
    (hostname === 'maps.app.goo.gl' || (hostname === 'goo.gl' && parsedUrl.pathname.startsWith('/maps')));

  if (isShareLink) {
    return {
      success: true,
      type: 'share_link',
      isLink: true,
      isShareLink: true,
      rawUrl: cleaned,
      placeName: null,
      lineMessage: 'Link added.',
    };
  }

  // Allowed Google Maps full domains
  const isGoogleMapsHost =
    protocol === 'https:' &&
    (hostname === 'maps.google.com' ||
      hostname === 'www.google.com' ||
      hostname === 'google.com' ||
      hostname === 'www.google.co.in' ||
      hostname === 'google.co.in' ||
      hostname.endsWith('.google.com') ||
      hostname.endsWith('.google.co.in'));

  if (!isGoogleMapsHost) {
    return {
      success: false,
      type: 'invalid_link',
      isLink: true,
      rawUrl: cleaned,
      lineMessage: 'Please paste a Google Maps link or type the place name.',
      error: 'Please paste a Google Maps link or type the place name.',
    };
  }

  const path = parsedUrl.pathname;
  // Must be a /maps path or maps.google.com sub-domain
  if (!path.startsWith('/maps') && !hostname.startsWith('maps.google.')) {
    return {
      success: false,
      type: 'invalid_link',
      isLink: true,
      rawUrl: cleaned,
      lineMessage: 'Please paste a Google Maps link or type the place name.',
      error: 'Please paste a Google Maps link or type the place name.',
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
      isLink: true,
      rawUrl: cleaned,
      lineMessage: 'Please paste a Google Maps link or type the place name.',
      error: 'Could not extract place name from Google Maps link.',
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
      isLink: true,
      isCoordinatesOnly: true,
      rawUrl: cleaned,
      text: formattedCoordText,
      address: formattedCoordText,
      placeName: formattedCoordText,
      coordinates: coordinateMatch,
      lineMessage: `Place: ${formattedCoordText}`,
    };
  }

  return {
    success: true,
    type: 'place_link',
    isLink: true,
    isCoordinatesOnly: false,
    rawUrl: cleaned,
    text: finalPlaceText,
    address: finalPlaceText,
    placeName: finalPlaceText,
    lineMessage: `Place: ${finalPlaceText}`,
  };
}

/**
 * Builds Google Maps search URL from a location string or default Kerala fallback.
 */
export function buildGoogleMapsSearchUrl(query) {
  const q = query && query.trim() ? query.trim().replace(/\s+/g, ' ') : 'Kerala, India';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
