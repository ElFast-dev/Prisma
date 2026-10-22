import { movieTmdbId, ratingValue, splitList, titleKey } from "./movie-utils.js";
import { dateOnlyInTimeZone } from "./date-utils.js";
import {
  CONFIRMED_STREAK_END_DATE,
  CONFIRMED_STREAK_START_DATE,
  createConfirmedWatchStreakRecord,
  normalizeConfirmedWatchStreak
} from "./watch-streak.js";

export function emptyState() {
  return {
    version: 2,
    rated: [],
    watched: [],
    watchlist: [],
    hidden: [],
    events: [],
    updatedAt: null,
    importedAt: null,
    confirmedWatchStreak: null
  };
}

function isImportedCollectionEntry(entry) {
  return Boolean(entry && (
    entry.addedAtSource === "imported-collection" ||
    entry.source === "imported-json" ||
    entry.source === "imported"
  ));
}

function hasLegacyConfirmedStreakSource(watched) {
  return watched.some(function (entry) {
    if (!isImportedCollectionEntry(entry)) return false;
    const isSourceCode = String(movieTmdbId(entry) || "") === "45612" ||
      titleKey(entry.title) === "source code";
    return isSourceCode && dateOnlyInTimeZone(entry.addedAt) === CONFIRMED_STREAK_START_DATE;
  });
}

/**
 * Recover the known daily challenge from data already saved by earlier Prisma versions.
 * This only activates when the imported collection itself still contains the exact
 * Source Code/TMDB 45612 marker on the confirmed start day in Panama.
 */
function reconcileLegacyConfirmedStreak(watched, incoming) {
  const hasSource = hasLegacyConfirmedStreakSource(watched);
  if (!hasSource) {
    return {
      watched: watched,
      confirmedWatchStreak: normalizeConfirmedWatchStreak(incoming.confirmedWatchStreak),
      recovered: false
    };
  }

  const confirmedWatchStreak = normalizeConfirmedWatchStreak(incoming.confirmedWatchStreak) ||
    createConfirmedWatchStreakRecord(incoming.updatedAt || incoming.importedAt);
  const repairedWatched = watched.map(function (entry) {
    if (!isImportedCollectionEntry(entry) || !entry.addedAt) return entry;
    const localDay = dateOnlyInTimeZone(entry.addedAt);
    if (!localDay || localDay < CONFIRMED_STREAK_START_DATE || localDay > CONFIRMED_STREAK_END_DATE) return entry;
    return Object.assign({}, entry, {
      watchedAt: entry.addedAt,
      watchedAtSource: "imported-explicit",
      watchDateConfidence: "streak-confirmed"
    });
  });

  return {
    watched: repairedWatched,
    confirmedWatchStreak: confirmedWatchStreak,
    recovered: !normalizeConfirmedWatchStreak(incoming.confirmedWatchStreak)
  };
}

export function ensureState(value) {
  const defaults = emptyState();
  const incoming = value && typeof value === "object" ? value : {};
  function validList(name) {
    return Array.isArray(incoming[name]) ? incoming[name].filter(function (entry) { return entry && entry.title; }).map(function (entry) {
      return Object.assign({}, entry, { title: String(entry.title) });
    }) : [];
  }

  const rated = Array.isArray(incoming.rated) ? incoming.rated.filter(function (entry) {
    return entry && entry.title && ratingValue(entry) != null;
  }).map(function (entry) {
    return Object.assign({}, entry, {
      title: String(entry.title),
      rating: ratingValue(entry),
      emotions: Array.isArray(entry.emotions) ? entry.emotions : [],
      genres: splitList(entry.genres),
      tags: splitList(entry.tags)
    });
  }) : [];
  const watchedReconciliation = reconcileLegacyConfirmedStreak(validList("watched"), incoming);

  return Object.assign(defaults, incoming, {
    version: 2,
    rated: rated,
    watched: watchedReconciliation.watched,
    watchlist: validList("watchlist"),
    hidden: validList("hidden"),
    events: Array.isArray(incoming.events) ? incoming.events.slice(0, 80) : [],
    confirmedWatchStreak: watchedReconciliation.confirmedWatchStreak
  });
}
