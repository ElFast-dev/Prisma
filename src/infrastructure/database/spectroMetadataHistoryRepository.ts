import type { AppMetadata, MovieRecord } from "../../domain/types";
import {
  createSpectroMetadataSnapshot,
  getSpectroMetadataFingerprint,
  isSpectroMetadataSnapshot,
  type SpectroMetadataSnapshot,
  type SpectroMetadataSnapshotSource
} from "../../domain/spectroMetadataHistory";
import { prismaDb } from "./database";

export const SPECTRO_METADATA_HISTORY_PREFIX = "spectro:metadata-history:v1:";
const MAX_SNAPSHOTS_PER_MOVIE = 32;

export function getSpectroMetadataHistoryKey(movieId: string): string {
  return SPECTRO_METADATA_HISTORY_PREFIX + encodeURIComponent(movieId);
}

function parseHistory(value: string | undefined): SpectroMetadataSnapshot[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSpectroMetadataSnapshot);
  } catch {
    return [];
  }
}

function compactHistory(
  existing: readonly SpectroMetadataSnapshot[],
  incoming: SpectroMetadataSnapshot
): SpectroMetadataSnapshot[] {
  const byDay = new Map<string, SpectroMetadataSnapshot>();
  for (const snapshot of existing) {
    const day = snapshot.observedAt.slice(0, 10);
    const previous = byDay.get(day);
    if (!previous || Date.parse(snapshot.observedAt) > Date.parse(previous.observedAt)) {
      byDay.set(day, snapshot);
    }
  }

  const day = incoming.observedAt.slice(0, 10);
  const previous = byDay.get(day);
  if (
    !previous
    || Date.parse(incoming.observedAt) >= Date.parse(previous.observedAt)
  ) {
    byDay.set(day, incoming);
  }

  const ordered = [...byDay.values()].sort((left, right) => (
    left.observedAt.localeCompare(right.observedAt)
  ));
  if (ordered.length <= MAX_SNAPSHOTS_PER_MOVIE) return ordered;

  // Preserve the first known observation as the historical baseline, plus the
  // most recent updates. Old windows remain evaluable without unbounded storage.
  return [ordered[0], ...ordered.slice(-(MAX_SNAPSHOTS_PER_MOVIE - 1))];
}

/**
 * Appends one local, metadata-only observation. Callers may use this inside an
 * existing Dexie transaction that includes appMetadata, or as a standalone write.
 * One observation per UTC day is enough because evaluation cuts use calendar days.
 */
export async function appendSpectroMetadataSnapshot(
  movie: MovieRecord,
  observedAt: string,
  source: SpectroMetadataSnapshotSource
): Promise<void> {
  const snapshot = createSpectroMetadataSnapshot(movie, observedAt, source);
  if (!snapshot) return;
  const key = getSpectroMetadataHistoryKey(movie.id);
  const current = await prismaDb.appMetadata.get(key);
  const existing = parseHistory(current?.value);
  const next = compactHistory(existing, snapshot);
  if (JSON.stringify(existing) === JSON.stringify(next)) return;

  const entry: AppMetadata = { key, value: JSON.stringify(next) };
  await prismaDb.appMetadata.put(entry);
}

/**
 * Reads the recorded history for a set of titles. Old database records that
 * predate this feature receive a conservative one-off observation at updatedAt.
 * No createdAt or viewing date is used to backdate metadata knowledge.
 */
export async function getSpectroMetadataSnapshots(
  movies: readonly MovieRecord[]
): Promise<SpectroMetadataSnapshot[]> {
  const entries = await Promise.all(movies.map((movie) => (
    prismaDb.appMetadata.get(getSpectroMetadataHistoryKey(movie.id))
  )));
  const snapshots: SpectroMetadataSnapshot[] = [];
  movies.forEach((movie, index) => {
    const history = parseHistory(entries[index]?.value);
    if (history.length > 0) {
      snapshots.push(...history);
      return;
    }
    const legacy = createSpectroMetadataSnapshot(
      movie,
      movie.updatedAt,
      "legacy-updated-at"
    );
    if (legacy) snapshots.push(legacy);
  });
  return snapshots;
}

/** Limpia únicamente historial derivado, nunca colas ni preferencias locales. */
export async function clearSpectroMetadataHistory(): Promise<void> {
  await prismaDb.appMetadata
    .toCollection()
    .filter((entry) => entry.key.startsWith(SPECTRO_METADATA_HISTORY_PREFIX))
    .delete();
}

/** Expuesto para pruebas de persistencia y deduplicación. */
export function hasSameSpectroMetadataFeatures(
  left: SpectroMetadataSnapshot,
  right: SpectroMetadataSnapshot
): boolean {
  return left.movieId === right.movieId
    && getSpectroMetadataFingerprint(left) === getSpectroMetadataFingerprint(right);
}
