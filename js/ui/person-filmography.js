/**
 * Agrupa créditos únicos por año. Los créditos sin fecha verificable aparecen
 * primero como «En producción»; el filtro personal compara el ID TMDB.
 */
export function groupPersonFilmography(credits, options) {
  const opts = options || {};
  const seenIds = new Set();
  const unique = [];

  (Array.isArray(credits) ? credits : []).forEach(function (credit) {
    if (!credit || credit.id == null) return;
    const id = String(credit.id).trim();
    const title = String(credit.title || credit.name || "").trim();
    if (!id || !title || seenIds.has(id)) return;
    seenIds.add(id);

    if (opts.filterToCollection &&
        (typeof opts.isMovieInCollection !== "function" || !opts.isMovieInCollection(title, id))) return;

    const release = String(credit.release_date || "").trim();
    const match = release.match(/^(\d{4})(?:-\d{2}-\d{2})?$/);
    const numericYear = match ? Number(match[1]) : 0;
    const year = numericYear >= 1888 && numericYear <= 2200 ? match[1] : "TBA";
    unique.push({ credit: credit, year: year, release: release });
  });

  unique.sort(function (left, right) {
    if (left.year === "TBA" && right.year !== "TBA") return -1;
    if (left.year !== "TBA" && right.year === "TBA") return 1;
    if (left.year !== right.year) return Number(right.year) - Number(left.year);
    return right.release.localeCompare(left.release) ||
      String(left.credit.title || left.credit.name || "").localeCompare(
        String(right.credit.title || right.credit.name || ""), "es"
      );
  });

  const groups = [];
  const byYear = new Map();
  unique.forEach(function (item) {
    let group = byYear.get(item.year);
    if (!group) {
      group = { year: item.year, label: item.year === "TBA" ? "En producción" : item.year, items: [] };
      byYear.set(item.year, group);
      groups.push(group);
    }
    group.items.push(item.credit);
  });
  return groups;
}
