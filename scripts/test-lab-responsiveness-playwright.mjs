import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { makeLabSyntheticFixture, seedLabSyntheticProfile } from "./lab-regression-fixtures.mjs";

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
  maxHeartbeatGapMs: null,
  metricsStatus: null,
  metricRunCountsBeforeReport: {},
  metricRunCountsAfterReport: {},
  reportSchema: null,
  reportCoverage: null,
  reportRatedEntries: null,
  cancellationAndReentryPassed: false,
  mobileLayoutPassed: false,
  emptyProfilePassed: false,
  featureFamilySampleCount: null,
  featureFamilyCount: null,
  diagnosticPhaseCount: null,
  diagnosticDurationMs: null,
  diagnosticPhaseStatuses: []
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
  const fixture = makeLabSyntheticFixture();
  const { context, page } = await newTestPage();
  await seedLabSyntheticProfile(page, fixture);
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await page.evaluate(() => {
    window.__labResponsivenessHeartbeat = { ticks: 0, maxGapMs: 0, lastAt: performance.now() };
    window.__labResponsivenessTimer = window.setInterval(() => {
      const heartbeat = window.__labResponsivenessHeartbeat;
      const now = performance.now();
      heartbeat.ticks += 1;
      heartbeat.maxGapMs = Math.max(heartbeat.maxGapMs, now - heartbeat.lastAt);
      heartbeat.lastAt = now;
    }, 10);
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
      ridgeAutomatic: [...document.querySelectorAll(".lab-automatic-label")].some(node => node.closest(".panel")?.innerText.includes("Ridge")),
      normalizationAutomatic: [...document.querySelectorAll(".lab-automatic-label")].some(node => node.closest(".panel")?.innerText.includes("normalización")),
      featureLabels: Boolean(document.querySelector("#diagnosticFeatureLabels")),
      globalProgress: Boolean(document.querySelector(".lab-diagnostic-progress-bar")),
      sevenPhases: document.querySelectorAll(".lab-diagnostic-phase").length === 7,
      copyDisabledUntilFinal: Boolean(document.querySelector("[data-action='copy-recommendation-diagnostics']")?.disabled)
    }
  }));
  assert.equal(immediateDom.heading, "Laboratorio");
  assert.equal(immediateDom.status, "loading");
  assert.ok(Object.values(immediateDom.controls).every(Boolean), "Global progress and all automatic-phase controls must be present on first render");
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
    return window.__labResponsivenessHeartbeat || { ticks: 0, maxGapMs: null };
  });
  const heartbeat = results.responsiveTicks;
  results.responsiveTicks = heartbeat.ticks;
  results.maxHeartbeatGapMs = Math.round(heartbeat.maxGapMs * 10) / 10;
  assert.equal(results.metricsStatus, "ready", "Synthetic 351-rating profile must finish all automatic metrics");
  assert.ok(results.responsiveTicks >= 3, "UI task heartbeat must continue while metrics compute: ticks=" + results.responsiveTicks);
  assert.ok(results.maxHeartbeatGapMs < 500,
    "The main thread must yield at least every 500ms while metrics compute; max heartbeat gap=" + results.maxHeartbeatGapMs + "ms");

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
      containsRawMovieIdentity: /"tmdbId"|"tmId"|"tmdb_id"/i.test(text),
      diagnosticStatus: value.diagnostic?.status || "",
      diagnosticPhaseCount: value.diagnostic?.run?.phases?.length || 0,
      diagnosticDurationMs: value.diagnostic?.run?.durationMs ?? null,
      diagnosticPhaseStatuses: (value.diagnostic?.run?.phases || []).map(phase => phase.status),
      featureFamilySampleCount: value.diagnostic?.featureFamilyComparison?.sampleCount ?? 0,
      featureFamilyCount: value.diagnostic?.featureFamilyComparison?.families?.length || 0,
      featureFamiliesAvailable: value.diagnostic?.featureFamilyComparison?.families?.every(family => family.available) || false
    };
  });
  results.reportSchema = report.schema;
  results.reportRatedEntries = report.ratedEntries;
  results.reportCoverage = report.metadataCoverage;
  results.featureFamilySampleCount = report.featureFamilySampleCount;
  results.featureFamilyCount = report.featureFamilyCount;
  results.diagnosticPhaseCount = report.diagnosticPhaseCount;
  results.diagnosticDurationMs = report.diagnosticDurationMs;
  results.diagnosticPhaseStatuses = report.diagnosticPhaseStatuses;
  assert.equal(report.schema, "prisma-recommendation-diagnostics/v12");
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
  assert.equal(report.diagnosticStatus, "completed");
  assert.equal(report.diagnosticPhaseCount, 7);
  assert.equal(report.diagnosticPhaseStatuses.length, 7);
  assert.ok(report.diagnosticPhaseStatuses.every(status => ["completed", "unavailable"].includes(status)),
    "Each diagnostic phase must have a terminal status even when sample data are unavailable");
  assert.ok(Number.isFinite(report.diagnosticDurationMs) && report.diagnosticDurationMs >= 0,
    "The report must include the measured total battery duration");
  assert.equal(report.featureFamilySampleCount, 351);
  assert.equal(report.featureFamilyCount, 4);
  assert.equal(report.featureFamiliesAvailable, true);
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
    "ranking-diversity", "recommendation-quality",
    "lab-diagnostic-coverage", "lab-diagnostic-baseline", "lab-diagnostic-ranking",
    "lab-diagnostic-normalization", "lab-diagnostic-ridge", "lab-diagnostic-temporal",
    "lab-diagnostic-featureFamilies"
  ];
  results.calculationTimes = performanceEvents.filter(item => timingOperations.includes(item.operation));
  for (const operation of ["navigation-render", "renderLab", "lab-first-render-yield", "summaryStats",
    "buildProfile", "genreStats", "rating-evaluation", "ranking-cross-validation",
    "ranking-diversity", "lab-diagnostic-coverage", "lab-diagnostic-baseline",
    "lab-diagnostic-ranking", "lab-diagnostic-normalization", "lab-diagnostic-ridge",
    "lab-diagnostic-temporal", "lab-diagnostic-featureFamilies"]) {
    assert.ok(results.calculationTimes.some(item => item.operation === operation),
      "Missing timing for " + operation + "; saw " + results.calculationTimes.map(item => item.operation).join(", "));
  }
  assert.ok(results.calculationTimes.every(item =>
    !("title" in item) && !("tmdbId" in item) && !("rating" in item) && typeof item.durationMs === "number"));
  if (errors.length) throw new Error("Browser exceptions: " + errors.join(" | "));
  await context.close();

  // Navigate away while the battery is running; it must continue locally and remain reusable on return.
  const cancelContext = await browser.newContext({ viewport: { width: 1100, height: 820 }, serviceWorkers: "block" });
  const cancelPage = await cancelContext.newPage();
  captureLogs(cancelPage);
  await cancelPage.goto(baseUrl + (baseUrl.includes("?") ? "&" : "?") + "lab-cancel=" + Date.now(), { waitUntil: "networkidle", timeout: 60000 });
  await cancelPage.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await seedLabSyntheticProfile(cancelPage, fixture);
  await cancelPage.reload({ waitUntil: "networkidle", timeout: 60000 });
  await cancelPage.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await cancelPage.locator(".topbar [data-nav='lab']").click({ timeout: 5000 });
  await cancelPage.locator("[data-lab-metrics-state='loading']").waitFor({ state: "visible", timeout: 3000 });
  await cancelPage.locator(".bottom-nav [data-nav='catalog']").click({ timeout: 5000 });
  await cancelPage.locator(".discover-heading h1").waitFor({ state: "visible", timeout: 10000 });
  await cancelPage.waitForFunction(() => {
    const state = document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState;
    return !state;
  }, null, { timeout: 3000 });
  assert.equal(await cancelPage.locator("[data-lab-metrics-state]").count(), 0,
    "A diagnostic update must not replace the active Discover view");
  await cancelPage.waitForFunction(() => performance.getEntriesByType("resource").length >= 0);
  await cancelPage.locator(".topbar [data-nav='lab']").click({ timeout: 5000 });
  await cancelPage.locator("main h1").filter({ hasText: "Laboratorio" }).waitFor({ state: "visible", timeout: 2500 });
  await cancelPage.waitForFunction(() => {
    const state = document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState;
    return state === "ready" || state === "error";
  }, null, { timeout: 120000 });
  assert.equal(await cancelPage.locator("[data-lab-metrics-state]").getAttribute("data-lab-metrics-state"), "ready",
    "Returning to Lab must recover the finished in-flight result or its cache");
  results.cancellationAndReentryPassed = true;
  if (errors.length) throw new Error("Browser exceptions during cancellation: " + errors.join(" | "));
  await cancelContext.close();

  // A brand-new context with no imported data must still complete its Lab lifecycle.
  const emptyContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
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
  const mobileLayout = await emptyPage.evaluate(() => ({
    width: window.innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
    progressVisible: Boolean(document.querySelector(".lab-diagnostic-progress-bar")),
    phaseColumns: getComputedStyle(document.querySelector(".lab-diagnostic-phase-list")).gridTemplateColumns
  }));
  assert.equal(mobileLayout.width, 390);
  assert.ok(mobileLayout.bodyScrollWidth <= mobileLayout.viewport + 1, "The mobile Lab must not create horizontal overflow");
  assert.ok(mobileLayout.progressVisible, "The global diagnostic progress bar must remain visible on mobile");
  assert.ok(mobileLayout.phaseColumns.split(" ").length <= 2, "The diagnostic phase list must collapse for mobile");
  results.mobileLayoutPassed = true;
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
