/**
 * api.js — Shared API client for the HireD Admin Portal.
 *
 * Attaches Authorization header from localStorage session automatically.
 * All requests go to VITE_API_URL (default: http://localhost:5000).
 *
 * Usage:
 *   import { apiGet, apiPatch, apiPost } from '@/services/api';
 *   const data = await apiGet('/api/v1/admins/1', token);
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Core fetch wrapper — attaches auth token and parses JSON response.
 * Throws an Error with message from the backend on non-2xx status.
 */
async function apiFetch(path, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Parse body regardless of status so we can extract error messages
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      body?.error?.message ||
      body?.message ||
      `Request failed with status ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.code = body?.error?.code || null;
    throw err;
  }

  return body?.data ?? body;
}

export const apiGet = (path, token) =>
  apiFetch(path, { method: 'GET' }, token);

export const apiPost = (path, body, token) =>
  apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, token);

export const apiPatch = (path, body, token) =>
  apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }, token);

export const apiDelete = (path, token) =>
  apiFetch(path, { method: 'DELETE' }, token);
