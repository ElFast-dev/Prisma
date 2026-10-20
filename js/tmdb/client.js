const TMDB_API_BASE = "https://api.themoviedb.org/3";

export function normalizeCredential(raw, kind) {
  const value = String(raw || "").trim();
  if (!value) return null;
  return { kind: kind === "apiKey" ? "apiKey" : "readToken", value };
}

export function createTMDBClient(dependencies) {
  const getCredential = dependencies.getCredential;
  const displayGenre = dependencies.displayGenre;
  const uniqueStrings = dependencies.uniqueStrings;
  const fetchImpl = dependencies.fetchImpl || fetch;
  let genresById = new Map();

  async function request(path, params, credentialOverride) {
    const credential = credentialOverride || getCredential();
    if (!credential || !credential.value) {
      throw new Error("Conecta tu credencial de TMDB desde Datos.");
    }

    const url = new URL(TMDB_API_BASE + path);
    Object.keys(params || {}).forEach(function (key) {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        url.searchParams.set(key, String(params[key]));
      }
    });

    const headers = { accept: "application/json" };
    if (credential.kind === "apiKey") {
      url.searchParams.set("api_key", credential.value);
    } else {
      headers.Authorization = "Bearer " + credential.value;
    }

    const response = await fetchImpl(url.toString(), { method: "GET", headers });
    let data = {};
    try {
      data = await response.json();
    } catch (_) {}

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("TMDB rechazó la credencial (401). Verifica que el token de lectura o la clave API v3 estén completos.");
      }
      if (response.status === 403) {
        throw new Error("TMDB denegó el acceso (403). Revisa las credenciales y los permisos de tu cuenta.");
      }
      if (response.status === 429) {
        throw new Error("TMDB limitó temporalmente las solicitudes. Espera un momento y vuelve a probar.");
      }
      throw new Error((data && data.status_message) || ("TMDB respondió con HTTP " + response.status + "."));
    }
    return data;
  }

  async function ensureGenres() {
    if (genresById.size) return;
    const data = await request("/genre/movie/list", { language: "es-ES" });
    genresById = new Map((data.genres || []).map(function (genre) {
      return [Number(genre.id), genre.name];
    }));
  }

  function fromTMDB(raw) {
    const releaseDate = String(raw.release_date || "");
    const year = releaseDate.length >= 4 ? Number(releaseDate.slice(0, 4)) : null;
    const genres = Array.isArray(raw.genres) && raw.genres.length
      ? raw.genres.map(function (item) { return item.name; })
      : (raw.genre_ids || []).map(function (id) { return genresById.get(Number(id)); }).filter(Boolean);
    const keywordObject = raw.keywords || {};
    const keywords = keywordObject.keywords || keywordObject.results || [];
    const posterPath = raw.poster_path || "";

    return {
      id: String(raw.id),
      tmdbId: String(raw.id),
      title: raw.title || raw.original_title || "",
      year,
      genres: genres.map(displayGenre),
      tags: uniqueStrings(keywords.map(function (item) { return item.name; })),
      overview: raw.overview || "",
      posterPath,
      posterUrl: posterPath ? "https://image.tmdb.org/t/p/w500" + posterPath : "",
      voteAverage: Number(raw.vote_average) || null,
      voteCount: Number(raw.vote_count) || null,
      runtime: Number(raw.runtime) || null,
      popularity: Number(raw.popularity) || null,
      releaseDate: raw.release_date || null,
      backdropPath: raw.backdrop_path || "",
      backdropUrl: raw.backdrop_path ? "https://image.tmdb.org/t/p/w1280" + raw.backdrop_path : "",
      tagline: raw.tagline || "",
      status: raw.status || "",
      productionCountries: Array.isArray(raw.production_countries)
        ? raw.production_countries.map(function (country) { return country.name || country.iso_3166_1; })
        : [],
      imdbId: raw.imdb_id || "",
      tmdbFetchedAt: new Date().toISOString(),
      metadataSource: "tmdb",
      source: "tmdb"
    };
  }

  function resetGenres() {
    genresById = new Map();
  }

  return { request, ensureGenres, fromTMDB, resetGenres };
}
