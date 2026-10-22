export const PANAMA_TIME_ZONE = "America/Panama";

function validDateOnly(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const day = match[1] + "-" + match[2] + "-" + match[3];
  const timestamp = Date.parse(day + "T00:00:00.000Z");
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== day) return null;
  return day;
}

function timestampForDateValue(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw >= 1e11 ? raw : raw * 1000;
  }

  const value = String(raw).trim();
  if (!value) return null;
  const dateOnly = validDateOnly(value);
  if (dateOnly) return null;
  const epoch = /^\d{10,13}$/.test(value) ? Number(value) : null;
  if (epoch != null) return epoch >= 1e11 ? epoch : epoch * 1000;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;

  const dayPart = value.slice(0, 10);
  if (!validDateOnly(dayPart)) return null;
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const normalized = hasExplicitZone ? value : value + "-05:00";
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** Return a date's calendar day in a named time zone without changing date-only inputs. */
export function dateOnlyInTimeZone(raw, timeZone = PANAMA_TIME_ZONE) {
  if (raw == null || raw === "") return null;
  const dateOnly = typeof raw === "string" ? validDateOnly(raw.trim()) : null;
  if (dateOnly) return dateOnly;
  const timestamp = timestampForDateValue(raw);
  if (!Number.isFinite(timestamp)) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(timestamp));
    const values = Object.create(null);
    parts.forEach(function (part) {
      if (part.type !== "literal") values[part.type] = part.value;
    });
    if (!values.year || !values.month || !values.day) return null;
    return values.year + "-" + values.month + "-" + values.day;
  } catch (_) {
    return null;
  }
}

export function listDateOnlyRange(startValue, endValue) {
  const start = validDateOnly(startValue);
  const end = validDateOnly(endValue);
  if (!start || !end) return [];
  const startTimestamp = Date.parse(start + "T00:00:00.000Z");
  const endTimestamp = Date.parse(end + "T00:00:00.000Z");
  const dayCount = Math.floor((endTimestamp - startTimestamp) / 86400000) + 1;
  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 4000) return [];
  return Array.from({ length: dayCount }, function (_, index) {
    return new Date(startTimestamp + index * 86400000).toISOString().slice(0, 10);
  });
}

export function formatDateOnlyLong(raw) {
  const day = validDateOnly(raw);
  if (!day) return null;
  return new Intl.DateTimeFormat("es-PA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(day + "T12:00:00.000Z"));
}

export function formatDateOnlyMonth(raw) {
  const day = validDateOnly(raw);
  if (!day) return null;
  const month = new Intl.DateTimeFormat("es-PA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(day + "T12:00:00.000Z"));
  return month.charAt(0).toLocaleUpperCase("es-PA") + month.slice(1);
}

export function formatPanamaDateMDY(raw) {
  const day = dateOnlyInTimeZone(raw, PANAMA_TIME_ZONE);
  if (!day) return null;
  const parts = day.split("-");
  return parts[1] + "/" + parts[2] + "/" + parts[0];
}
