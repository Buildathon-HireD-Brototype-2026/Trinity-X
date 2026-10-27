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
        const errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`;
        const err = new Error(errorMsg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (err) {
      // Re-throw if already formatted, or wrap network failure
      if (err.status) throw err;
      const networkErr = new Error('Network error: Unable to connect to backend server');
      networkErr.isNetworkError = true;
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
