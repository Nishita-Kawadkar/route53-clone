const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
const TOKEN_KEY = 'r53_token';

export const tokenStore = {
  get(): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// FastAPI returns {detail: "text"} or {detail: [{msg, loc, ...}]} for validation errors.
function parseDetail(data: unknown): string | null {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => String((d as { msg?: string }).msg ?? '').replace(/^Value error, /, ''))
      .filter(Boolean)
      .join('; ');
  }
  return null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      tokenStore.clear();
      window.dispatchEvent(new Event('r53:unauthorized'));
    }
    throw new ApiError(res.status, parseDetail(data) ?? res.statusText);
  }
  return data as T;
}

const json = (body?: unknown) => (body === undefined ? undefined : JSON.stringify(body));

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: json(body) }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: json(body) }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: json(body) }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};