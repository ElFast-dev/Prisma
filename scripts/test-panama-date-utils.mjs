import assert from "node:assert/strict";
import { dateOnlyInTimeZone, formatPanamaDateMDY, PANAMA_TIME_ZONE } from "../js/core/date-utils.js";

assert.equal(PANAMA_TIME_ZONE, "America/Panama");
assert.equal(dateOnlyInTimeZone("2025-11-06T00:22:23.302Z"), "2025-11-05");
assert.equal(dateOnlyInTimeZone("2026-01-15T05:56:02.305Z"), "2026-01-15");
assert.equal(dateOnlyInTimeZone("2026-07-09T04:56:59.336Z"), "2026-07-08");
assert.equal(dateOnlyInTimeZone("2026-10-22"), "2026-10-22",
  "Una fecha pura YYYY-MM-DD no debe desplazarse por conversión de zona.");
assert.equal(formatPanamaDateMDY("2025-11-06T00:22:23.302Z"), "11/05/2025");
assert.equal(formatPanamaDateMDY("2026-01-15T05:56:02.305Z"), "01/15/2026");
assert.equal(dateOnlyInTimeZone("2026-02-31T11:00:00.000Z"), null);
assert.equal(dateOnlyInTimeZone(null), null);

const start = Date.UTC(2026, 0, 15, 5);
const streak = Array.from({ length: 280 }, (_, index) =>
  dateOnlyInTimeZone(new Date(start + index * 86400000).toISOString()));
assert.equal(streak[0], "2026-01-15");
assert.equal(streak[279], "2026-10-21");
assert.equal(new Set(streak).size, 280);
assert.equal(streak.some(day => day == null), false);

console.log("Zona horaria de visionados verificada: America/Panama, límites de día y 280 fechas consecutivas.");
