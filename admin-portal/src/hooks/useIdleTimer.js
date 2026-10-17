import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const THROTTLE_MS = 2000; // Update activity timestamp at most once every 2 seconds
const CHECK_INTERVAL_MS = 5000; // Check idle status every 5 seconds

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
];

/**
 * useIdleTimer Hook
 * Automatically triggers onIdle after a specified period of user inactivity.
 * Coordinates across browser tabs via localStorage timestamp.
 *
 * @param {Object} options
 * @param {number} [options.timeoutMs=900000] - Inactivity threshold in milliseconds (default 15 minutes)
 * @param {Function} options.onIdle - Callback invoked when the user becomes idle
 * @param {boolean} [options.isEnabled=true] - Whether the timer is currently active
 */
export function useIdleTimer({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onIdle,
  isEnabled = true,
}) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const lastActivityRef = useRef(Date.now());
  const lastRecordedRef = useRef(0);

  // Update activity timestamp in memory and synced localStorage
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Throttle writes to localStorage
    if (now - lastRecordedRef.current > THROTTLE_MS) {
      lastRecordedRef.current = now;
      try {
        localStorage.setItem('hired_last_active', String(now));
      } catch {
        // Storage access may be blocked or restricted
      }
    }
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    // Initialize activity timestamp on mount
    recordActivity();

    // Event handler for user interaction
    const handleActivity = () => {
      recordActivity();
    };

    // Listen for storage events to sync activity across tabs
    const handleStorage = (e) => {
      if (e.key === 'hired_last_active' && e.newValue) {
        const remoteTime = Number(e.newValue);
        if (!isNaN(remoteTime) && remoteTime > lastActivityRef.current) {
          lastActivityRef.current = remoteTime;
        }
      }
    };

    // Attach interaction listeners
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    window.addEventListener('storage', handleStorage);

    // Periodic checker for idle expiration
    const intervalId = setInterval(() => {
      const now = Date.now();
      let lastActive = lastActivityRef.current;

      // Also check localStorage in case another tab updated it
      try {
        const stored = localStorage.getItem('hired_last_active');
        if (stored) {
          const parsed = Number(stored);
          if (!isNaN(parsed) && parsed > lastActive) {
            lastActive = parsed;
            lastActivityRef.current = parsed;
          }
        }
      } catch {
        // Ignore storage errors
      }

      if (now - lastActive >= timeoutMs) {
        if (onIdleRef.current) {
          onIdleRef.current();
        }
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener('storage', handleStorage);
      clearInterval(intervalId);
    };
  }, [isEnabled, timeoutMs, recordActivity]);

  return {
    recordActivity,
    resetTimer: recordActivity,
  };
}

export default useIdleTimer;
