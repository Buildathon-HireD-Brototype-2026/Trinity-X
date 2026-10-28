import { getFriendlyError } from '../utils/friendlyError';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * Centralized API client for Admin Portal.
 * Handles bearer token attachment, content-type headers, and response parsing.
 */
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  getToken() {
    try {
      const raw =
        (typeof sessionStorage !== 'undefined' &&
          (sessionStorage.getItem('hired_admin_session') || sessionStorage.getItem('hired_admin_user'))) ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('hired_admin_user'));
      if (!raw) return null;
      const user = JSON.parse(raw);
      return user.token || user.access_token || null;
    } catch {
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const res = await fetch(url, config);
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;

      if (!res.ok) {
        if (res.status === 401 && typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem('hired_admin_session');
            sessionStorage.removeItem('hired_admin_user');
            sessionStorage.setItem('hired_logout_reason', 'relogin');
            window.dispatchEvent(new CustomEvent('hired:auth_expired'));
          } catch {
            // ignore session cleanup error
          }
        }

        const rawMsg = data?.message || data?.error?.message || data?.error || '';
        const err = new Error(rawMsg || `Request failed with status ${res.status}`);
        err.status = res.status;
        err.data = data;
        err.friendlyMessage = getFriendlyError(err);
        throw err;
      }

      return data;
    } catch (err) {
      if (err.status) throw err;
      const networkErr = new Error('Cannot connect right now. Please check your internet and try again.');
      networkErr.isNetworkError = true;
      networkErr.friendlyMessage = 'Cannot connect right now. Please check your internet and try again.';
      console.error('[ApiClient Network Failure]:', err);
      throw networkErr;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE);
export default apiClient;
