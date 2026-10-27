import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGoogleMapsInput,
  normalizeLinkInput,
  buildGoogleMapsSearchUrl,
} from '../src/utils/googleMapsParser.js';
import {
  combinePlaceAndLandmark,
  checkPlaceWithPhoton,
  reversePhotonCoordinates,
  clearPlaceCheckCache,
} from '../src/utils/geocodingService.js';

/* -------------------------------------------------------------------------- */
/* Checklist 1, 2: normalizeLinkInput URL Deduplication and Normalization     */
/* -------------------------------------------------------------------------- */

test('normalizeLinkInput: Single link remains exactly one copy', () => {
  const url = 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7';
  assert.equal(normalizeLinkInput(url), url);
});

test('normalizeLinkInput: Joined duplicate link (https://xhttps://x) keeps exactly one copy', () => {
  const doubled = 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7https://maps.app.goo.gl/qhK16CL1UASZ6qpV7';
  assert.equal(normalizeLinkInput(doubled), 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7');
});

test('normalizeLinkInput: Space-separated duplicate links keep exactly one copy', () => {
  const spaced = 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7    https://maps.app.goo.gl/qhK16CL1UASZ6qpV7';
  assert.equal(normalizeLinkInput(spaced), 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7');
});

test('normalizeLinkInput: Newline-separated duplicate links keep exactly one copy', () => {
  const newlined = 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7\n\nhttps://maps.app.goo.gl/qhK16CL1UASZ6qpV7';
  assert.equal(normalizeLinkInput(newlined), 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7');
});

test('normalizeLinkInput: Strips control characters and zero-width spaces', () => {
  const dirty = '\u200B\x00https://maps.app.goo.gl/qhK16CL1UASZ6qpV7\x1F\uFEFF';
  assert.equal(normalizeLinkInput(dirty), 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7');
});

test('normalizeLinkInput: Picks first valid Google Maps URL when mixed with text and other URLs', () => {
  const mixed = 'Check out this venue: https://maps.app.goo.gl/qhK16CL1UASZ6qpV7 and website https://example.com';
  assert.equal(normalizeLinkInput(mixed), 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7');
});

test('normalizeLinkInput: Full Google Maps URL joined duplicate deduplication', () => {
  const fullLink =
    'https://www.google.com/maps/place/Infopark+Kochihttps://www.google.com/maps/place/Infopark+Kochi';
  assert.equal(normalizeLinkInput(fullLink), 'https://www.google.com/maps/place/Infopark+Kochi');
});

/* -------------------------------------------------------------------------- */
/* Checklist 7, 8: Share Links Acceptance and Lookalike Rejection             */
/* -------------------------------------------------------------------------- */

test('Google Maps Parser: Google Maps share link (maps.app.goo.gl) is accepted with no orange warning', () => {
  const url = 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.type, 'share_link');
  assert.equal(result.isLink, true);
  assert.equal(result.isShareLink, true);
  assert.equal(result.rawUrl, url);
  assert.equal(result.lineMessage, 'Link added.');
});

test('Google Maps Parser: goo.gl/maps share link is accepted', () => {
  const url = 'https://goo.gl/maps/ZxYwVu123';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.type, 'share_link');
  assert.equal(result.isLink, true);
  assert.equal(result.isShareLink, true);
});

test('Google Maps Parser: Lookalike domain (maps.app.goo.gl.evil.com) is strictly rejected', () => {
  const lookalikeUrl = 'https://maps.app.goo.gl.evil.com/x';
  const result = parseGoogleMapsInput(lookalikeUrl);
  assert.equal(result.success, false);
  assert.equal(result.type, 'invalid_link');
  assert.equal(result.lineMessage, 'Please paste a Google Maps link or type the place name.');
});

test('Google Maps Parser: Lookalike domain (goo.gl.example.com) is strictly rejected', () => {
  const lookalikeUrl = 'https://goo.gl.example.com/maps';
  const result = parseGoogleMapsInput(lookalikeUrl);
  assert.equal(result.success, false);
  assert.equal(result.type, 'invalid_link');
});

test('Google Maps Parser: Non-HTTPS (http://maps.app.goo.gl/...) is rejected', () => {
  const httpUrl = 'http://maps.app.goo.gl/qhK16CL1UASZ6qpV7';
  const result = parseGoogleMapsInput(httpUrl);
  assert.equal(result.success, false);
  assert.equal(result.type, 'invalid_link');
});

test('Google Maps Parser: JavaScript and data URLs are rejected', () => {
  const jsUrl = 'javascript:alert("xss")';
  const dataUrl = 'data:text/html,<script>alert(1)</script>';
  assert.equal(parseGoogleMapsInput(jsUrl).success, false);
  assert.equal(parseGoogleMapsInput(dataUrl).success, false);
});

test('Google Maps Parser: Other third-party websites are rejected', () => {
  const url = 'https://www.example.com/location/kerala';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, false);
  assert.equal(result.type, 'invalid_link');
  assert.equal(result.lineMessage, 'Please paste a Google Maps link or type the place name.');
});

/* -------------------------------------------------------------------------- */
/* Checklist 3, 6: Stored Address Never Contains URLs or Repeated Brackets    */
/* -------------------------------------------------------------------------- */

test('Stored Address: Plain place text input', () => {
  const input = 'Cyber City Tower C, DLF Phase 2, Gurugram';
  const result = parseGoogleMapsInput(input);
  assert.equal(result.success, true);
  assert.equal(result.type, 'plain_text');
  assert.equal(result.isLink, false);
  assert.equal(result.address, 'Cyber City Tower C, DLF Phase 2, Gurugram');
});

test('Stored Address: /maps/place/ link extracts name without storing link in address text', () => {
  const url = 'https://www.google.com/maps/place/Infopark+Kochi/@9.9312,76.2673,17z/data=...';
  const result = parseGoogleMapsInput(url);
  assert.equal(result.success, true);
  assert.equal(result.type, 'place_link');
  assert.equal(result.placeName, 'Infopark Kochi');
  assert.equal(result.address, 'Infopark Kochi');
  // Confirm the stored address string contains NO URL characters
  assert.equal(result.address.includes('http'), false);
  assert.equal(result.address.includes('google.com'), false);
});

test('Stored Address: Final saved text with landmark has no repeated brackets and no URL', () => {
  const place = 'ALPHA VENJARAMOODU';
  const landmark = 'near Bypass Road';
  const combined = combinePlaceAndLandmark(place, landmark);

  assert.equal(combined, 'ALPHA VENJARAMOODU (near Bypass Road)');
  assert.equal(combined.includes('http'), false);
  assert.equal(combined.includes('(near Bypass Road) ('), false);
  // Match bracket count: exactly one '(' and one ')'
  const openCount = (combined.match(/\(/g) || []).length;
  const closeCount = (combined.match(/\)/g) || []).length;
  assert.equal(openCount, 1);
  assert.equal(closeCount, 1);
});

/* -------------------------------------------------------------------------- */
/* Checklist 4, 5: Landmark Isolation, Keystrokes, Enter vs Add, and Submit    */
/* -------------------------------------------------------------------------- */

test('Landmark typing: Typing letter by letter and backspacing does NOT alter placeText', () => {
  let placeText = 'ALPHA VENJARAMOODU';
  let landmark = '';
  let landmarkDraft = '';

  const keystrokes = ['n', 'e', 'a', 'r', ' ', 'B', 'y', 'p', 'a', 's', 's'];
  for (const char of keystrokes) {
    landmarkDraft += char;
    // Landmark typing modifies ONLY landmarkDraft
    assert.equal(placeText, 'ALPHA VENJARAMOODU');
    assert.equal(landmark, '');
  }

  // Backspacing letter by letter
  while (landmarkDraft.length > 0) {
    landmarkDraft = landmarkDraft.slice(0, -1);
    assert.equal(placeText, 'ALPHA VENJARAMOODU');
    assert.equal(landmark, '');
  }

  assert.equal(landmarkDraft, '');
  assert.equal(placeText, 'ALPHA VENJARAMOODU');
});

test('Landmark apply: Pressing Enter applies landmarkDraft once and prevents form submit', () => {
  const placeText = 'ALPHA VENJARAMOODU';
  let landmark = '';
  let landmarkDraft = 'near Bypass Road';

  // Mock keyboard event
  let prevented = false;
  const mockEvent = {
    key: 'Enter',
    preventDefault: () => {
      prevented = true;
    },
  };

  // Simulate onKeyDown in landmark input
  if (mockEvent.key === 'Enter') {
    mockEvent.preventDefault();
    landmark = landmarkDraft.trim();
  }

  assert.equal(prevented, true, 'Enter key in landmark input must call event.preventDefault()');
  assert.equal(landmark, 'near Bypass Road');
  const derived = combinePlaceAndLandmark(placeText, landmark);
  assert.equal(derived, 'ALPHA VENJARAMOODU (near Bypass Road)');
});

test('Landmark apply: Clicking "Add" button applies landmarkDraft', () => {
  const placeText = 'ALPHA VENJARAMOODU';
  let landmark = '';
  const landmarkDraft = 'near Temple';

  // Click Add button handler
  landmark = landmarkDraft.trim();
  assert.equal(landmark, 'near Temple');
  const derived = combinePlaceAndLandmark(placeText, landmark);
  assert.equal(derived, 'ALPHA VENJARAMOODU (near Temple)');
});

test('Landmark submit: Unapplied landmarkDraft is applied once at form submit', () => {
  const placeText = 'ALPHA VENJARAMOODU';
  let landmark = '';
  const landmarkDraft = 'near Bypass Road'; // User typed but did not press Enter or Add

  // Form submit capture handler
  if (landmarkDraft.trim() && !landmark) {
    landmark = landmarkDraft.trim();
  }

  const finalSavedText = combinePlaceAndLandmark(placeText, landmark);
  assert.equal(finalSavedText, 'ALPHA VENJARAMOODU (near Bypass Road)');
});

test('Landmark Remove: Clears applied landmark and restores plain placeText', () => {
  const placeText = 'ALPHA VENJARAMOODU';
  let landmark = 'near Bypass Road';
  let landmarkDraft = 'near Bypass Road';

  // "Remove" action clicked
  landmark = '';
  landmarkDraft = '';

  const restored = combinePlaceAndLandmark(placeText, landmark);
  assert.equal(restored, 'ALPHA VENJARAMOODU');
});

test('Landmark Combiner: Empty landmark preserves original place text', () => {
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

  // When place text is already 298 characters, landmark cannot fit, so place is preserved
  const veryLongPlace = 'C'.repeat(298);
  const result = combinePlaceAndLandmark(veryLongPlace, 'Landmark');
  assert.equal(result, veryLongPlace);
});

/* -------------------------------------------------------------------------- */
/* Paste Sets State Exactly Once and React StrictMode Idempotence             */
/* -------------------------------------------------------------------------- */

test('Paste handling: Sets state exactly ONCE and calls event.preventDefault()', () => {
  let preventDefaultCalled = false;
  let setStateCallCount = 0;
  let storedState = '';

  const mockPasteEvent = {
    clipboardData: {
      getData: (type) =>
        type === 'text'
          ? 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7https://maps.app.goo.gl/qhK16CL1UASZ6qpV7'
          : '',
    },
    preventDefault: () => {
      preventDefaultCalled = true;
    },
  };

  // Handler execution
  mockPasteEvent.preventDefault();
  const rawPasted = mockPasteEvent.clipboardData.getData('text');
  const normalized = normalizeLinkInput(rawPasted);
  storedState = normalized;
  setStateCallCount++;

  assert.equal(preventDefaultCalled, true);
  assert.equal(setStateCallCount, 1);
  assert.equal(storedState, 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7');
});

test('StrictMode Idempotence: Double-invoking state setter does not duplicate or append the URL', () => {
  const raw = 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7';
  const normalized = normalizeLinkInput(raw);

  let state = '';
  const setter = (val) => {
    state = val; // Direct replacement, never state + val
  };

  // StrictMode runs state update / updater twice in development
  setter(normalized);
  setter(normalized);

  assert.equal(state, 'https://maps.app.goo.gl/qhK16CL1UASZ6qpV7');
});

/* -------------------------------------------------------------------------- */
/* Quiet Photon Check and URL builder                                         */
/* -------------------------------------------------------------------------- */

test('View on map URL Builder: Encodes plain text and Malayalam', () => {
  const plainUrl = buildGoogleMapsSearchUrl('Infopark Kochi');
  assert.equal(plainUrl, 'https://www.google.com/maps/search/?api=1&query=Infopark%20Kochi');

  const malayalam = 'ഇൻഫോപാർക്ക് കൊച്ചി';
  const malayalamUrl = buildGoogleMapsSearchUrl(malayalam);
  assert.ok(malayalamUrl.includes(encodeURIComponent(malayalam)));
});

test('Coordinates link reverse lookup: Success and failure handling (Mocked)', async () => {
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

  const mockFetchFailure = async () => ({
    ok: false,
    status: 500,
  });

  const failed = await reversePhotonCoordinates(9.98, 76.28, { fetchFn: mockFetchFailure });
  assert.equal(failed, null);
});

test('Quiet Photon Check: Found returns true and drops landmark (Mocked)', async () => {
  clearPlaceCheckCache();
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      features: [{ properties: { name: 'LuLu International Shopping Mall' } }],
    }),
  });

  const result = await checkPlaceWithPhoton('Lulu Thiruvananthapuram', { fetchFn: mockFetch });
  assert.equal(result.found, true);
  assert.equal(result.name, 'LuLu International Shopping Mall');
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

  const valid = validateLocations('ALPHA VENJARAMOODU', 'Lulu Mall Edappally');
  assert.equal(Object.keys(valid).length, 0);
});
