import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleMapsInput, buildGoogleMapsSearchUrl } from '../src/utils/googleMapsParser.js';
import {
  shortenAddress,
  formatPhotonFeature,
  searchPlaces,
  reverseGeocode,
  parseCoordinatesString,
  clearGeocodingCache,
} from '../src/utils/geocodingService.js';

test('Google Maps Parser: Plain text address input', () => {
  const input = 'Cyber City Tower C, DLF Phase 2, Gurugram';
  const result = parseGoogleMapsInput(input);
  assert.equal(result.success, true);
  assert.equal(result.type, 'plain_text');
  assert.equal(result.address, 'Cyber City Tower C, DLF Phase 2, Gurugram');
  assert.equal(result.isLink, false);
});

test('Google Maps Parser: /maps/place/ link extraction', () => {
  const url = 'https://www.google.com/maps/place/Infopark+Kochi/@9.9312,76.2673,17z/data=...';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.type, 'place_link');
  assert.equal(result.placeName, 'Infopark Kochi');
  assert.equal(result.lineMessage, 'Place: Infopark Kochi');
});

test('Google Maps Parser: /maps/search/?api=1&query= link extraction', () => {
  const url = 'https://www.google.com/maps/search/?api=1&query=Lulu+International+Shopping+Mall,+Kochi';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.type, 'place_link');
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
  assert.equal(result.lineMessage, 'Place: 9.9312, 76.2673');
});

test('Google Maps Parser: short link detection (maps.app.goo.gl and goo.gl/maps)', () => {
  const url1 = 'https://maps.app.goo.gl/AbCdEfGh1234';
  const res1 = parseGoogleMapsInput(url1);
  assert.equal(res1.success, false);
  assert.equal(res1.type, 'short_link');
  assert.ok(res1.lineMessage.includes('This is a short link'));

  const url2 = 'https://goo.gl/maps/ZxYwVu123';
  const res2 = parseGoogleMapsInput(url2);
  assert.equal(res2.success, false);
  assert.equal(res2.type, 'short_link');
});

test('Google Maps Parser: non-Google link rejection', () => {
  const url = 'https://www.example.com/location/kerala';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, false);
  assert.equal(result.type, 'invalid_link');
  assert.equal(result.lineMessage, 'Please paste a Google Maps link.');
});

test('Google Maps Parser: very long text truncation at 300 chars', () => {
  const longInput = 'A'.repeat(400);
  const result = parseGoogleMapsInput(longInput);
  assert.equal(result.success, true);
  assert.equal(result.address.length, 300);
});

test('Google Maps Parser: HTML characters stripping', () => {
  const htmlInput = '<script>alert("xss")</script>Gateway Hotel, Marine Drive';
  const result = parseGoogleMapsInput(htmlInput);
  assert.equal(result.success, true);
  assert.equal(result.address, 'alert("xss")Gateway Hotel, Marine Drive');
});

test('Google Maps Parser: empty and whitespace input rejection', () => {
  const emptyRes1 = parseGoogleMapsInput('');
  assert.equal(emptyRes1.success, false);
  assert.equal(emptyRes1.type, 'empty');

  const emptyRes2 = parseGoogleMapsInput('    ');
  assert.equal(emptyRes2.success, false);
  assert.equal(emptyRes2.type, 'empty');
});

test('Coordinate String Parser: Valid and invalid coordinate detection', () => {
  const valid1 = parseCoordinatesString('10.0158, 76.3418');
  assert.ok(valid1);
  assert.equal(valid1.lat, 10.0158);
  assert.equal(valid1.lng, 76.3418);

  const valid2 = parseCoordinatesString('-9.93, 76.26');
  assert.ok(valid2);
  assert.equal(valid2.lat, -9.93);
  assert.equal(valid2.lng, 76.26);

  assert.equal(parseCoordinatesString('Lulu Mall Kochi'), null);
  assert.equal(parseCoordinatesString('190.5, 76.0'), null); // Latitude > 90 invalid
  assert.equal(parseCoordinatesString(''), null);
});

test('Photon Feature Parser & Address Shortener: Full and missing fields', () => {
  const fullFeature = {
    geometry: { coordinates: [76.2711, 10.8505] },
    properties: {
      osm_id: 12345,
      osm_type: 'N',
      name: 'LuLu International Shopping Mall',
      street: 'Edappally Bypass',
      district: 'Edappally',
      city: 'Kochi',
      state: 'Kerala',
      country: 'India',
      postcode: '682024',
    },
  };

  const parsed = formatPhotonFeature(fullFeature);
  assert.ok(parsed);
  assert.equal(parsed.lat, 10.8505);
  assert.equal(parsed.lng, 76.2711);
  assert.equal(parsed.primaryText, 'LuLu International Shopping Mall');
  assert.ok(parsed.secondaryText.includes('Edappally'));
  assert.ok(parsed.secondaryText.includes('Kochi'));
  assert.equal(parsed.shortenedAddress.includes('India'), false);
  assert.equal(parsed.shortenedAddress.includes('682024'), false);
  assert.ok(parsed.shortenedAddress.length <= 300);

  // Missing fields feature
  const partialFeature = {
    geometry: { coordinates: [76.95, 8.52] },
    properties: {
      name: 'Varkala Cliff',
      state: 'Kerala',
    },
  };
  const parsedPartial = formatPhotonFeature(partialFeature);
  assert.equal(parsedPartial.primaryText, 'Varkala Cliff');
  assert.equal(parsedPartial.shortenedAddress, 'Varkala Cliff, Kerala');
});

test('Search Places: Photon success with caching (Mocked Network)', async () => {
  clearGeocodingCache();
  let photonCalls = 0;

  const mockFetch = async (url) => {
    if (url.includes('photon.komoot.io/api')) {
      photonCalls++;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            {
              geometry: { coordinates: [76.35, 10.01] },
              properties: {
                osm_id: 111,
                name: 'Infopark Kochi',
                district: 'Kakkanad',
                city: 'Kochi',
                state: 'Kerala',
              },
            },
          ],
        }),
      };
    }
    throw new Error('Unexpected URL');
  };

  const res1 = await searchPlaces('Infopark', { fetchFn: mockFetch });
  assert.equal(photonCalls, 1);
  assert.equal(res1.length, 1);
  assert.equal(res1[0].primaryText, 'Infopark Kochi');

  // Second search with same query should hit session cache
  const res2 = await searchPlaces('Infopark', { fetchFn: mockFetch });
  assert.equal(photonCalls, 1);
  assert.equal(res2[0].primaryText, 'Infopark Kochi');
});

test('Search Places: Smart retry when Photon returns 0 results', async () => {
  clearGeocodingCache();
  const queriedUrls = [];

  const mockFetch = async (url) => {
    queriedUrls.push(url);
    // Return empty on initial query, return result on retry with ", Kerala"
    if (url.includes('Technopark%2C%20Kerala') || url.includes('Technopark, Kerala')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            {
              geometry: { coordinates: [76.88, 8.55] },
              properties: {
                name: 'Technopark',
                city: 'Thiruvananthapuram',
                state: 'Kerala',
              },
            },
          ],
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ features: [] }),
    };
  };

  const results = await searchPlaces('Technopark', { fetchFn: mockFetch });
  assert.ok(queriedUrls.length >= 2);
  assert.ok(queriedUrls.some((u) => u.includes('Technopark%2C%20Kerala')));
  assert.equal(results.length, 1);
  assert.equal(results[0].primaryText, 'Technopark');
});

test('Search Places: Fallback chain when Photon fails (429 / 5xx) to Nominatim', async () => {
  clearGeocodingCache();
  let nominatimCalled = false;

  const mockFetch = async (url) => {
    if (url.includes('photon.komoot.io')) {
      return { ok: false, status: 429, statusText: 'Too Many Requests' };
    }
    if (url.includes('nominatim.openstreetmap.org/search')) {
      nominatimCalled = true;
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            place_id: 999,
            lat: '9.98',
            lon: '76.28',
            display_name: 'Marine Drive, Kochi, Ernakulam, Kerala, India',
          },
        ],
      };
    }
    throw new Error('Unexpected URL');
  };

  const results = await searchPlaces('Marine Drive', { fetchFn: mockFetch });
  assert.equal(nominatimCalled, true);
  assert.equal(results.length, 1);
  assert.ok(results[0].primaryText.includes('Marine Drive'));
});

test('Search Places: Both Photon and Nominatim fail gracefully', async () => {
  clearGeocodingCache();

  const mockFetch = async () => {
    return { ok: false, status: 500, statusText: 'Server Error' };
  };

  const results = await searchPlaces('Offline Query', { fetchFn: mockFetch });
  assert.deepEqual(results, []);
});

test('Reverse Geocoding: Photon primary with Nominatim fallback (Mocked)', async () => {
  clearGeocodingCache();
  let photonReverseCalled = false;

  const mockFetch = async (url) => {
    if (url.includes('photon.komoot.io/reverse')) {
      photonReverseCalled = true;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          features: [
            {
              properties: {
                name: 'Kollam Beach',
                city: 'Kollam',
                state: 'Kerala',
              },
            },
          ],
        }),
      };
    }
    throw new Error('Unexpected URL');
  };

  const res = await reverseGeocode(8.89, 76.6, { fetchFn: mockFetch });
  assert.equal(photonReverseCalled, true);
  assert.equal(res.addressText, 'Kollam Beach, Kollam, Kerala');
});

test('Location Validation: Form constraints and identical rejection', () => {
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

  const errsIdentical = validateLocations('Infopark Kochi', 'infopark kochi');
  assert.equal(errsIdentical.dropoff_spot, 'Pickup and drop locations must be different.');

  const errsValid = validateLocations('Infopark Kochi', 'Lulu Mall Edappally');
  assert.equal(Object.keys(errsValid).length, 0);
});
