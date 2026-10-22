import { displayGenre, splitList, titleKey } from "../core/movie-utils.js";

export function parseCSVLine(line, delimiter) {
  const result = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { value += '"'; i += 1; }
      else inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(value);
      value = "";
    } else value += char;
  }
  result.push(value);
  return result;
}

export function parseCatalogCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(function (line) { return line.trim().length > 0; });
  if (lines.length < 2) throw new Error("El CSV parece vacío o no contiene filas de películas.");
  const delimiter = lines[0].indexOf("\t") >= 0 && lines[0].indexOf(",") < 0 ? "\t" : ",";
  const headers = parseCSVLine(lines[0], delimiter).map(function (header) { return header.toLowerCase().trim().replace(/^"|"$/g, ""); });
  function column(names) {
    for (let i = 0; i < names.length; i += 1) {
      const index = headers.indexOf(names[i]);
      if (index >= 0) return index;
    }
    return -1;
  }
  const titleIndex = column(["title", "t", "name", "original_title"]);
  if (titleIndex < 0) throw new Error("El CSV necesita una columna title o name.");
  const yearIndex = column(["year", "release_year", "year_released"]);
  const genreIndex = column(["genres", "genre"]);
  const tagsIndex = column(["tags", "keywords", "labels"]);
  const overviewIndex = column(["overview", "plot", "description", "synopsis"]);
  const idIndex = column(["movieid", "movie_id", "id"]);
  const tmdbIdIndex = column(["tmdbid", "tmdb_id"]);
  const catalogRows = [];
  const seen = new Set();
  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCSVLine(lines[i], delimiter);
    const title = values[titleIndex] ? values[titleIndex].trim() : "";
    if (!title) continue;
    let year = yearIndex >= 0 ? Number(values[yearIndex]) || null : null;
    const match = title.match(/\(((?:19|20)\d{2})\)\s*$/);
    if (!year && match) year = Number(match[1]);
    const cleanTitle = title.replace(/\s*\(((?:19|20)\d{2})\)\s*$/, "");
    const rawTmdbId = tmdbIdIndex >= 0 ? String(values[tmdbIdIndex] || "").trim() : "";
    const numericTmdbId = Number(rawTmdbId);
    const tmdbId = /^\d+$/.test(rawTmdbId) && Number.isSafeInteger(numericTmdbId) && numericTmdbId > 0 ? String(numericTmdbId) : null;
    const normalizedTitle = titleKey(cleanTitle);
    const key = tmdbId ? "tmdb:" + tmdbId : "title:" + normalizedTitle + ":year:" + (year || "unknown");
    if (!normalizedTitle || seen.has(key)) continue;
    seen.add(key);
    catalogRows.push({
      id: idIndex >= 0 && values[idIndex] ? String(values[idIndex]) : (tmdbId || normalizedTitle),
      tmdbId: tmdbId,
      title: cleanTitle,
      year: year,
      genres: genreIndex >= 0 ? splitList(values[genreIndex]).filter(function (genre) { return genre.toLowerCase() !== "(no genres listed)"; }).map(displayGenre) : [],
      tags: tagsIndex >= 0 ? splitList(values[tagsIndex]) : [],
      overview: overviewIndex >= 0 ? values[overviewIndex] || "" : "",
      source: "csv"
    });
    if (catalogRows.length >= 150000) break;
  }
  if (!catalogRows.length) throw new Error("No se encontraron filas válidas en el catálogo.");
  return catalogRows;
}
