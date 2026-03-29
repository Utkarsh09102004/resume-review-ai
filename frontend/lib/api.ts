import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Build an API client by attaching a Bearer token when available.
 */
async function createApiWithToken(
  getToken: () => Promise<string | undefined>
) {
  if (process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'true') {
    return api;
  }

  const token = await getToken();

  if (!token) {
    return api;
  }

  return axios.create({
    ...api.defaults,
    headers: {
      ...api.defaults.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Create an authenticated API client by attaching a Bearer token.
 *
 * Usage from Server Actions, Route Handlers, and Server Components:
 *   const client = await createAuthenticatedApi();
 *   const res = await client.get('/resumes');
 *
 * In dev mode (AUTH_ENABLED != "true") this returns the plain client
 * without an Authorization header — the backend defaults to a dev user.
 */
export async function createAuthenticatedApi() {
  const { getAuthAccessTokenForServer } = await import('./auth');
  return createApiWithToken(getAuthAccessTokenForServer);
}

/**
 * Backwards-compatible alias for callers that still import the RSC helper.
 */
export async function createAuthenticatedApiRSC() {
  return createAuthenticatedApi();
}

export default api;
