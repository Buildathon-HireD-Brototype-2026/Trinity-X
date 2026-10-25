import axios from 'axios';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach JWT bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hired_b2b_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-logout on 401 Unauthorized for authenticated sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = Boolean(error.config?.url?.includes('/auth/login'));
    if (error.response && error.response.status === 401 && !isLoginRequest) {
      localStorage.removeItem('hired_b2b_token');
      localStorage.removeItem('hired_b2b_partner');
      window.dispatchEvent(
        new CustomEvent('hired:auth_expired', {
          detail: { message: 'Your session has expired. Please log in again.' },
        })
      );
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
      }
    }

    // Attach human-friendly sanitized message
    error.friendlyMessage = getFriendlyErrorMessage(error, isLoginRequest ? 'login' : '');
    return Promise.reject(error);
  }
);

export default apiClient;
