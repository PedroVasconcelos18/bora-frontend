// API client — all requests use credentials:'include' so httpOnly cookies are sent automatically.
// This is required for the cross-subdomain httpOnly cookie auth pattern (D-09).

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const apiClient = {
  get: (path: string): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      credentials: 'include', // sends httpOnly cookies on every request
      headers: { 'Content-Type': 'application/json' },
    }),

  post: (path: string, body: unknown): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  put: (path: string, body: unknown): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  patch: (path: string, body: unknown): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  delete: (path: string): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }),
};
