const TMDB_API_BASE_URL = "https://api.themoviedb.org/3/";

export class TmdbHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = "TmdbHttpError";
  }
}

export interface TmdbRequestOptions {
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

export class TmdbClient {
  constructor(
    private readonly accessToken: string,
    private readonly fetcher: typeof fetch = fetch
  ) {
    if (!accessToken.trim()) {
      throw new Error("Configura tu credencial de TMDB antes de realizar consultas.");
    }
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
        safeEndpoint
      );
    }

    return response.json() as Promise<T>;
  }
}
