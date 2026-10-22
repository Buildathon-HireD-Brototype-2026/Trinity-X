import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoogleMapsInput, buildGoogleMapsSearchUrl } from '../src/utils/googleMapsParser.js';

test('Google Maps Parser: Plain text address input', () => {
  const input = 'Cyber City Tower C, DLF Phase 2, Gurugram';
  const result = parseGoogleMapsInput(input);
  assert.equal(result.success, true);
  assert.equal(result.text, 'Cyber City Tower C, DLF Phase 2, Gurugram');
  assert.equal(result.isLink, false);
});

test('Google Maps Parser: /maps/place/ link extraction', () => {
  const url = 'https://www.google.com/maps/place/Infopark+Kochi/@9.9312,76.2673,17z/data=...';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.text, 'Infopark Kochi');
  assert.equal(result.isCoordinatesOnly, false);
});

test('Google Maps Parser: /maps/search/?api=1&query= link extraction', () => {
  const url = 'https://www.google.com/maps/search/?api=1&query=Lulu+International+Shopping+Mall,+Kochi';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.text, 'Lulu International Shopping Mall, Kochi');
});

test('Google Maps Parser: link with coordinates only', () => {
  const url = 'https://www.google.com/maps/search/?api=1&query=9.9312,76.2673';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.isCoordinatesOnly, true);
  assert.ok(result.warning.includes('Coordinates detected'));
});

test('Google Maps Parser: short link detection (maps.app.goo.gl)', () => {
  const url = 'https://maps.app.goo.gl/AbCdEfGh1234';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, false);
  assert.equal(result.isShortLink, true);
  assert.ok(result.error.includes('This is a short link'));
});

test('Google Maps Parser: non-Google link rejection', () => {
  const url = 'https://www.example.com/location/kerala';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, false);
  assert.equal(result.error, 'Please paste a Google Maps link or type the address.');
});

test('Google Maps Parser: very long text truncation at 300 chars', () => {
  const longInput = 'A'.repeat(400);
  const result = parseGoogleMapsInput(longInput);
  assert.equal(result.success, true);
  assert.equal(result.text.length, 300);
});

test('Google Maps Parser: HTML characters stripping', () => {
  const htmlInput = '<script>alert("xss")</script>Gateway Hotel, Marine Drive';
  const result = parseGoogleMapsInput(htmlInput);
  assert.equal(result.success, true);
  assert.equal(result.text, 'alert("xss")Gateway Hotel, Marine Drive');
});

test('Google Maps Parser: empty and whitespace input rejection', () => {
  const emptyRes1 = parseGoogleMapsInput('');
  assert.equal(emptyRes1.success, false);

  const emptyRes2 = parseGoogleMapsInput('    ');
  assert.equal(emptyRes2.success, false);
});

test('Google Maps Search URL Builder: Fallback and encoding', () => {
  const fallbackUrl = buildGoogleMapsSearchUrl('');
  assert.equal(fallbackUrl, 'https://www.google.com/maps/search/?api=1&query=Kerala%2C%20India');

  const customUrl = buildGoogleMapsSearchUrl('Infopark Kochi');
  assert.equal(customUrl, 'https://www.google.com/maps/search/?api=1&query=Infopark%20Kochi');
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

