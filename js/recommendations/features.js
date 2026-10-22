import { normalizeGenreKey, uniqueStrings } from "../core/movie-utils.js";

const MIN_RELEASE_YEAR = 1888;
const MAX_RELEASE_YEAR = 2100;
const MAX_OVERVIEW_TERMS = 8;

const STOP_WORDS = new Set((
  "a about above after again against all am an and any are as at be because been before being below between both " +
  "but by can could did do does doing down during each few for from further had has have having he her here hers " +
  "herself him himself his how i if in into is it its itself just me more most my myself no nor not of off on once " +
  "only or other our ours ourselves out over own same she should so some such than that the their theirs them " +
  "themselves then there these they this those through to too under until up very was we were what when where which " +
  "while who whom why will with would you your yours yourself yourselves aun aunque bajo cabe cada casi como con " +
  "contra cual cuales cuando cuanto de del desde donde dos durante e el ella ellas ello ellos en era erais eran eras " +
  "eres es esa esas ese eso esos esta estaba estaban estado estamos estan estas este esto estos fue fuera fueron fui " +
  "fuimos ha habia habian habias han hasta hay la las le les lo los mas me mi mis mucha muchas mucho muchos muy nada " +
  "ni no nos nuestra nuestras nuestro nuestros o os otra otras otro otros para parece pero poca pocas poco pocos por " +
  "porque que quien quienes se sea sean ser si sido sin sobre sois somos son su sus tal tambien te tener tiene tienen " +
  "toda todas todo todos tras tu tus un una unas uno unos vosotras vosotros y ya"
).split(/\s+/));

function validYear(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (!/^\d{4}$/.test(text)) return null;
  const year = Number(text);
  return Number.isInteger(year) && year >= MIN_RELEASE_YEAR && year <= MAX_RELEASE_YEAR ? year : null;
}

function releaseYear(record) {
  if (!record || typeof record !== "object") return null;
  const candidates = [record.year, record.releaseYear, record.release_year];
  for (const candidate of candidates) {
    const year = validYear(candidate);
    if (year != null) return year;
  }
  const releaseDate = String(record.releaseDate || record.release_date || "").trim();
  const match = releaseDate.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return null;
  const year = validYear(match[1]);
  if (year == null) return null;
  if (!match[2]) return year;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  if (!match[3]) return year;
  const day = Number(match[3]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth ? year : null;
}

function listValue(record, field) {
  if (!record || record[field] == null) return [];
  if (Array.isArray(record[field])) return record[field];
  if (typeof record[field] === "string") return record[field].split(/[|;,]/);
  return [];
}

function combinedList(entry, movie, field, limit) {
  const values = listValue(entry, field).concat(listValue(movie, field))
    .map(value => String(value == null ? "" : value).trim())
    .filter(Boolean);
  const unique = uniqueStrings(values);
  return Number.isFinite(limit) ? unique.slice(0, limit) : unique;
}

function normalizedName(value) {
  return String(value == null ? "" : value).toLocaleLowerCase("es")
    .normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
}

function overviewTerms(overview) {
  const normalized = String(overview || "").toLocaleLowerCase("es")
    .normalize("NFKD").replace(/\p{Diacritic}/gu, "");
  const words = normalized.match(/\p{L}{4,}/gu) || [];
  const firstSeen = new Map();
  const counts = new Map();
  words.forEach((word, index) => {
    if (STOP_WORDS.has(word)) return;
    if (!firstSeen.has(word)) firstSeen.set(word, index);
    counts.set(word, (counts.get(word) || 0) + 1);
  });
  const useful = Array.from(counts.keys()).filter(word => word.length >= 4);
  const repeated = useful.filter(word => counts.get(word) > 1)
    .sort((a, b) => counts.get(b) - counts.get(a) || firstSeen.get(a) - firstSeen.get(b));
  return (repeated.length >= 3 ? repeated : useful.sort((a, b) => firstSeen.get(a) - firstSeen.get(b)))
    .slice(0, MAX_OVERVIEW_TERMS);
}

function firstPositiveNumber(entry, movie, field) {
  for (const record of [entry, movie]) {
    const value = Number(record && record[field]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function collectionTitle(record) {
  if (!record) return "";
  if (typeof record.collectionName === "string") return record.collectionName;
  if (record.collection && typeof record.collection === "object") return record.collection.name || "";
  return typeof record.belongsToCollection === "string" ? record.belongsToCollection : "";
}

function movieRuntimeBucket(runtime) {
  if (!runtime || !Number.isFinite(runtime)) return "";
  if (runtime < 80) return "muy corta";
  if (runtime < 100) return "corta";
  if (runtime < 120) return "media";
  if (runtime < 140) return "larga";
  return "muy larga";
}

/** Derive recommendation signals from film metadata only, never from feelings or personal notes. */
export function movieFeatures(movie, ratingEntry, options) {
  const entry = ratingEntry || {};
  const record = movie || {};
  const features = [];
  features.push(...combinedList(entry, record, "genres")
    .map(genre => "género: " + normalizeGenreKey(genre)));
  features.push(...combinedList(entry, record, "tags", 18)
    .map(tag => "tema: " + normalizedName(tag)));
  features.push(...combinedList(entry, record, "cast", 8)
    .map(name => "actor: " + normalizedName(name)));
  features.push(...combinedList(entry, record, "directors", 2)
    .map(name => "director: " + normalizedName(name)));
  features.push(...combinedList(entry, record, "writers", 4)
    .map(name => "guionista: " + normalizedName(name)));
  features.push(...combinedList(entry, record, "composers", 3)
    .map(name => "compositor: " + normalizedName(name)));
  features.push(...combinedList(entry, record, "productionCompanies", 4)
    .map(name => "productora: " + normalizedName(name)));
  features.push(...combinedList(entry, record, "productionCountries", 3)
    .map(name => "país: " + normalizedName(name)));
  features.push(...combinedList(entry, record, "spokenLanguages", 3)
    .map(name => "idioma hablado: " + normalizedName(name)));

  const originalLanguage = normalizedName(record.originalLanguage || entry.originalLanguage || "");
  const collection = normalizedName(collectionTitle(record) || collectionTitle(entry));
  if (originalLanguage) features.push("idioma original: " + originalLanguage);
  if (collection) features.push("saga: " + collection);

  const runtime = firstPositiveNumber(entry, record, "runtime");
  const runtimeBucket = movieRuntimeBucket(runtime);
  if (runtimeBucket) features.push("duración: " + runtimeBucket);

  const overview = String(record.overview || entry.overview || "").trim();
  overviewTerms(overview).forEach(term => features.push("trama: " + term));

  if (!options || options.includeDecade !== false) {
    const year = releaseYear(entry) || releaseYear(record);
    if (year != null) features.push("década: " + String(Math.floor(year / 10) * 10));
  }
  return uniqueStrings(features);
}
