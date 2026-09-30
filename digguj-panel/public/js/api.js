// Komunikacja z serwerem. Każde żądanie ma nagłówek X-Requested-With (ochrona CSRF po stronie serwera).

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = { 'X-Requested-With': 'digguj' };
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError('Brak połączenia z serwerem.', 0);
  }

  const data = (res.headers.get('content-type') || '').includes('application/json') ? await res.json() : null;

  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
    throw new ApiError('Sesja wygasła – zaloguj się ponownie.', 401, data);
  }
  if (!res.ok) throw new ApiError(data?.error || `Błąd serwera (${res.status}).`, res.status, data);
  return data;
}

export async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } finally { location.href = '/login'; }
}
