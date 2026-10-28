import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTo24HourTime,
  parseFromISOString,
} from '../src/utils/dateTimeUtils.js';

test('DateTimePicker12H: formatTo24HourTime converts 12-hour AM/PM to 24-hour time', () => {
  // Morning AM
  assert.equal(formatTo24HourTime('10', '00', 'AM'), '10:00');
  assert.equal(formatTo24HourTime('09', '15', 'AM'), '09:15');
  assert.equal(formatTo24HourTime('01', '45', 'AM'), '01:45');

  // Midnight (12 AM is 00:xx)
  assert.equal(formatTo24HourTime('12', '00', 'AM'), '00:00');
  assert.equal(formatTo24HourTime('12', '30', 'AM'), '00:30');

  // Noon (12 PM is 12:xx)
  assert.equal(formatTo24HourTime('12', '00', 'PM'), '12:00');
  assert.equal(formatTo24HourTime('12', '45', 'PM'), '12:45');

  // Afternoon & Evening PM
  assert.equal(formatTo24HourTime('01', '00', 'PM'), '13:00');
  assert.equal(formatTo24HourTime('02', '30', 'PM'), '14:30');
  assert.equal(formatTo24HourTime('06', '15', 'PM'), '18:15');
  assert.equal(formatTo24HourTime('10', '00', 'PM'), '22:00');
  assert.equal(formatTo24HourTime('11', '55', 'PM'), '23:55');
});

test('DateTimePicker12H: parseFromISOString extracts 12-hour components from ISO strings', () => {
  // Morning
  const am = parseFromISOString('2026-10-24T09:30');
  assert.equal(am.date, '2026-10-24');
  assert.equal(am.hour12, '09');
  assert.equal(am.minute, '30');
  assert.equal(am.period, 'AM');

  // Midnight
  const midnight = parseFromISOString('2026-10-24T00:15');
  assert.equal(midnight.hour12, '12');
  assert.equal(midnight.minute, '15');
  assert.equal(midnight.period, 'AM');

  // Noon
  const noon = parseFromISOString('2026-10-24T12:00');
  assert.equal(noon.hour12, '12');
  assert.equal(noon.minute, '00');
  assert.equal(noon.period, 'PM');

  // Afternoon 2:45 PM (14:45)
  const pm = parseFromISOString('2026-10-24T14:45');
  assert.equal(pm.hour12, '02');
  assert.equal(pm.minute, '45');
  assert.equal(pm.period, 'PM');

  // Night 11:59 PM (23:59)
  const night = parseFromISOString('2026-10-24T23:59');
  assert.equal(night.hour12, '11');
  assert.equal(night.minute, '59');
  assert.equal(night.period, 'PM');
});

test('DateTimePicker12H: Empty ISO string returns empty fields without auto-selection', () => {
  const empty = parseFromISOString('');
  assert.equal(empty.date, '');
  assert.equal(empty.hour12, '');
  assert.equal(empty.minute, '');
});

test('DateTimePicker12H: End-to-end round trip conversion consistency', () => {
  const testCases = [
    { hour12: '08', minute: '15', period: 'AM', expected24: '08:15' },
    { hour12: '12', minute: '00', period: 'AM', expected24: '00:00' },
    { hour12: '12', minute: '30', period: 'PM', expected24: '12:30' },
    { hour12: '04', minute: '45', period: 'PM', expected24: '16:45' },
    { hour12: '11', minute: '50', period: 'PM', expected24: '23:50' },
  ];

  for (const tc of testCases) {
    const formatted24 = formatTo24HourTime(tc.hour12, tc.minute, tc.period);
    assert.equal(formatted24, tc.expected24);

    const parsed = parseFromISOString(`2026-10-25T${formatted24}`);
    assert.equal(parsed.hour12, tc.hour12);
    assert.equal(parsed.minute, tc.minute);
    assert.equal(parsed.period, tc.period);
  }
});
