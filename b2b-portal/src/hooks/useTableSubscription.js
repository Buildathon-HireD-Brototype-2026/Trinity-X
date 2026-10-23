import { useEffect, useRef } from 'react';
import realtimeService from '../services/realtimeService';

/**
 * React hook to subscribe a component to real-time database changes.
 * Automatically re-fetches data quietly whenever any of the specified tables change.
 * 
 * @param {string[]} tables - Array of table names to observe, e.g. ['orders', 'trips']
 * @param {Function} onUpdate - Quiet update handler callback function
 */
export function useTableSubscription(tables, onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!tables || tables.length === 0) return;

    const unsubscribe = realtimeService.subscribe(tables, (event) => {
      if (onUpdateRef.current) {
        onUpdateRef.current(event);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [JSON.stringify(tables)]);
}

export default useTableSubscription;
