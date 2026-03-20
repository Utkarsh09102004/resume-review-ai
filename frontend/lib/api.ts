import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Create an authenticated API client by attaching a Bearer token.
 *
 * Usage from Server Actions / Route Handlers:
 *   const client = await createAuthenticatedApi();
 *   const res = await client.get('/resumes');
 *
 * In dev mode (AUTH_ENABLED != "true") this returns the plain client
 * without an Authorization header — the backend defaults to a dev user.
 */
export async function createAuthenticatedApi() {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'true') {
    return api;
  }

  // Dynamic import so we only pull in server-side code when needed.
  // This module calls next/headers which is server-only.
  const { getAuthAccessToken } = await import('./auth');
  const token = await getAuthAccessToken();

  if (token) {
    const authedApi = axios.create({
      ...api.defaults,
      headers: {
        ...api.defaults.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    return authedApi;
  }

  return api;
}

export default api;
