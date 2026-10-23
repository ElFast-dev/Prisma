import assert from "node:assert/strict";
import { createCollectionViews } from "../js/ui/collection-views.js";
import { createPageViews } from "../js/ui/page-views.js";

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

const history = [
  { title: "Película antigua", tmdbId: "101", year: "2010", watchedAt: "2026-01-01T12:00:00Z", rating: 7 },
  { title: "About Time <Especial>", tmdbId: "102", year: "2013", releaseDate: "2013-09-04", overview: "Una historia & otra", posterUrl: "https://example.invalid/poster.jpg", watchedAt: "2026-10-21T12:00:00Z", rating: 9, voteAverage: 7.8, trustedScore: true },
  { title: "Película dos", tmdbId: "103", year: "2020", watchedAt: "2026-10-20T12:00:00Z", rating: 8 },
  { title: "Película tres", tmdbId: "104", year: "2021", watchedAt: "2026-10-19T12:00:00Z", rating: 6 },
  { title: "Película cuatro", tmdbId: "105", year: "2022", watchedAt: "2026-10-18T12:00:00Z", rating: 10 }
];
const pending = [
  { title: "Pendiente <futura>", tmdbId: "201", year: "2027", overview: "Sinopsis pendiente", rating: 0 }
];
const hidden = [
  { title: "Oculta", tmdbId: "301", year: "2018", overview: "No mostrar como vista" }
];

const refreshedRoot = { innerHTML: "" };
const ctx = {
  collectionMode: "movies",
  collectionTab: "history",
  collectionLayout: "list",
  collectionQuery: 'About <Time> "Especial"',
  collectionSort: "added",
  collectionDirection: "desc",
  collectionGenres: ["Drama"],
  onlyReleased: false,
  showCollectionSearch: true,
  escapeHTML,
  ratingValue: item => item.rating || 0,
  hasTrustedTMDBScore: item => Boolean(item.trustedScore),
  dateLabel: value => "Fecha " + value,
  dateScore: value => Date.parse(value || 0) || 0,
  latestRecordDate: item => item.watchedAt || "",
  isInHistory: title => history.some(item => item.title === title),
  isInWatchlist: title => pending.some(item => item.title === title),
  getCollectionItems(tab) {
    return ({ history, pending, hidden })[tab] || [];
  },
  infoButton: () => '<button type="button" data-info="collection">Info</button>',
  $: selector => selector === "#collectionResultsRoot" ? refreshedRoot : null
};

const views = createCollectionViews(ctx);
const pageViews = createPageViews(ctx);

// The general page factory must preserve the collection renderer API as direct delegates.
for (const name of ["recentPoster", "collectionRow", "collectionCompactCard", "renderCollectionContent", "refreshCollectionContent", "renderLibrary"]) {
  assert.equal(pageViews[name], views[name], "createPageViews debe conservar la API pública de Colección: " + name);
}

// Collection page keeps tabs, counts, accessible search, filters, sorting and layout controls.
const library = views.renderLibrary();
assert.match(library, /Tipo de colección/);
assert.match(library, /Vistas de la colección/);
assert.match(library, /Historial<span>5<\/span>/);
assert.match(library, /Pendientes<span>1<\/span>/);
assert.match(library, /Ocultos<span>1<\/span>/);
assert.match(library, /Buscar solo en mi colección/);
assert.match(library, /About &lt;Time&gt; &quot;Especial&quot;/);
assert.match(library, /data-action="open-sort"/);
assert.match(library, /data-action="open-genres"/);
assert.match(library, /data-action="toggle-layout"/);

// History displays the four most recent posters and safely escaped film metadata.
const historyMarkup = views.renderCollectionContent();
assert.match(historyMarkup, /Añadidos recientemente/);
const recentSection = historyMarkup.slice(historyMarkup.indexOf('<section class="recent-section">'), historyMarkup.indexOf('<div class="collection-list-heading">'));
assert.equal((recentSection.match(/class="recent-movie"/g) || []).length, 4);
assert.doesNotMatch(recentSection, /Película antigua/);
assert.match(historyMarkup, /About Time &lt;Especial&gt;/);
assert.match(historyMarkup, /Una historia &amp; otra/);
assert.match(historyMarkup, /Fecha 2013-09-04/);
assert.match(historyMarkup, /7\.8/);
assert.match(historyMarkup, /9\/10/);

// Compact cards preserve movie identity and distinguish seen/pending/hidden markers.
ctx.collectionLayout = "compact";
const compactMarkup = views.renderCollectionContent();
assert.match(compactMarkup, /collection-compact-grid/);
assert.match(compactMarkup, /collection-marker seen/);
assert.match(views.collectionCompactCard(pending[0]), /collection-marker pending/);
assert.match(views.collectionCompactCard(hidden[0]), /collection-marker hidden/);
assert.match(compactMarkup, /data-tmdb-id="102"/);

// The pending tab keeps its release filter and does not show a personal-rating badge.
ctx.collectionTab = "pending";
ctx.collectionLayout = "list";
ctx.onlyReleased = true;
const pendingMarkup = views.renderLibrary();
assert.match(pendingMarkup, /data-action="toggle-released"/);
assert.match(pendingMarkup, /aria-pressed="true"/);
const pendingContent = views.renderCollectionContent();
assert.match(pendingContent, /Pendiente &lt;futura&gt;/);
assert.doesNotMatch(pendingContent, /personal-score/);

// Empty hidden state and Lists mode retain their user-facing content/actions.
hidden.length = 0;
ctx.collectionTab = "hidden";
ctx.collectionLayout = "list";
const hiddenMarkup = views.renderCollectionContent();
assert.match(hiddenMarkup, /No has ocultado ninguna película/);
assert.match(hiddenMarkup, /data-nav="catalog"/);

ctx.collectionMode = "lists";
const listsMarkup = views.renderLibrary();
assert.match(listsMarkup, /class="system-lists-grid"/);
assert.match(listsMarkup, /data-action="collection-open-tab" data-tab="history"/);
assert.match(listsMarkup, /data-action="collection-open-tab" data-tab="pending"/);
assert.match(listsMarkup, /data-action="collection-open-tab" data-tab="hidden"/);
assert.match(listsMarkup, /5/);
assert.match(listsMarkup, /1/);

// Partial refresh still updates the expected result root, not the whole page.
ctx.collectionMode = "movies";
ctx.collectionTab = "pending";
views.refreshCollectionContent();
assert.match(refreshedRoot.innerHTML, /collection-list-heading/);
assert.match(refreshedRoot.innerHTML, /Pendientes/);

console.log("Vistas de Colección correctas: Historial, Pendientes, Ocultos, tarjetas compactas, listas, escape HTML y refresco parcial.");
