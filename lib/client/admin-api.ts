export function getAdminToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    localStorage.getItem('super_admin_token') ||
    localStorage.getItem('user_token') ||
    localStorage.getItem('authToken') ||
    null
  );
}

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const buildHeaders = (tokenOverride?: string | null) => {
    const headers = new Headers(init.headers || {});
    const token = tokenOverride ?? getAdminToken();

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return headers;
  };

  const firstResponse = await fetch(input, {
    ...init,
    headers: buildHeaders(),
    cache: init.cache ?? 'no-store'
  });

  if (firstResponse.status !== 401 || typeof window === 'undefined') {
    return firstResponse;
  }

  const superAdminToken = localStorage.getItem('super_admin_token');
  if (!superAdminToken) {
    return firstResponse;
  }

  const authHeader = new Headers(init.headers || {}).get('Authorization');
  const currentToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : getAdminToken();

  if (currentToken === superAdminToken) {
    return firstResponse;
  }

  return fetch(input, {
    ...init,
    headers: buildHeaders(superAdminToken),
    cache: init.cache ?? 'no-store'
  });
}
