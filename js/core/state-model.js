import { ratingValue, splitList } from "./movie-utils.js?v=core-20261022-2";
import { normalizeConfirmedWatchStreak } from "./watch-streak.js";

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

export function ensureState(value) {
  const defaults = emptyState();
  const incoming = value && typeof value === "object" ? value : {};
  function validList(name) {
    return Array.isArray(incoming[name]) ? incoming[name].filter(function (entry) { return entry && entry.title; }).map(function (entry) { return Object.assign({}, entry, {title:String(entry.title)}); }) : [];
  }
  return Object.assign(defaults, incoming, {
    version: 2,
    rated: Array.isArray(incoming.rated) ? incoming.rated.filter(function (entry) { return entry && entry.title && ratingValue(entry) != null; }).map(function (entry) {
      return Object.assign({}, entry, { title: String(entry.title), rating: ratingValue(entry), emotions: Array.isArray(entry.emotions) ? entry.emotions : [], genres: splitList(entry.genres), tags: splitList(entry.tags) });
    }) : [],
    watched: validList("watched"),
    watchlist: validList("watchlist"),
    hidden: validList("hidden"),
    events: Array.isArray(incoming.events) ? incoming.events.slice(0, 80) : [],
    confirmedWatchStreak: normalizeConfirmedWatchStreak(incoming.confirmedWatchStreak)
  });
}
