import type { MovieRecord, SpectroSnapshot } from "../../domain/types";
import {
  getMovieAnalysisMetadata,
  type TmdbMovieAnalysisMetadata,
  type TmdbMovieSummary
} from "../tmdb/TmdbService";
import { getTmdbAccessToken } from "../tmdb/settings";
import { runWithConcurrency, shareInFlight } from "../../domain/asyncPool";
import {
  getSpectroInputFingerprint,
  selectSpectroCandidates,
  rankSpectroCandidates,
  SPECTRO_ALGORITHM_VERSION,
  type SpectroAnalysis,
  type SpectroInput
} from "../../domain/spectro";
import type {
  SpectroAnalysisWorkerResponse,
  SpectroAnalysisWorkerRequest
} from "../../domain/spectroWorkerProtocol";
import {
  calculateSpectroWorkspace,
  type SpectroWorkspaceInput,
  type SpectroWorkspaceCalculation,
  type SpectroWorkspaceResult
} from "../../domain/spectroWorkspace";
import { prismaDb } from "./database";
import { isSpectroMetadataIncomplete } from "./spectroMetadataService";

function isValidCachedAnalysis(
  value: unknown,
  inputFingerprint: string
): value is SpectroAnalysis {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<SpectroAnalysis>;
  return payload.algorithmVersion === SPECTRO_ALGORITHM_VERSION
    && payload.inputFingerprint === inputFingerprint
    && Array.isArray(payload.decisionGraph?.nodes)
    && Array.isArray(payload.decisionGraph?.edges)
    && Array.isArray(payload.patterns)
    && Array.isArray(payload.networkGraph?.nodes)
    && Array.isArray(payload.networkGraph?.edges)
    && Array.isArray(payload.networkGraph?.clusters);
}

function calculateWorkspaceWithoutBlocking(
  input: SpectroWorkspaceInput
): Promise<SpectroWorkspaceCalculation> {
  const calculateFallback = () => calculateSpectroWorkspace(input);

  if (typeof Worker === "undefined") {
    try {
      return Promise.resolve(calculateFallback());
    } catch (cause) {
      return Promise.reject(cause);
    }
  }

  let worker: Worker;
  try {
    worker = new Worker(
      new URL("../../domain/spectroAnalysis.worker.ts", import.meta.url),
      { type: "module" }
    );
  } catch {
    // Una política CSP o un navegador sin soporte no debe dejar Espectro inutilizable.
    try {
      return Promise.resolve(calculateFallback());
    } catch (cause) {
      return Promise.reject(cause);
    }
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      callback();
    };

    const fallback = () => {
      finish(() => {
        try {
          resolve(calculateFallback());
        } catch (cause) {
          reject(cause);
        }
      });
    };

    worker.onmessage = (event: MessageEvent<SpectroAnalysisWorkerResponse>) => {
      const response = event.data;
      if (response?.ok) {
        finish(() => resolve(response.result));
      } else {
        finish(() => reject(new Error(
          response && "error" in response
            ? response.error
            : "El trabajador de Espectro devolvió una respuesta no válida."
        )));
      }
    };

    worker.onerror = (event) => {
      event.preventDefault();
      fallback();
    };

    worker.onmessageerror = fallback;

    try {
      worker.postMessage(input satisfies SpectroAnalysisWorkerRequest);
    } catch {
      // Si el navegador no puede clonar la entrada, se conserva el cálculo alternativo.
      fallback();
    }
  });
}

/**
 * Lee una sola instantánea local y calcula Espectro y sus seis paneles de
 * analítica en el mismo Web Worker. Las tablas personales son solo lectura.
 */
export async function getSpectroWorkspace(): Promise<SpectroWorkspaceResult> {
  const [movies, viewings, libraryEntries, collections, collectionMovies] = await Promise.all([
    prismaDb.movies.toArray(),
    prismaDb.viewings.toArray(),
    prismaDb.libraryEntries.toArray(),
    prismaDb.collections.toArray(),
    prismaDb.collectionMovies.toArray()
  ]);

  const candidates = selectSpectroCandidates(movies, viewings, libraryEntries, collectionMovies);
  const favoriteMovieIds = libraryEntries
    .filter((entry) => entry.isFavorite)
    .map((entry) => entry.movieId);
  const analysisInput = { viewings, movies, candidates, favoriteMovieIds };
  const inputFingerprint = getSpectroInputFingerprint(analysisInput);
  const snapshotId = SPECTRO_ALGORITHM_VERSION + ":" + inputFingerprint;
  const cached = await prismaDb.spectroSnapshots.get(snapshotId);
  const cachedAnalysis = cached
    && cached.algorithmVersion === SPECTRO_ALGORITHM_VERSION
    && cached.inputFingerprint === inputFingerprint
    && isValidCachedAnalysis(cached.analysisPayload, inputFingerprint)
    ? cached.analysisPayload
    : undefined;

  const input: SpectroWorkspaceInput = {
    ...(!cachedAnalysis ? { analysisInput } : {}),
    analyticsInput: { movies, viewings, libraryEntries, collections, collectionMovies }
  };
  const calculated = await calculateWorkspaceWithoutBlocking(input);
  const analysis = cachedAnalysis ?? calculated.analysis;

  if (!analysis) {
    throw new Error("Prisma no recibió un resultado válido del análisis de Espectro.");
  }

  const result: SpectroWorkspaceResult = {
    analysis,
    analytics: calculated.analytics
  };

  if (!cachedAnalysis) {
    const snapshot: SpectroSnapshot = {
      id: snapshotId,
      algorithmVersion: analysis.algorithmVersion,
      inputFingerprint: analysis.inputFingerprint,
      computedAt: analysis.computedAt,
      analysisPayload: analysis
    };
    await prismaDb.spectroSnapshots.put(snapshot);
  }

  return result;
}


const discoverAnalysisRequests = new Map<string, Promise<SpectroAnalysis>>();
const EMPTY_DISCOVER_ANALYTICS_INPUT: SpectroWorkspaceInput["analyticsInput"] = {
  movies: [],
  viewings: [],
  libraryEntries: [],
  collections: [],
  collectionMovies: []
};

/**
 * Descubrir solo necesita las afinidades de Espectro para ordenar candidatas.
 * Evita construir los seis paneles analíticos cuando todavía no existe una
 * instantánea y comparte el cálculo si varias páginas llegan simultáneamente.
 */
async function getDiscoverSpectroAnalysis(
  input: SpectroInput,
  inputFingerprint: string,
  snapshotId: string
): Promise<SpectroAnalysis> {
  const cached = await prismaDb.spectroSnapshots.get(snapshotId);
  if (
    cached
    && cached.algorithmVersion === SPECTRO_ALGORITHM_VERSION
    && cached.inputFingerprint === inputFingerprint
    && isValidCachedAnalysis(cached.analysisPayload, inputFingerprint)
  ) return cached.analysisPayload;

  return shareInFlight(discoverAnalysisRequests, snapshotId, async () => {
    // Otra pantalla puede haber escrito la instantánea mientras esta solicitud esperaba.
    const latest = await prismaDb.spectroSnapshots.get(snapshotId);
    if (
      latest
      && latest.algorithmVersion === SPECTRO_ALGORITHM_VERSION
      && latest.inputFingerprint === inputFingerprint
      && isValidCachedAnalysis(latest.analysisPayload, inputFingerprint)
    ) return latest.analysisPayload;

    const calculated = await calculateWorkspaceWithoutBlocking({
      analysisInput: input,
      analyticsInput: EMPTY_DISCOVER_ANALYTICS_INPUT
    });
    const analysis = calculated.analysis;
    if (!analysis) {
      throw new Error("Prisma no recibió un resultado válido del análisis de Espectro.");
    }

    const snapshot: SpectroSnapshot = {
      id: snapshotId,
      algorithmVersion: analysis.algorithmVersion,
      inputFingerprint: analysis.inputFingerprint,
      computedAt: analysis.computedAt,
      analysisPayload: analysis
    };
    await prismaDb.spectroSnapshots.put(snapshot);
    return analysis;
  });
}

/**
 * Clasifica resultados externos con el perfil local ya calculado por Espectro.
 * No guarda candidatas ni transmite señales personales a TMDB.
 */
export async function getSpectroDiscoverRecommendations(
  summaries: readonly TmdbMovieSummary[]
): Promise<{ movieCount: number; recommendations: ReturnType<typeof rankSpectroCandidates> }> {
  if (summaries.length === 0) {
    return { movieCount: 0, recommendations: [] };
  }

  // Descubrir reutiliza la instantánea local de Espectro y evita recalcular
  // los seis paneles de analítica cada vez que se consulta otra página de TMDB.
  const [movies, viewings, libraryEntries, collectionMovies] = await Promise.all([
    prismaDb.movies.toArray(),
    prismaDb.viewings.toArray(),
    prismaDb.libraryEntries.toArray(),
    prismaDb.collectionMovies.toArray()
  ]);
  const favoriteMovieIds = libraryEntries
    .filter((entry) => entry.isFavorite)
    .map((entry) => entry.movieId);
  const localCandidates = selectSpectroCandidates(movies, viewings, libraryEntries, collectionMovies);
  const analysisInput = { movies, viewings, candidates: localCandidates, favoriteMovieIds };
  const inputFingerprint = getSpectroInputFingerprint(analysisInput);
  const snapshotId = SPECTRO_ALGORITHM_VERSION + ":" + inputFingerprint;
  const analysis = await getDiscoverSpectroAnalysis(
    analysisInput,
    inputFingerprint,
    snapshotId
  );
  const localMovies = new Map(movies.map((movie) => [movie.tmdbId, movie]));
  const metadataById = new Map<number, TmdbMovieAnalysisMetadata>();
  const token = getTmdbAccessToken();

  // Solo se enriquece cuando Espectro tiene muestra suficiente para recomendar.
  // Las respuestas ya consultadas se reutilizan desde la caché TMDB y se limitan
  // cuatro películas simultáneas para no saturar la API al explorar páginas.
  if (token && analysis.movieCount >= 3) {
    // La función de recomendación devuelve como máximo 12 candidatas.
    // Enriquecer más títulos no mejoraría el resultado visible y solo añadiría
    // solicitudes de metadatos a TMDB.
    const prioritizedSummaries = summaries.slice(0, 12);
    await runWithConcurrency(prioritizedSummaries, 4, async (summary) => {
      const current = localMovies.get(summary.id);
      if (current && !isSpectroMetadataIncomplete(current)) return;
      try {
        metadataById.set(summary.id, await getMovieAnalysisMetadata(token, summary.id));
      } catch {
        // La clasificación neutral por género, época e idioma sigue disponible.
      }
    });
  }

  const now = new Date().toISOString();
  const candidates: MovieRecord[] = summaries.map((summary) => {
    const current = localMovies.get(summary.id);
    const metadata = metadataById.get(summary.id);
    const details = metadata?.details;
    const directors = metadata?.credits.crew
      .filter((person) => person.job?.toLocaleLowerCase() === "director")
      .map((person) => person.name)
      .filter(Boolean);
    const castMembers = metadata?.credits.cast
      .slice(0, 12)
      .map((person) => person.name)
      .filter(Boolean);
    const genres = details?.genres?.map((genre) => genre.name).filter(Boolean);
    const genreIds = details?.genres?.map((genre) => genre.id)
      .filter((id) => Number.isSafeInteger(id) && id > 0);
    const countries = details?.production_countries
      ?.map((country) => country.name)
      .filter(Boolean);
    const runtime = details?.runtime;
    const releaseDate = details?.release_date ?? summary.release_date ?? current?.releaseDate;
    const releaseYear = releaseDate && /^\d{4}/.test(releaseDate)
      ? Number(releaseDate.slice(0, 4))
      : current?.releaseYear;

    return {
      ...(current ?? {
        id: "tmdb-" + summary.id,
        tmdbId: summary.id,
        title: summary.title,
        genres: [],
        countries: [],
        lastViewingSequence: 0,
        createdAt: now,
        updatedAt: now
      }),
      id: current?.id ?? "tmdb-" + summary.id,
      tmdbId: summary.id,
      title: summary.title,
      originalTitle: summary.original_title ?? details?.original_title ?? current?.originalTitle,
      overview: summary.overview ?? details?.overview ?? current?.overview,
      releaseDate,
      releaseYear,
      runtimeMinutes: typeof runtime === "number" && Number.isFinite(runtime) && runtime > 0
        ? runtime
        : current?.runtimeMinutes,
      voteAverage: summary.vote_average ?? details?.vote_average ?? current?.voteAverage,
      genres: genres?.length ? genres : current?.genres ?? [],
      genreIds: genreIds?.length ? genreIds : summary.genre_ids?.length ? summary.genre_ids : current?.genreIds,
      countries: countries?.length ? countries : current?.countries ?? [],
      directors: directors?.length ? directors : current?.directors ?? [],
      castMembers: castMembers?.length ? castMembers : current?.castMembers ?? [],
      keywords: metadata?.keywords.length ? metadata.keywords : current?.keywords ?? [],
      originalLanguage: details?.original_language ?? summary.original_language ?? current?.originalLanguage,
      posterPath: summary.poster_path ?? details?.poster_path ?? current?.posterPath,
      backdropPath: summary.backdrop_path ?? details?.backdrop_path ?? current?.backdropPath
    };
  });

  const recommendations = rankSpectroCandidates(
    { movies, viewings, favoriteMovieIds },
    candidates,
    analysis,
    { includeWatched: true }
  );

  return { movieCount: analysis.movieCount, recommendations };
}

/** Conserva la API previa para consumidores que solo necesitan el análisis. */
export async function getSpectroAnalysis(): Promise<SpectroAnalysis> {
  return (await getSpectroWorkspace()).analysis;
}
