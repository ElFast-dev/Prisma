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

/**
 * Parse logical CSV/TSV records. Newlines inside quoted cells are data, not
 * record boundaries. Escaped double quotes follow RFC-style CSV semantics.
 */
export function parseCSVRows(text, delimiter) {
  const source = String(text == null ? "" : text).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  function pushRow() {
    row.push(value);
    if (row.some(function (cell) { return String(cell).trim().length > 0; })) rows.push(row);
    row = [];
    value = "";
  }

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (inQuotes && source[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (inQuotes) {
        inQuotes = false;
      } else if (value.length === 0) {
        inQuotes = true;
      } else {
        value += char;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && inQuotes) {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      value += "\n";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i += 1;
      pushRow();
    } else {
      value += char;
    }
  }

  if (inQuotes) throw new Error("El CSV contiene un campo entre comillas sin cerrar.");
  if (value.length > 0 || row.length > 0) pushRow();
  return rows;
}

function mergeUnique(existing, incoming) {
  const result = [];
  const seen = new Set();
  (existing || []).concat(incoming || []).forEach(function (item) {
    const value = String(item == null ? "" : item).trim();
    const key = value.toLocaleLowerCase("es");
    if (!value || seen.has(key)) return;
    seen.add(key);
    result.push(value);
  });
  return result;
}

function mergeDuplicateRow(existing, incoming) {
  const current = existing || {};
  const next = incoming || {};
  const currentOverview = String(current.overview || "");
  const nextOverview = String(next.overview || "");
  return Object.assign({}, current, {
    id: current.id || next.id,
    tmdbId: current.tmdbId || next.tmdbId || null,
    year: current.year || next.year || null,
    genres: mergeUnique(current.genres, next.genres),
    tags: mergeUnique(current.tags, next.tags),
    overview: nextOverview.length > currentOverview.length ? nextOverview : currentOverview,
    source: "csv"
  });
}

export function parseCatalogCSV(text) {
  const source = String(text == null ? "" : text).replace(/^\uFEFF/, "");
  const firstLine = source.split(/\r?\n/, 1)[0] || "";
  const delimiter = firstLine.indexOf("\t") >= 0 && firstLine.indexOf(",") < 0 ? "\t" : ",";
  const rows = parseCSVRows(source, delimiter);
  if (rows.length < 2) throw new Error("El CSV parece vacío o no contiene filas de películas.");

  const headers = rows[0].map(function (header) {
    return String(header || "").toLowerCase().trim().replace(/^"|"$/g, "");
  });
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
  const indexesByKey = new Map();

  for (let i = 1; i < rows.length && catalogRows.length < 150000; i += 1) {
    const values = rows[i];
    const title = values[titleIndex] ? String(values[titleIndex]).trim() : "";
    if (!title) continue;
    let year = yearIndex >= 0 ? Number(values[yearIndex]) || null : null;
    const match = title.match(/\(((?:19|20)\d{2})\)\s*$/);
    if (!year && match) year = Number(match[1]);
    const cleanTitle = title.replace(/\s*\(((?:19|20)\d{2})\)\s*$/, "");
    const rawTmdbId = tmdbIdIndex >= 0 ? String(values[tmdbIdIndex] || "").trim() : "";
    const numericTmdbId = Number(rawTmdbId);
    const tmdbId = /^\d+$/.test(rawTmdbId) && Number.isSafeInteger(numericTmdbId) && numericTmdbId > 0
      ? String(numericTmdbId) : null;
    const normalizedTitle = titleKey(cleanTitle);
    const key = tmdbId ? "tmdb:" + tmdbId : "title:" + normalizedTitle + ":year:" + (year || "unknown");
    if (!normalizedTitle) continue;

    const movie = {
      id: idIndex >= 0 && values[idIndex] ? String(values[idIndex]) : (tmdbId || normalizedTitle),
      tmdbId: tmdbId,
      title: cleanTitle,
      year: year,
      genres: genreIndex >= 0
        ? splitList(values[genreIndex]).filter(function (genre) { return genre.toLowerCase() !== "(no genres listed)"; }).map(displayGenre)
        : [],
      tags: tagsIndex >= 0 ? splitList(values[tagsIndex]) : [],
      overview: overviewIndex >= 0 ? String(values[overviewIndex] || "") : "",
      source: "csv"
    };
    if (indexesByKey.has(key)) {
      const existingIndex = indexesByKey.get(key);
      catalogRows[existingIndex] = mergeDuplicateRow(catalogRows[existingIndex], movie);
    } else {
      indexesByKey.set(key, catalogRows.length);
      catalogRows.push(movie);
    }
  }

  if (!catalogRows.length) throw new Error("No se encontraron filas válidas en el catálogo.");
  return catalogRows;
}
