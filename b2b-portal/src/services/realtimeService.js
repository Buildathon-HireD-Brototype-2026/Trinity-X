/**
 * Real-Time Database Change Subscription Service
 * Connects to the backend Server-Sent Events (SSE) stream (/api/v1/events)
 * Emits debounced events to active page subscribers based on changed table names.
 * Features:
 * - Single managed EventSource connection
 * - Automatic debouncing of burst events (400ms)
 * - Light polling fallback (every 12 seconds) if live stream disconnects
 * - Clean teardown and connection closing when all subscribers unmount
 */

class RealtimeService {
  constructor() {
    this.subscribers = new Map(); // id -> { tables, callback, debounceTimer }
    this.nextId = 1;
    this.eventSource = null;
    this.isLive = false;
    this.fallbackPollingInterval = null;
    this.reconnectAttempts = 0;
  }

  getEventsUrl() {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
    return `${base.replace(/\/$/, '')}/events`;
  }

  /**
   * Subscribe a callback to changes on specific database tables.
   * Returns an unsubscribe function.
   */
  subscribe(tables, callback) {
    const id = this.nextId++;
    const normalizedTables = tables.map((t) => t.toLowerCase());

    this.subscribers.set(id, {
      tables: normalizedTables,
      callback,
      debounceTimer: null,
    });

    if (this.subscribers.size === 1) {
      this.connect();
    }

    return () => {
      const sub = this.subscribers.get(id);
      if (sub && sub.debounceTimer) {
        clearTimeout(sub.debounceTimer);
      }
      this.subscribers.delete(id);

      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  connect() {
    if (this.eventSource) return;

    try {
      const url = this.getEventsUrl();
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isLive = true;
        this.reconnectAttempts = 0;
        this.stopFallbackPolling();
      };

      this.eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.table) {
            this.handleTableEvent(payload.table.toLowerCase(), payload);
          }
        } catch {
          // ignore heartbeats / ping frames
        }
      };

      this.eventSource.onerror = () => {
        this.isLive = false;
        this.reconnectAttempts++;
        // Start light polling fallback when disconnected
        this.startFallbackPolling();
      };
    } catch (err) {
      this.isLive = false;
      this.startFallbackPolling();
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isLive = false;
    this.stopFallbackPolling();
  }

  handleTableEvent(tableName, eventPayload) {
    for (const sub of this.subscribers.values()) {
      if (sub.tables.includes(tableName) || sub.tables.includes('*')) {
        // Debounce rapid bursts of events (400ms)
        if (sub.debounceTimer) {
          clearTimeout(sub.debounceTimer);
        }
        sub.debounceTimer = setTimeout(() => {
          sub.debounceTimer = null;
          try {
            sub.callback(eventPayload);
          } catch (err) {
            console.error('[realtime] Subscriber callback error:', err);
          }
        }, 400);
      }
    }
  }

  startFallbackPolling() {
    if (this.fallbackPollingInterval) return;

    // Light polling every 12 seconds while disconnected
    this.fallbackPollingInterval = setInterval(() => {
      if (!this.isLive && this.subscribers.size > 0) {
        for (const sub of this.subscribers.values()) {
          try {
            sub.callback({ table: 'polling_fallback', action: 'POLL' });
          } catch (err) {
            console.error('[realtime] Polling callback error:', err);
          }
        }
      }
    }, 12000);
  }

  stopFallbackPolling() {
    if (this.fallbackPollingInterval) {
      clearInterval(this.fallbackPollingInterval);
      this.fallbackPollingInterval = null;
    }
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
