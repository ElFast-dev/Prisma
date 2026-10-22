import { dateOnlyInTimeZone, listDateOnlyRange } from "./date-utils.js";

export const CONFIRMED_STREAK_START_DATE = "2026-01-15";
export const CONFIRMED_STREAK_END_DATE = "2026-10-21";
export const CONFIRMED_STREAK_DAILY_TARGET = 1;
export const CONFIRMED_STREAK_SOURCE = "user-confirmed";

const EXPECTED_STREAK_DAYS = 280;

export function createConfirmedWatchStreakRecord(confirmedAt) {
  const days = listDateOnlyRange(CONFIRMED_STREAK_START_DATE, CONFIRMED_STREAK_END_DATE);
  if (days.length !== EXPECTED_STREAK_DAYS) return null;
  const timestamp = confirmedAt && Number.isFinite(Date.parse(confirmedAt))
    ? new Date(confirmedAt).toISOString()
    : new Date().toISOString();
  return {
    source: CONFIRMED_STREAK_SOURCE,
    startDate: CONFIRMED_STREAK_START_DATE,
    endDate: CONFIRMED_STREAK_END_DATE,
    dailyTarget: CONFIRMED_STREAK_DAILY_TARGET,
    totalDays: days.length,
    confirmedAt: timestamp
  };
}

export function normalizeConfirmedWatchStreak(value) {
  if (!value || typeof value !== "object" ||
    value.source !== CONFIRMED_STREAK_SOURCE ||
    value.startDate !== CONFIRMED_STREAK_START_DATE ||
    value.endDate !== CONFIRMED_STREAK_END_DATE ||
    Number(value.dailyTarget) !== CONFIRMED_STREAK_DAILY_TARGET) return null;
  const days = listDateOnlyRange(value.startDate, value.endDate);
  if (days.length !== EXPECTED_STREAK_DAYS || Number(value.totalDays) !== EXPECTED_STREAK_DAYS) return null;
  const confirmedAt = value.confirmedAt && Number.isFinite(Date.parse(value.confirmedAt))
    ? new Date(value.confirmedAt).toISOString()
    : null;
  return {
    source: CONFIRMED_STREAK_SOURCE,
    startDate: CONFIRMED_STREAK_START_DATE,
    endDate: CONFIRMED_STREAK_END_DATE,
    dailyTarget: CONFIRMED_STREAK_DAILY_TARGET,
    totalDays: days.length,
    confirmedAt: confirmedAt
  };
}

/**
 * A user-confirmed streak is a day ledger, separate from movie rows. It is never
 * used to invent film identities. For each date, one streak completion is emitted
 * even if no movie record remains or if multiple movies share that calendar day.
 */
export function buildConfirmedWatchStreakDays(streak, watchedEntries) {
  const normalized = normalizeConfirmedWatchStreak(streak);
  if (!normalized) return [];
  const days = listDateOnlyRange(normalized.startDate, normalized.endDate);
  const byDay = new Map();

  (Array.isArray(watchedEntries) ? watchedEntries : []).forEach(function (entry) {
    if (!entry || !entry.title || !entry.watchedAt) return;
    const dateConfidence = entry.watchDateConfidence;
    const reliable = dateConfidence === "streak-confirmed" ||
      dateConfidence === "explicit-source" ||
      entry.watchedAtSource === "user-confirmed";
    if (!reliable) return;
    const day = dateOnlyInTimeZone(entry.watchedAt);
    if (!day || day < normalized.startDate || day > normalized.endDate) return;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push({
      title: String(entry.title),
      watchedAt: String(entry.watchedAt)
    });
  });

  return days.map(function (day) {
    const movies = (byDay.get(day) || []).sort(function (left, right) {
      return left.watchedAt.localeCompare(right.watchedAt) || left.title.localeCompare(right.title, "es");
    });
    return {
      date: day,
      count: 1,
      title: movies.length ? movies[0].title : null,
      additionalMovieCount: Math.max(0, movies.length - 1),
      confirmed: true,
      source: CONFIRMED_STREAK_SOURCE
    };
  });
}
