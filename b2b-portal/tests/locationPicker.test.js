import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleMapsInput, buildGoogleMapsSearchUrl } from '../src/utils/googleMapsParser.js';
import {
  combinePlaceAndLandmark,
  checkPlaceWithPhoton,
  reversePhotonCoordinates,
  clearPlaceCheckCache,
} from '../src/utils/geocodingService.js';

test('Google Maps Parser: Plain text address input', () => {
  const input = 'Cyber City Tower C, DLF Phase 2, Gurugram';
  const result = parseGoogleMapsInput(input);
  assert.equal(result.success, true);
  assert.equal(result.type, 'plain_text');
  assert.equal(result.isLink, false);
  assert.equal(result.address, 'Cyber City Tower C, DLF Phase 2, Gurugram');
});

test('Google Maps Parser: /maps/place/ link extraction', () => {
  const url = 'https://www.google.com/maps/place/Infopark+Kochi/@9.9312,76.2673,17z/data=...';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.type, 'place_link');
  assert.equal(result.isLink, true);
  assert.equal(result.placeName, 'Infopark Kochi');
  assert.equal(result.lineMessage, 'Place: Infopark Kochi');
});

test('Google Maps Parser: /maps/search/?api=1&query= link extraction', () => {
  const url = 'https://www.google.com/maps/search/?api=1&query=Lulu+International+Shopping+Mall,+Kochi';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.type, 'place_link');
  assert.equal(result.isLink, true);
  assert.equal(result.placeName, 'Lulu International Shopping Mall, Kochi');
  assert.equal(result.lineMessage, 'Place: Lulu International Shopping Mall, Kochi');
});

test('Google Maps Parser: link with coordinates only', () => {
  const url = 'https://www.google.com/maps/search/?api=1&query=9.9312,76.2673';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.type, 'coordinates_link');
  assert.equal(result.isCoordinatesOnly, true);
  assert.equal(result.coordinates.lat, 9.9312);
  assert.equal(result.coordinates.lng, 76.2673);
});

test('Google Maps Parser: short link detection (maps.app.goo.gl and goo.gl/maps)', () => {
  const url1 = 'https://maps.app.goo.gl/AbCdEfGh1234';
  const res1 = parseGoogleMapsInput(url1);
  assert.equal(res1.success, false);
  assert.equal(res1.type, 'short_link');
  assert.equal(
    res1.lineMessage,
    'This is a short link. Please open it, copy the place name from Google Maps, and type it in the place box.'
  );

  const url2 = 'https://goo.gl/maps/ZxYwVu123';
  const res2 = parseGoogleMapsInput(url2);
  assert.equal(res2.success, false);
  assert.equal(res2.type, 'short_link');
});

test('Google Maps Parser: other website link rejection', () => {
  const url = 'https://www.example.com/location/kerala';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, false);
  assert.equal(result.type, 'invalid_link');
  assert.equal(result.lineMessage, 'Please paste a Google Maps link or type the place name.');
});

test('Google Maps Parser: HTML characters stripping and safety', () => {
  const htmlInput = '<script>alert("xss")</script>Gateway Hotel, Marine Drive';
  const result = parseGoogleMapsInput(htmlInput);
  assert.equal(result.success, true);
  assert.equal(result.address, 'alert("xss")Gateway Hotel, Marine Drive');
});

test('Google Maps Parser: empty and whitespace input handling', () => {
  const emptyRes1 = parseGoogleMapsInput('');
  assert.equal(emptyRes1.success, false);
  assert.equal(emptyRes1.type, 'empty');

  const emptyRes2 = parseGoogleMapsInput('    ');
  assert.equal(emptyRes2.success, false);
});

test('View on map URL Builder: Encodes plain text, special chars, Malayalam, and long text', () => {
  const plainUrl = buildGoogleMapsSearchUrl('Infopark Kochi');
  assert.equal(plainUrl, 'https://www.google.com/maps/search/?api=1&query=Infopark%20Kochi');

  const specialUrl = buildGoogleMapsSearchUrl('Lulu Mall & Hypermarket #4 + Phase-1');
  assert.equal(
    specialUrl,
    'https://www.google.com/maps/search/?api=1&query=Lulu%20Mall%20%26%20Hypermarket%20%234%20%2B%20Phase-1'
  );

  const malayalamText = 'ഇൻഫോപാർക്ക് കൊച്ചി';
  const malayalamUrl = buildGoogleMapsSearchUrl(malayalamText);
  assert.ok(malayalamUrl.includes(encodeURIComponent(malayalamText)));

  const longText = 'A'.repeat(400);
  const longUrl = buildGoogleMapsSearchUrl(longText);
  assert.equal(longUrl, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(longText)}`);
});

test('Coordinates link reverse lookup: Success and failure handling (Mocked)', async () => {
  // 1. Success case: returns shortened readable place text
  const mockFetchSuccess = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      features: [
        {
          properties: {
            name: 'Marine Drive Walkway',
            district: 'Ernakulam',
            city: 'Kochi',
            state: 'Kerala',
          },
        },
      ],
    }),
  });

  const resolved = await reversePhotonCoordinates(9.98, 76.28, { fetchFn: mockFetchSuccess });
  assert.ok(resolved);
  assert.ok(resolved.includes('Marine Drive Walkway'));
  assert.ok(resolved.includes('Kochi'));

  // 2. Failure case: returns null
  const mockFetchFailure = async () => ({
    ok: false,
    status: 500,
  });

  const failed = await reversePhotonCoordinates(9.98, 76.28, { fetchFn: mockFetchFailure });
  assert.equal(failed, null);
});

test('Stored Address: Never contains URLs, only clean place text and optional landmark', () => {
  const placeText = 'LuLu International Shopping Mall';
  const landmark = 'Near Gate 2';
  const combined = combinePlaceAndLandmark(placeText, landmark);

  // Stored string check
  assert.equal(combined, 'LuLu International Shopping Mall (Near Gate 2)');
  assert.equal(combined.includes('http://'), false);
  assert.equal(combined.includes('https://'), false);
  assert.equal(combined.includes('maps.google.com'), false);
  assert.ok(combined.length <= 300);
});

test('Landmark Combiner: Empty landmark preserves original place text and order continues', () => {
  const place = 'Cyber City Tower C, DLF Phase 2, Gurugram';
  assert.equal(combinePlaceAndLandmark(place, ''), place);
  assert.equal(combinePlaceAndLandmark(place, '   '), place);
  assert.equal(combinePlaceAndLandmark(place, null), place);
});

test('Landmark Combiner: Capped at 300 characters, shortens landmark first, never cuts main place text', () => {
  const mainPlace = 'A'.repeat(250);
  const longLandmark = 'B'.repeat(100);

  const combined = combinePlaceAndLandmark(mainPlace, longLandmark);
  assert.ok(combined.length <= 300);
  assert.ok(combined.startsWith(`${mainPlace} (`));
  assert.equal(combined.length, 300);

  // When place text is already 298 characters, landmark cannot fit, so place is preserved up to 300
  const veryLongPlace = 'C'.repeat(298);
  const result = combinePlaceAndLandmark(veryLongPlace, 'Landmark');
  assert.equal(result, veryLongPlace);
});

test('Quiet Photon Check: Found returns true with place name (Mocked)', async () => {
  clearPlaceCheckCache();
  let callCount = 0;

  const mockFetch = async () => {
    callCount++;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        features: [
          {
            properties: {
              name: 'LuLu International Shopping Mall',
            },
          },
        ],
      }),
    };
  };

  const result = await checkPlaceWithPhoton('Lulu Thiruvananthapuram', { fetchFn: mockFetch });
  assert.equal(callCount, 1);
  assert.equal(result.found, true);
  assert.equal(result.name, 'LuLu International Shopping Mall');

  // Cache hit should not invoke fetch a second time
  const cached = await checkPlaceWithPhoton('Lulu Thiruvananthapuram', { fetchFn: mockFetch });
  assert.equal(callCount, 1);
  assert.equal(cached.found, true);
});

test('Quiet Photon Check: Not found returns found false (Mocked)', async () => {
  clearPlaceCheckCache();

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ features: [] }),
  });

  const result = await checkPlaceWithPhoton('asdfgh nowhere', { fetchFn: mockFetch });
  assert.equal(result.found, false);
});

test('Quiet Photon Check: 4-second timeout handling', async () => {
  clearPlaceCheckCache();

  const mockFetchSlow = async (_url, options) => {
    return new Promise((resolve, reject) => {
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      }
    });
  };

  const result = await checkPlaceWithPhoton('Slow Place', { fetchFn: mockFetchSlow });
  assert.equal(result.found, false);
  assert.ok(result.error.includes('Timeout after 4s'));
});

test('Quiet Photon Check: Rate limit spacing (at most 1 request per second)', async () => {
  clearPlaceCheckCache();
  const callTimestamps = [];

  const mockFetch = async () => {
    callTimestamps.push(Date.now());
    return {
      ok: true,
      status: 200,
      json: async () => ({ features: [] }),
    };
  };

  const p1 = checkPlaceWithPhoton('Query One', { fetchFn: mockFetch });
  const p2 = checkPlaceWithPhoton('Query Two', { fetchFn: mockFetch });

  await Promise.all([p1, p2]);
  assert.equal(callTimestamps.length, 2);
  const elapsed = callTimestamps[1] - callTimestamps[0];
  assert.ok(elapsed >= 950, `Expected delay >= 950ms, got ${elapsed}ms`);
});

test('Location Validation: Required, max 300 chars, identical pickup/drop rejection', () => {
  const validateLocations = (pickup, drop) => {
    const errs = {};
    const trimmedPickup = (pickup || '').trim();
    const trimmedDrop = (drop || '').trim();

    if (!trimmedPickup) {
      errs.pickup_spot = 'Please select the pickup location.';
    } else if (trimmedPickup.length > 300) {
      errs.pickup_spot = 'Location is too long. Please shorten it.';
    }

    if (!trimmedDrop) {
      errs.dropoff_spot = 'Please select the drop location.';
    } else if (trimmedDrop.length > 300) {
      errs.dropoff_spot = 'Location is too long. Please shorten it.';
    }

    if (trimmedPickup && trimmedDrop && trimmedPickup.toLowerCase() === trimmedDrop.toLowerCase()) {
      errs.dropoff_spot = 'Pickup and drop locations must be different.';
    }

    return errs;
  };

  const missing = validateLocations('', '');
  assert.equal(missing.pickup_spot, 'Please select the pickup location.');
  assert.equal(missing.dropoff_spot, 'Please select the drop location.');

  const identical = validateLocations('Infopark Kochi', 'infopark kochi');
  assert.equal(identical.dropoff_spot, 'Pickup and drop locations must be different.');

  const tooLong = validateLocations('A'.repeat(301), 'B'.repeat(301));
  assert.equal(tooLong.pickup_spot, 'Location is too long. Please shorten it.');
  assert.equal(tooLong.dropoff_spot, 'Location is too long. Please shorten it.');

  const valid = validateLocations('Infopark Kochi', 'Lulu Mall Edappally');
  assert.equal(Object.keys(valid).length, 0);
});
