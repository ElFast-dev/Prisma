import { formatDateOnlyLong, formatDateOnlyMonth } from "../core/date-utils.js";
import { buildConfirmedWatchStreakDays } from "../core/watch-streak.js";

export function createWatchStreakView(ctx) {
  function renderConfirmedWatchStreakPanel() {
    const streak = ctx.state && ctx.state.confirmedWatchStreak;
    if (!streak) return "";
    const days = buildConfirmedWatchStreakDays(streak, ctx.state.watched);
    if (!days.length) return "";

    const byMonth = new Map();
    days.forEach(function (day) {
      const monthKey = day.date.slice(0, 7);
      if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
      byMonth.get(monthKey).push(day);
    });
    const weekdays = [
      ["L", "Lunes"], ["M", "Martes"], ["X", "Miércoles"], ["J", "Jueves"],
      ["V", "Viernes"], ["S", "Sábado"], ["D", "Domingo"]
    ];
    const monthEntries = Array.from(byMonth.entries());
    const monthMarkup = monthEntries.map(function (monthEntry, monthIndex) {
      const monthKey = monthEntry[0];
      const monthDays = monthEntry[1];
      const first = monthKey + "-01";
      const parts = monthKey.split("-");
      const year = Number(parts[0]);
      const monthNumber = Number(parts[1]);
      const daysInCalendarMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
      const weekday = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
      const emptyCells = Array.from({ length: weekday }, function () {
        return '<span class="watch-streak-calendar-empty" aria-hidden="true"></span>';
      }).join("");
      const streakDaysByDate = new Map(monthDays.map(function (day) { return [day.date, day]; }));
      const dayCells = Array.from({ length: daysInCalendarMonth }, function (_, index) {
        const number = index + 1;
        const date = monthKey + "-" + String(number).padStart(2, "0");
        const day = streakDaysByDate.get(date);
        if (!day) {
          return '<span class="watch-streak-day-outside" aria-hidden="true"><span class="watch-streak-day-number">' + number + '</span></span>';
        }
        const label = formatDateOnlyLong(day.date) || day.date;
        const movieLabel = day.title
          ? "Película conservada: " + day.title
          : "El día queda confirmado, aunque el título de la película no esté conservado en la colección";
        const extraLabel = day.additionalMovieCount
          ? " Hay " + day.additionalMovieCount + " película(s) adicional(es) registrada(s), pero la racha cuenta un solo día."
          : "";
        const accessible = label + ". Un día cumplido de la racha. " + movieLabel + "." + extraLabel;
        return '<div class="watch-streak-day ' + (day.title ? "has-movie" : "title-missing") +
          '" role="listitem" data-watch-streak-date="' + day.date +
          '" aria-label="' + ctx.escapeHTML(accessible) + '" title="' + ctx.escapeHTML(accessible) + '">' +
          '<span class="watch-streak-day-number">' + number + '</span>' +
          '<span class="watch-streak-day-check" aria-hidden="true">✓</span></div>';
      }).join("");
      const monthLabel = formatDateOnlyMonth(first) || monthKey;
      return '<details class="watch-streak-month" aria-label="' + ctx.escapeHTML(monthLabel) + '"' +
        (monthIndex === monthEntries.length - 1 ? ' open' : '') + '>' +
        '<summary class="watch-streak-month-summary">' +
        '<span class="watch-streak-month-title">' + ctx.escapeHTML(monthLabel) + '</span>' +
        '<span class="watch-streak-month-meta">' + monthDays.length.toLocaleString("es-PA") + ' días confirmados</span>' +
        '</summary>' +
        '<div class="watch-streak-month-calendar">' +
        '<div class="watch-streak-weekdays" aria-hidden="true">' +
        weekdays.map(function (weekdayItem) {
          return '<span title="' + weekdayItem[1] + '">' + weekdayItem[0] + '</span>';
        }).join("") + '</div>' +
        '<div class="watch-streak-days" role="list" aria-label="Días confirmados de ' +
        ctx.escapeHTML(monthLabel) + '">' + emptyCells + dayCells + '</div></div></details>';
    }).join("");

    return '<section class="panel watch-streak-panel" aria-labelledby="confirmed-watch-streak-title">' +
      '<div class="watch-streak-summary"><div class="watch-streak-heading">' +
      '<p class="watch-streak-eyebrow">Racha personal</p><h2 id="confirmed-watch-streak-title">15 de enero de 2026 – 21 de octubre de 2026</h2>' +
      '<p class="metric-note">Un objetivo diario: 1 película cada día, sin saltos.</p></div>' +
      '<div class="watch-streak-total"><strong>' + streak.totalDays.toLocaleString("es-PA") + '</strong><span>días seguidos</span></div></div>' +
      '<p class="watch-streak-explanation">La racha que confirmaste se conserva por fecha, independientemente de que la app anterior haya perdido alguna película. Cada casilla representa un día —nunca dos— y Prisma no inventa títulos para películas que ya no estén en tu colección.</p>' +
      '<div class="watch-streak-months">' + monthMarkup + '</div>' +
      '<p class="watch-streak-legend"><span aria-hidden="true">✓</span> Día de racha confirmado · pasa el cursor o enfoca un día para ver el título conservado, si lo hay.</p>' +
      '</section>';
  }
  return { renderConfirmedWatchStreakPanel };
}
