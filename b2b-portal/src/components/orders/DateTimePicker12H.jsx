import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { formatTo24HourTime, parseFromISOString } from '../../utils/dateTimeUtils.js';

export { formatTo24HourTime, parseFromISOString };

export function DateTimePicker12H({
  id = 'pickup_time',
  name = 'pickup_time',
  label = 'Pickup Date & Time',
  value,
  onChange,
  error,
  required = true,
}) {
  const initial = parseFromISOString(value);
  const [date, setDate] = useState(initial.date);
  const [hour12, setHour12] = useState(initial.hour12);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);

  // Sync when value changes externally (e.g. Auto-fill Sample Route or form reset)
  useEffect(() => {
    if (value) {
      const parsed = parseFromISOString(value);
      setDate(parsed.date);
      setHour12(parsed.hour12);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }, [value]);

  const emitChange = (newDate, newHour, newMinute, newPeriod) => {
    if (!newDate) {
      onChange({ target: { name, value: '' } });
      return;
    }
    const time24 = formatTo24HourTime(newHour, newMinute, newPeriod);
    const combinedISO = `${newDate}T${time24}`;
    onChange({ target: { name, value: combinedISO } });
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setDate(val);
    emitChange(val, hour12, minute, period);
  };

  const handleHourChange = (e) => {
    const val = e.target.value;
    setHour12(val);
    emitChange(date, val, minute, period);
  };

  const handleMinuteChange = (e) => {
    const val = e.target.value;
    setMinute(val);
    emitChange(date, hour12, val, period);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    emitChange(date, hour12, minute, newPeriod);
  };

  // Generate 12 hours: 01 to 12
  const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  // Generate minutes in 5-minute increments (00, 05, ..., 55)
  const standardMinutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const minuteOptions = standardMinutes.includes(minute)
    ? standardMinutes
    : [...standardMinutes, minute].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  // Friendly formatted preview string (e.g. "Fri, Oct 24, 2026 at 10:30 AM")
  let formattedPreview = '';
  if (date) {
    try {
      const time24 = formatTo24HourTime(hour12, minute, period);
      const parsedDate = new Date(`${date}T${time24}`);
      if (!isNaN(parsedDate.getTime())) {
        formattedPreview = parsedDate.toLocaleString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch {
      formattedPreview = `${date} at ${hour12}:${minute} ${period}`;
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="form-group" style={{ gridColumn: 'span 2' }}>
      <label className="form-label" htmlFor={`${id}-date`}>
        {label} {required && '*'}
      </label>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.875rem',
          alignItems: 'start',
        }}
      >
        {/* 1. Date Selector */}
        <div style={{ position: 'relative' }}>
          <Calendar
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted, #94a3b8)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
          <input
            id={`${id}-date`}
            type="date"
            className="form-control"
            min={todayStr}
            value={date}
            onChange={handleDateChange}
            style={{
              paddingLeft: '38px',
              height: '44px',
              fontSize: '0.875rem',
              backgroundColor: 'var(--bg-surface, #ffffff)',
              cursor: 'pointer',
            }}
            aria-label="Pickup Date"
          />
        </div>

        {/* 2. 12-Hour Time Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'nowrap',
          }}
        >
          {/* Hour & Minute Select Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'var(--bg-surface, #ffffff)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 0.5rem',
              height: '44px',
              flex: 1,
            }}
          >
            <Clock
              size={17}
              style={{ color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }}
              aria-hidden="true"
            />

            {/* Hour select */}
            <select
              id={`${id}-hour`}
              value={hour12}
              onChange={handleHourChange}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: 'var(--text-main, #0f172a)',
                cursor: 'pointer',
                outline: 'none',
                padding: '0 0.15rem',
              }}
              aria-label="Select hour"
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <span
              style={{
                fontWeight: 700,
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '1rem',
                userSelect: 'none',
              }}
            >
              :
            </span>

            {/* Minute select */}
            <select
              id={`${id}-minute`}
              value={minute}
              onChange={handleMinuteChange}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: 'var(--text-main, #0f172a)',
                cursor: 'pointer',
                outline: 'none',
                padding: '0 0.15rem',
              }}
              aria-label="Select minute"
            >
              {minuteOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* AM / PM Segmented Control */}
          <div
            role="group"
            aria-label="Select AM or PM"
            style={{
              display: 'inline-flex',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              padding: '3px',
              background: 'var(--bg-muted, #f8fafc)',
              height: '44px',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => handlePeriodChange('AM')}
              style={{
                padding: '0 0.9rem',
                height: '36px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: period === 'AM' ? 700 : 500,
                backgroundColor: period === 'AM' ? 'var(--primary, #2563eb)' : 'transparent',
                color: period === 'AM' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: period === 'AM' ? '0 1px 3px rgba(37,99,235,0.25)' : 'none',
              }}
              aria-pressed={period === 'AM'}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('PM')}
              style={{
                padding: '0 0.9rem',
                height: '36px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.8125rem',
                fontWeight: period === 'PM' ? 700 : 500,
                backgroundColor: period === 'PM' ? 'var(--primary, #2563eb)' : 'transparent',
                color: period === 'PM' ? '#ffffff' : 'var(--text-secondary, #64748b)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: period === 'PM' ? '0 1px 3px rgba(37,99,235,0.25)' : 'none',
              }}
              aria-pressed={period === 'PM'}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Readable Friendly Preview Badge */}
      {formattedPreview && (
        <div
          style={{
            marginTop: '0.5rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: 'var(--primary, #2563eb)',
            background: 'var(--primary-subtle, rgba(37, 99, 235, 0.08))',
            padding: '0.2rem 0.65rem',
            borderRadius: '20px',
            fontWeight: 500,
          }}
        >
          <Clock size={12} aria-hidden="true" />
          <span>Scheduled for {formattedPreview}</span>
        </div>
      )}

      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          style={{
            color: 'var(--danger, #ef4444)',
            fontSize: '0.75rem',
            marginTop: '0.25rem',
            display: 'block',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

export default DateTimePicker12H;
