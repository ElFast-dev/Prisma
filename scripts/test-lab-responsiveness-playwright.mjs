import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.PRISMA_URL || "http://127.0.0.1:8765/";
const browser = await chromium.launch({ headless: true });
const performanceEvents = [];
const errors = [];
const results = {
  baseUrl: new URL(baseUrl).origin,
  syntheticRatings: 351,
  navigationToHeadingMs: null,
  firstLabRenderMs: null,
  calculationTimes: [],
  responsiveTicks: 0,
  metricsStatus: null,
  metricRunCountsBeforeReport: {},
  metricRunCountsAfterReport: {},
  reportSchema: null,
  reportCoverage: null,
  reportRatedEntries: null,
  cancellationAndReentryPassed: false,
  emptyProfilePassed: false
};

function captureLogs(page) {
  page.on("console", message => {
    const text = message.text();
    if (!text.startsWith("[Prisma performance]")) return;
    const start = text.indexOf("{");
    if (start < 0) return;
    try {
      const item = JSON.parse(text.slice(start));
      if (item && typeof item.operation === "string" &&
          typeof item.durationMs === "number" &&
          Number.isFinite(item.durationMs) &&
          Number.isFinite(item.sampleCount) &&
          !("title" in item) && !("tmdbId" in item) && !("rating" in item)) {
        performanceEvents.push(item);
      }
    } catch (_) {
      // Non-JSON console chatter is not a performance sample.
    }
  });
  page.on("pageerror", error => errors.push(String(error && error.message || error)));
}

function makeFixture() {
  const rated = [];
  const catalog = [];
  const genreNames = ["Drama", "Ciencia ficción", "Misterio", "Suspenso", "Fantasía", "Comedia", "Aventura"];
  for (let index = 0; index < 351; index += 1) {
    const id = String(700000 + index);
    const year = 1975 + (index % 49);
    const genres = [genreNames[index % genreNames.length], genreNames[(index * 3 + 2) % genreNames.length]];
    const tags = ["concepto " + (index % 19), "estructura " + (index % 13), "secreto " + (index % 11)];
    const common = {
      id: id,
      tmdbId: id,
      tmId: id,
      title: "Synthetic Film " + String(index).padStart(3, "0"),
      year: year,
      releaseDate: year + "-02-14",
      genres: genres,
      tags: tags,
      overview: "Una investigadora descubre una idea oculta tras varias pistas. " +
        "El misterio cambia de sentido cuando aparecen nuevas pruebas. ".repeat(3),
      cast: ["Actor Sintético " + (index % 37), "Actor Secundario " + (index % 23)],
      directors: ["Directora Sintética " + (index % 17)],
      writers: ["Guionista Sintético " + (index % 15)],
      composers: ["Compositor Sintético " + (index % 9)],
      productionCompanies: ["Estudio Sintético " + (index % 8)],
      productionCountries: ["United States"],
      spokenLanguages: ["English"],
      originalLanguage: "en",
      runtime: 85 + (index % 8) * 7,
      source: "synthetic-test"
    };
    const rating = 1 + ((index * 7 + Math.floor(index / 7)) % 10);
    rated.push({
      id: "rating-" + id,
      tmdbId: id,
      tmId: id,
      title: common.title,
      year: year,
      rating: rating,
      genres: genres.slice(),
      tags: tags.slice(),
      overview: common.overview,
      cast: common.cast.slice(),
      directors: common.directors.slice(),
      writers: common.writers.slice(),
      composers: common.composers.slice(),
      productionCompanies: common.productionCompanies.slice(),
      productionCountries: common.productionCountries.slice(),
      spokenLanguages: common.spokenLanguages.slice(),
      originalLanguage: common.originalLanguage,
      runtime: common.runtime,
      source: "synthetic-test"
    });
    catalog.push(common);
  }
  for (let index = 0; index < 40; index += 1) {
    const id = String(800000 + index);
    const year = 1990 + index % 30;
    const genres = [genreNames[(index * 2 + 1) % genreNames.length], genreNames[(index * 5 + 3) % genreNames.length]];
    catalog.push({
      id: id,
      tmdbId: id,
      tmId: id,
      title: "Synthetic Discovery Candidate " + String(index).padStart(2, "0"),
      year: year,
      releaseDate: year + "-06-20",
      genres: genres,
      tags: ["candidata " + (index % 12), "paradoja " + (index % 10)],
      overview: "Una premisa original presenta pistas verificables y una revelación inesperada.",
      cast: ["Reparto Candidato " + (index % 20)],
      directors: ["Dirección Candidata " + (index % 10)],
      writers: ["Guion Candidato " + (index % 8)],
      productionCompanies: ["Estudio Candidato " + (index % 5)],
      productionCountries: ["United Kingdom"],
      spokenLanguages: ["English"],
      originalLanguage: "en",
      runtime: 91 + index % 50,
      source: "synthetic-test"
    });
  }
  return {
    state: {
      version: 2,
      rated,
      watched: [],
      watchlist: [],
      hidden: [],
      events: [],
      updatedAt: "2026-10-23T18:00:00.000Z",
      importedAt: "2026-10-23T18:00:00.000Z",
      confirmedWatchStreak: null
    },
    catalog
  };
}

async function seedProfile(page, fixture) {
  await page.evaluate(({ state, catalog }) => new Promise((resolve, reject) => {
    const request = indexedDB.open("prisma-local-v1", 1);
    request.onerror = () => reject(request.error || new Error("synthetic fixture database open failed"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv", { keyPath: "key" });
    };
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("kv")) {
        database.close();
        reject(new Error("Prisma storage schema was not initialized"));
        return;
      }
      const transaction = database.transaction("kv", "readwrite");
      const store = transaction.objectStore("kv");
      store.put({ key: "state", value: state });
      store.put({ key: "catalogCustom", value: catalog });
      transaction.oncomplete = () => { database.close(); resolve(true); };
      transaction.onerror = () => { database.close(); reject(transaction.error || new Error("synthetic fixture write failed")); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error("synthetic fixture write aborted")); };
    };
  }), fixture);
}

async function newTestPage() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const page = await context.newPage();
  captureLogs(page);
  await page.goto(baseUrl + (baseUrl.includes("?") ? "&" : "?") + "lab-regression=" + Date.now(), {
    waitUntil: "networkidle",
    timeout: 60000
  });
  await page.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  return { context, page };
}

function countOperations(operation) {
  return performanceEvents.filter(item => item.operation === operation);
}

try {
  const fixture = makeFixture();
  const { context, page } = await newTestPage();
  await seedProfile(page, fixture);
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate(() => {
    window.__labResponsivenessTicks = 0;
    window.__labResponsivenessTimer = window.setInterval(() => { window.__labResponsivenessTicks += 1; }, 10);
  });

  const clickStartedAt = Date.now();
  await page.locator(".topbar [data-nav='lab']").click({ timeout: 5000 });
  await page.locator("main h1").filter({ hasText: "Laboratorio" }).waitFor({ state: "visible", timeout: 2500 });
  results.navigationToHeadingMs = Date.now() - clickStartedAt;
  if (results.navigationToHeadingMs > 1500) {
    throw new Error("Lab heading appeared too late: " + results.navigationToHeadingMs + "ms");
  }
  await page.locator("[data-lab-metrics-state='loading']").waitFor({ state: "visible", timeout: 3000 });
  const immediateDom = await page.evaluate(() => ({
    heading: document.querySelector("main h1")?.innerText || "",
    status: document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState || "",
    controls: {
      diagnosticCopy: Boolean(document.querySelector("[data-action='copy-recommendation-diagnostics']")),
      ridge: Boolean(document.querySelector("[data-action='run-ridge-experiment']")),
      normalization: Boolean(document.querySelector("[data-action='run-influence-normalization-experiment']")),
      featureLabels: Boolean(document.querySelector("#diagnosticFeatureLabels"))
    }
  }));
  assert.equal(immediateDom.heading, "Laboratorio");
  assert.equal(immediateDom.status, "loading");
  assert.ok(Object.values(immediateDom.controls).every(Boolean), "Principal Lab controls must be present on first render");
  results.firstLabRenderMs = performanceEvents.find(item => item.operation === "renderLab")?.durationMs ?? null;

  const labelsControl = page.locator("#diagnosticFeatureLabels");
  await labelsControl.check({ timeout: 2000 });
  await labelsControl.uncheck({ timeout: 2000 });
  await page.waitForFunction(() => {
    const state = document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState;
    return state === "ready" || state === "error";
  }, null, { timeout: 120000 });
  results.metricsStatus = await page.locator("[data-lab-metrics-state]").getAttribute("data-lab-metrics-state");
  results.responsiveTicks = await page.evaluate(() => {
    window.clearInterval(window.__labResponsivenessTimer);
    return window.__labResponsivenessTicks || 0;
  });
  assert.equal(results.metricsStatus, "ready", "Synthetic 351-rating profile must finish all automatic metrics");
  assert.ok(results.responsiveTicks >= 3, "UI task heartbeat must continue while metrics compute: ticks=" + results.responsiveTicks);

  const countBefore = operation => countOperations(operation).length;
  results.metricRunCountsBeforeReport = {
    ratingEvaluation: countBefore("rating-evaluation"),
    rankingEvaluation: countBefore("ranking-cross-validation"),
    diversityEvaluation: countBefore("ranking-diversity"),
    buildProfile: countBefore("buildProfile")
  };
  assert.equal(results.metricRunCountsBeforeReport.ratingEvaluation, 1);
  assert.equal(results.metricRunCountsBeforeReport.rankingEvaluation, 1);
  assert.equal(results.metricRunCountsBeforeReport.diversityEvaluation, 1);
  assert.equal(results.metricRunCountsBeforeReport.buildProfile, 1,
    "Diversity should reuse the already calculated profile rather than building another one");

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async text => { window.__syntheticDiagnosticReport = text; } }
    });
  });
  await page.locator('[data-action="copy-recommendation-diagnostics"]').click({ timeout: 5000 });
  await page.waitForFunction(() => typeof window.__syntheticDiagnosticReport === "string", null, { timeout: 10000 });
  const report = await page.evaluate(() => {
    const text = window.__syntheticDiagnosticReport;
    const value = JSON.parse(text);
    return {
      schema: value.schema,
      ratedEntries: value.sample.ratedEntries,
      validRatingCount: value.sample.validRatingCount,
      ratingsWithFeatures: value.sample.ratingsWithFeatures,
      metadataCoverage: value.sample.metadataCoverage,
      rankingCount: value.evaluation.rankingQuality.sampleCount,
      rankingAvailable: value.evaluation.rankingQuality.available,
      featureNamesIncluded: value.privacy.featureLabelsIncluded,
      networkTransmission: value.privacy.networkTransmission,
      containsSyntheticTitle: text.includes("Synthetic Film 000"),
      containsRawMovieIdentity: /"tmdbId"|"tmId"|"tmdb_id"/i.test(text)
    };
  });
  results.reportSchema = report.schema;
  results.reportRatedEntries = report.ratedEntries;
  results.reportCoverage = report.metadataCoverage;
  assert.equal(report.schema, "prisma-recommendation-diagnostics/v11");
  assert.equal(report.ratedEntries, 351);
  assert.equal(report.validRatingCount, 351);
  assert.equal(report.ratingsWithFeatures, 351);
  assert.equal(report.metadataCoverage, 1);
  assert.equal(report.rankingCount, 351);
  assert.equal(report.rankingAvailable, true);
  assert.equal(report.featureNamesIncluded, false);
  assert.equal(report.networkTransmission, false);
  assert.equal(report.containsSyntheticTitle, false);
  assert.equal(report.containsRawMovieIdentity, false);
  results.metricRunCountsAfterReport = {
    ratingEvaluation: countBefore("rating-evaluation"),
    rankingEvaluation: countBefore("ranking-cross-validation"),
    diversityEvaluation: countBefore("ranking-diversity"),
    buildProfile: countBefore("buildProfile")
  };
  assert.deepEqual(results.metricRunCountsAfterReport, results.metricRunCountsBeforeReport,
    "Copying the diagnostics report must reuse cached metrics without repeating evaluation");

  const timingOperations = [
    "navigation-render", "renderLab", "lab-first-render-yield", "summaryStats",
    "buildProfile", "genreStats", "rating-evaluation", "ranking-cross-validation",
    "ranking-diversity", "recommendation-quality", "lab-metrics-pipeline"
  ];
  results.calculationTimes = performanceEvents.filter(item => timingOperations.includes(item.operation));
  for (const operation of ["navigation-render", "renderLab", "lab-first-render-yield", "summaryStats",
    "buildProfile", "genreStats", "rating-evaluation", "ranking-cross-validation",
    "ranking-diversity", "lab-metrics-pipeline"]) {
    assert.ok(results.calculationTimes.some(item => item.operation === operation),
      "Missing timing for " + operation + "; saw " + results.calculationTimes.map(item => item.operation).join(", "));
  }
  assert.ok(results.calculationTimes.every(item =>
    !("title" in item) && !("tmdbId" in item) && !("rating" in item) && typeof item.durationMs === "number"));
  if (errors.length) throw new Error("Browser exceptions: " + errors.join(" | "));
  await context.close();

  // Navigate away after the loading state appears, then return. Stale work must not overwrite the new page.
  const cancelContext = await browser.newContext({ viewport: { width: 1100, height: 820 }, serviceWorkers: "block" });
  const cancelPage = await cancelContext.newPage();
  captureLogs(cancelPage);
  await cancelPage.goto(baseUrl + (baseUrl.includes("?") ? "&" : "?") + "lab-cancel=" + Date.now(), { waitUntil: "networkidle", timeout: 60000 });
  await cancelPage.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await seedProfile(cancelPage, fixture);
  await cancelPage.reload({ waitUntil: "networkidle", timeout: 60000 });
  await cancelPage.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await cancelPage.locator(".topbar [data-nav='lab']").click({ timeout: 5000 });
  await cancelPage.locator("[data-lab-metrics-state='loading']").waitFor({ state: "visible", timeout: 3000 });
  await cancelPage.locator(".bottom-nav [data-nav='catalog']").click({ timeout: 5000 });
  await cancelPage.locator(".discover-heading h1").waitFor({ state: "visible", timeout: 10000 });
  await cancelPage.waitForTimeout(150);
  assert.equal(await cancelPage.locator("[data-lab-metrics-state]").count(), 0,
    "A cancelled Lab evaluation must not replace the current Discover view");
  await cancelPage.locator(".topbar [data-nav='lab']").click({ timeout: 5000 });
  await cancelPage.locator("main h1").filter({ hasText: "Laboratorio" }).waitFor({ state: "visible", timeout: 2500 });
  await cancelPage.waitForFunction(() => {
    const state = document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState;
    return state === "ready" || state === "error";
  }, null, { timeout: 120000 });
  assert.equal(await cancelPage.locator("[data-lab-metrics-state]").getAttribute("data-lab-metrics-state"), "ready",
    "Returning to Lab after cancellation must start a fresh evaluation");
  results.cancellationAndReentryPassed = true;
  if (errors.length) throw new Error("Browser exceptions during cancellation: " + errors.join(" | "));
  await cancelContext.close();

  // A brand-new context with no imported data must still complete its Lab lifecycle.
  const emptyContext = await browser.newContext({ viewport: { width: 900, height: 800 }, serviceWorkers: "block" });
  const emptyPage = await emptyContext.newPage();
  captureLogs(emptyPage);
  await emptyPage.goto(baseUrl + (baseUrl.includes("?") ? "&" : "?") + "lab-empty=" + Date.now(), { waitUntil: "networkidle", timeout: 60000 });
  await emptyPage.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await emptyPage.locator(".topbar [data-nav='lab']").click({ timeout: 5000 });
  await emptyPage.locator("main h1").filter({ hasText: "Laboratorio" }).waitFor({ state: "visible", timeout: 2500 });
  await emptyPage.waitForFunction(() => {
    const state = document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState;
    return state === "ready" || state === "error";
  }, null, { timeout: 20000 });
  assert.equal(await emptyPage.locator("[data-lab-metrics-state]").getAttribute("data-lab-metrics-state"), "ready");
  assert.match(await emptyPage.locator(".lab-ranking-diagnostics").innerText(), /Datos insuficientes|se necesitan al menos/i);
  results.emptyProfilePassed = true;
  if (errors.length) throw new Error("Browser exceptions in empty-profile scenario: " + errors.join(" | "));
  await emptyContext.close();

  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/lab-responsiveness.json", JSON.stringify(results, null, 2) + "\n", "utf8");
  console.log("Prisma Lab responsiveness regression passed:", JSON.stringify(results));
} catch (error) {
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/lab-responsiveness.json", JSON.stringify({
    ...results,
    error: String(error && error.stack || error),
    performanceEvents
  }, null, 2) + "\n", "utf8");
  throw error;
} finally {
  await browser.close();
}
