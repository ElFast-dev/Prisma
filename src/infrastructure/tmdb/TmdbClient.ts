const TMDB_API_BASE_URL = "https://api.themoviedb.org/3/";

export class TmdbHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "TmdbHttpError";
  }
}

export interface TmdbRequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  const seconds = Number(normalized);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(normalized);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}

export class TmdbClient {
  private readonly fetcher: typeof fetch;

  constructor(
    private readonly accessToken: string,
    fetcher: typeof fetch = globalThis.fetch
  ) {
    if (!accessToken.trim()) {
      throw new Error("Configura tu credencial de TMDB antes de realizar consultas.");
    }

    // fetch es un método del contexto global del navegador. Al guardarlo como
    // referencia independiente pierde su receptor y puede lanzar Illegal invocation.
    this.fetcher = fetcher.bind(globalThis);
  }

  async get<T>(endpoint: string, options: TmdbRequestOptions = {}): Promise<T> {
    const safeEndpoint = endpoint.replace(/^\/+/, "");
    if (safeEndpoint.startsWith("http") || safeEndpoint.includes("..")) {
      throw new Error("El endpoint de TMDB no es válido.");
    }

    const url = new URL(safeEndpoint, TMDB_API_BASE_URL);
    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await this.fetcher(url, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + this.accessToken,
        Accept: "application/json"
      },
      signal: options.signal
    });

    if (!response.ok) {
      throw new TmdbHttpError(
        "TMDB respondió con el estado HTTP " + response.status + ".",
        response.status,
        safeEndpoint,
        response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After")) : undefined
      );
    }

    return response.json() as Promise<T>;
  }
}
