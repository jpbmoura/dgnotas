/**
 * Cliente HTTP fino para a API DG Notas.
 *
 * - Sempre manda `credentials: 'include'` (better-auth usa cookies de sessão).
 * - Serializa body JSON automaticamente; retorna JSON parseado.
 * - Erros do backend ({ code, message, ... }) viram HttpError com .status e .code
 *   pra facilitar tratamento específico na UI.
 *
 * Usa path relativo `/api/...` — em dev o proxy do Vite encaminha pro backend
 * em :4000; em produção o front e o back ficam no mesmo host (Express serve a SPA).
 */

export class HttpError extends Error {
  readonly name = 'HttpError';

  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type QueryValue = string | number | boolean | undefined | null;

type RequestOptions = {
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = path.startsWith('/') ? `/api${path}` : `/api/${path}`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, query, signal, headers = {} } = opts;

  const init: RequestInit = {
    method,
    credentials: 'include',
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(buildUrl(path, query), init);

  if (!response.ok) {
    let payload: { code?: string; message?: string } & Record<string, unknown> = {};
    try {
      payload = await response.json();
    } catch {
      /* corpo não-JSON, ignora */
    }
    throw new HttpError(
      response.status,
      payload.code ?? 'UNKNOWN_ERROR',
      payload.message ?? response.statusText,
      payload,
    );
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return undefined as T;

  return (await response.json()) as T;
}

export const http = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('POST', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('PUT', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('PATCH', path, { ...opts, body }),
  delete: <T = void>(path: string, opts?: Omit<RequestOptions, 'body'>) =>
    request<T>('DELETE', path, opts),
};
