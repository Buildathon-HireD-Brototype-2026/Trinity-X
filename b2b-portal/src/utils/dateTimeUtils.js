/**
 * Date and 12-Hour Time utilities for HireD B2B Portal.
 * Handles bidirectional conversion between 12-hour AM/PM representations
 * and standard ISO datetime strings ("YYYY-MM-DDTHH:mm").
 */

/**
 * Converts 12-hour time components to 24-hour "HH:mm" format.
 * - hour12: '01' to '12'
 * - minute: '00' to '59'
 * - period: 'AM' or 'PM'
 */
export function formatTo24HourTime(hour12, minute, period) {
  if (!hour12 || minute === undefined || minute === null || minute === '') {
    return '';
  }

  let h = parseInt(hour12, 10);
  if (isNaN(h)) return '';

  const m = String(minute).padStart(2, '0');
  const isPM = String(period).toUpperCase() === 'PM';

  if (isPM && h < 12) {
    h += 12;
  } else if (!isPM && h === 12) {
    h = 0;
  }

  return `${String(h).padStart(2, '0')}:${m}`;
}

/**
 * Parses an ISO datetime string ("YYYY-MM-DDTHH:mm") into 12-hour components.
 * When empty, returns empty fields without auto-selecting default date or time.
 */
export function parseFromISOString(isoString) {
  if (!isoString || typeof isoString !== 'string' || !isoString.trim()) {
    return {
      date: '',
      hour12: '',
      minute: '',
      period: 'AM',
    };
  }

  const [datePart = '', timePart = ''] = isoString.split('T');
  if (!timePart) {
    return {
      date: datePart,
      hour12: '',
      minute: '',
      period: 'AM',
    };
  }

  const [hStr = '', mStr = ''] = timePart.split(':');
  if (hStr === '' && mStr === '') {
    return {
      date: datePart,
      hour12: '',
      minute: '',
      period: 'AM',
    };
  }

  let h24 = parseInt(hStr, 10);
  if (isNaN(h24)) {
    return {
      date: datePart,
      hour12: '',
      minute: '',
      period: 'AM',
    };
  }

  const minute = mStr.slice(0, 2);

  let period = 'AM';
  let hour12 = h24;

  if (h24 >= 12) {
    period = 'PM';
    if (h24 > 12) hour12 = h24 - 12;
  } else if (h24 === 0) {
    hour12 = 12;
  }

  return {
    date: datePart,
    hour12: String(hour12).padStart(2, '0'),
    minute: minute ? String(minute).padStart(2, '0') : '00',
    period,
  };
}
