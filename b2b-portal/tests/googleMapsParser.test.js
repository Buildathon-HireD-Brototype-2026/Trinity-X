import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleMapsInput, buildGoogleMapsSearchUrl } from '../src/utils/googleMapsParser.js';
import {
  shortenAddress,
  reverseGeocode,
  searchPlaces,
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
  assert.equal(result.isCoordinatesOnly, false);
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
  assert.equal(
    res1.lineMessage,
    'This is a short link. Please open it, copy the address from Google Maps, and paste the address in the box above.'
  );

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

test('Google Maps Search URL Builder: Fallback and encoding', () => {
  const fallbackUrl = buildGoogleMapsSearchUrl('');
  assert.equal(fallbackUrl, 'https://www.google.com/maps/search/?api=1&query=Kerala%2C%20India');

  const customUrl = buildGoogleMapsSearchUrl('Infopark Kochi');
  assert.equal(customUrl, 'https://www.google.com/maps/search/?api=1&query=Infopark%20Kochi');
});

test('Address Shortener: Structured Nominatim response formatting', () => {
  const nominatimMock = {
    name: 'Lulu Mall',
    display_name: 'Lulu Mall, Edappally Bypass, Edappally, Kochi, Ernakulam, Kerala, 682024, India',
    address: {
      amenity: 'Lulu Mall',
      road: 'Edappally Bypass',
      suburb: 'Edappally',
      city: 'Kochi',
      state_district: 'Ernakulam',
      state: 'Kerala',
      postcode: '682024',
      country: 'India',
      country_code: 'in',
    },
  };

  const shortened = shortenAddress(nominatimMock);
  // Must include name, road, suburb, city, state
  assert.ok(shortened.includes('Lulu Mall'));
  assert.ok(shortened.includes('Edappally Bypass'));
  assert.ok(shortened.includes('Edappally'));
  assert.ok(shortened.includes('Kochi'));
  assert.ok(shortened.includes('Kerala'));
  // Must NOT include country or postal code
  assert.equal(shortened.includes('India'), false);
  assert.equal(shortened.includes('682024'), false);
  assert.ok(shortened.length <= 300);
});

test('Address Shortener: Display name fallback without country or postal duplicates', () => {
  const rawDisplayName = 'Technopark Phase 1, Kazhakkoottam, Thiruvananthapuram, Kerala, 695581, India';
  const shortened = shortenAddress(rawDisplayName);

  assert.ok(shortened.includes('Technopark Phase 1'));
  assert.ok(shortened.includes('Kazhakkoottam'));
  assert.ok(shortened.includes('Thiruvananthapuram'));
  assert.ok(shortened.includes('Kerala'));
  assert.equal(shortened.includes('India'), false);
  assert.equal(shortened.includes('695581'), false);
  assert.ok(shortened.length <= 300);
});

test('Address Shortener: Truncation at 300 chars max', () => {
  const hugeAddress = {
    display_name: 'Long Landmark Name '.repeat(30) + 'Kochi, Kerala, India',
  };
  const shortened = shortenAddress(hugeAddress);
  assert.ok(shortened.length <= 300);
});

test('Geocoder Rate Limiter & Cache: Mocks network and respects in-memory cache', async () => {
  clearGeocodingCache();
  let fetchCallCount = 0;

  // Mock fetch - NEVER calls real Nominatim in unit tests
  const mockFetch = async (url) => {
    fetchCallCount++;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        display_name: 'Marine Drive, Ernakulam, Kochi, Kerala, 682011, India',
        address: {
          road: 'Marine Drive',
          suburb: 'Ernakulam',
          city: 'Kochi',
          state: 'Kerala',
          country: 'India',
        },
      }),
    };
  };

  // First request: network called once
  const res1 = await reverseGeocode(9.9816, 76.2799, { fetchFn: mockFetch });
  assert.equal(fetchCallCount, 1);
  assert.ok(res1.addressText.includes('Marine Drive'));
  assert.equal(res1.addressText.includes('India'), false);

  // Second request for the same coordinates: served from cache, no network call
  const res2 = await reverseGeocode(9.9816, 76.2799, { fetchFn: mockFetch });
  assert.equal(fetchCallCount, 1);
  assert.equal(res2.addressText, res1.addressText);
});

test('Geocoder Rate Limiter: Search places caching and result parsing', async () => {
  clearGeocodingCache();
  let searchCallCount = 0;

  const mockSearchFetch = async () => {
    searchCallCount++;
    return {
      ok: true,
      status: 200,
      json: async () => [
        {
          place_id: 101,
          lat: '9.9312',
          lon: '76.2673',
          display_name: 'Infopark Kochi, Kakkanad, Ernakulam, Kerala, India',
          address: {
            road: 'Infopark Expressway',
            suburb: 'Kakkanad',
            city: 'Kochi',
            state: 'Kerala',
            country: 'India',
          },
        },
      ],
    };
  };

  const results1 = await searchPlaces('Infopark', { fetchFn: mockSearchFetch });
  assert.equal(searchCallCount, 1);
  assert.equal(results1.length, 1);
  assert.equal(results1[0].lat, 9.9312);
  assert.equal(results1[0].lng, 76.2673);
  assert.ok(results1[0].shortenedAddress.includes('Kochi'));

  // Cached query should not trigger another fetch
  const results2 = await searchPlaces('Infopark', { fetchFn: mockSearchFetch });
  assert.equal(searchCallCount, 1);
  assert.equal(results2.length, 1);
});

test('Location Validation: identical pickup and drop rejection and length constraints', () => {
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

  const errsMissing = validateLocations('', '');
  assert.equal(errsMissing.pickup_spot, 'Please select the pickup location.');
  assert.equal(errsMissing.dropoff_spot, 'Please select the drop location.');

  const errsIdentical = validateLocations('Infopark Kochi', 'infopark kochi');
  assert.equal(errsIdentical.dropoff_spot, 'Pickup and drop locations must be different.');

  const errsTooLong = validateLocations('A'.repeat(301), 'B'.repeat(301));
  assert.equal(errsTooLong.pickup_spot, 'Location is too long. Please shorten it.');
  assert.equal(errsTooLong.dropoff_spot, 'Location is too long. Please shorten it.');

  const valid = validateLocations('Infopark Kochi', 'Lulu Mall Edappally');
  assert.equal(Object.keys(valid).length, 0);
});
