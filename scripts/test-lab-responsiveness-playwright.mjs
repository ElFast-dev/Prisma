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
      oneCopyAction: document.querySelectorAll(".lab-one-click-panel [data-action='copy-recommendation-diagnostics']").length === 1,
      noSecondaryCopy: document.querySelectorAll("[data-action='copy-recommendation-diagnostics-json']").length === 0,
      noManualExperimentButtons: document.querySelectorAll("[data-action='run-ridge-experiment'],[data-action='run-temporal-ridge-experiment'],[data-action='run-influence-normalization-experiment'],[data-action='restart-lab-diagnostic'],[data-action='retry-lab-diagnostic']").length === 0,
      noFeatureLabelControls: document.querySelectorAll("#diagnosticFeatureLabels").length === 0,
      globalProgress: Boolean(document.querySelector(".lab-diagnostic-progress-bar")),
      copyDisabledUntilFinal: Boolean(document.querySelector("[data-action='copy-recommendation-diagnostics']")?.disabled),
      noTasteCharts: !document.querySelector(".lab-charts") && !document.querySelector(".lab-ranking-diagnostics")
    }
  }));
  assert.equal(immediateDom.heading, "Laboratorio");
  assert.equal(immediateDom.status, "loading");
  assert.ok(Object.values(immediateDom.controls).every(Boolean), "The Lab must expose only progress and one disabled copy action while computing");
  results.firstLabRenderMs = performanceEvents.find(item => item.operation === "renderLab")?.durationMs ?? null;

  // The only interaction is report copying; the detailed experiments start automatically.
  await page.waitForFunction(() => {
    const state = document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState;
    return state === "ready" || state === "error";
  }, null, { timeout: 120000 });
  await page.waitForFunction(() => {
    const state = document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState;
    const copyButton = document.querySelector('[data-action="copy-recommendation-diagnostics"]');
    return state === "ready" && copyButton && !copyButton.disabled;
  }, null, { timeout: 10000 });
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
  await page.waitForFunction(() => typeof window.__syntheticDiagnosticReport === "string" &&
    window.__syntheticDiagnosticReport.trim().startsWith("{"), null, { timeout: 10000 });
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
      featureFamiliesAvailable: value.diagnostic?.featureFamilyComparison?.families?.every(family => family.available) || false,
      alphaGridCount: value.evaluation?.ridgeExperiment?.alphaGrid?.length || 0,
      relativeScaleStatus: value.evaluation?.ridgeExperiment?.alphaSelectionComparison?.relativeScaleComparison?.executionStatus || ""
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
  assert.equal(report.schema, "prisma-recommendation-diagnostics/v14");
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
  assert.equal(report.diagnosticPhaseCount, 7);
  assert.equal(report.diagnosticPhaseStatuses.length, 7);
  assert.ok(report.diagnosticPhaseStatuses.every(status => ["completed", "unavailable", "cancelled", "error"].includes(status)),
    "Each diagnostic phase must have a terminal status, including failures after their automatic retry");
  assert.ok(Number.isFinite(report.diagnosticDurationMs) && report.diagnosticDurationMs >= 0,
    "The report must include the measured total battery duration");
  assert.equal(report.featureFamilySampleCount, 351);
  assert.equal(report.featureFamilyCount, 4);
  assert.equal(report.featureFamiliesAvailable, true);
  assert.equal(report.alphaGridCount, 18, "The automatic report must include the expanded Ridge grid");
  assert.equal(report.relativeScaleStatus, "completed", "The automatic report must include the relative scale experiment");
  results.metricRunCountsAfterReport = {
    ratingEvaluation: countBefore("rating-evaluation"),
    rankingEvaluation: countBefore("ranking-cross-validation"),
    diversityEvaluation: countBefore("ranking-diversity"),
    buildProfile: countBefore("buildProfile")
  };
  assert.deepEqual(results.metricRunCountsAfterReport, results.metricRunCountsBeforeReport,
    "Copying the diagnostics report must reuse cached metrics without repeating evaluation");

  const timingOperations = [
    "navigation-render", "renderLab", "summaryStats",
    "buildProfile", "genreStats", "rating-evaluation", "ranking-cross-validation",
    "ranking-diversity", "recommendation-quality",
    "lab-diagnostic-coverage", "lab-diagnostic-baseline", "lab-diagnostic-ranking",
    "lab-diagnostic-normalization", "lab-diagnostic-ridge", "lab-diagnostic-temporal",
    "lab-diagnostic-featureFamilies", "lab-metrics-pipeline"
  ];
  results.calculationTimes = performanceEvents.filter(item => timingOperations.includes(item.operation));
  for (const operation of ["navigation-render", "renderLab", "summaryStats",
    "buildProfile", "genreStats", "rating-evaluation", "ranking-cross-validation",
    "ranking-diversity", "lab-diagnostic-coverage", "lab-diagnostic-baseline",
    "lab-diagnostic-ranking", "lab-diagnostic-normalization", "lab-diagnostic-ridge",
    "lab-diagnostic-temporal", "lab-diagnostic-featureFamilies", "lab-metrics-pipeline"]) {
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
  assert.equal(await emptyPage.locator("[data-action='copy-recommendation-diagnostics']").isEnabled(), true,
    "The report becomes copyable after an empty-profile battery reaches a final state");
  assert.equal(await emptyPage.locator(".lab-charts").count(), 0);
  const mobileLayout = await emptyPage.evaluate(() => ({
    width: window.innerWidth,
    bodyScrollWidth: document.body.scrollWidth,
    viewport: document.documentElement.clientWidth,
    progressVisible: Boolean(document.querySelector(".lab-diagnostic-progress-bar")),
    copyActions: document.querySelectorAll(".lab-one-click-panel [data-action]").length
  }));
  assert.equal(mobileLayout.width, 390);
  assert.ok(mobileLayout.bodyScrollWidth <= mobileLayout.viewport + 1, "The mobile Lab must not create horizontal overflow");
  assert.ok(mobileLayout.progressVisible, "The global diagnostic progress bar must remain visible on mobile");
  assert.equal(mobileLayout.copyActions, 1, "The mobile Lab must expose just one action");
  results.mobileLayoutPassed = true;
  results.emptyProfilePassed = true;
  if (errors.length) throw new Error("Browser exceptions in empty-profile scenario: " + errors.join(" | "));
  await emptyContext.close();

  // Few-rating profile: phases with unmet sample thresholds must end explicitly unavailable.
  const fewContext = await browser.newContext({ viewport: { width: 900, height: 800 }, serviceWorkers: "block" });
  const fewPage = await fewContext.newPage();
  captureLogs(fewPage);
  await fewPage.goto(baseUrl + (baseUrl.includes("?") ? "&" : "?") + "lab-few=" + Date.now(),
    { waitUntil: "networkidle", timeout: 60000 });
  await fewPage.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  const fewFixture = makeLabSyntheticFixture();
  fewFixture.state.rated = fewFixture.state.rated.slice(0, 3);
  fewFixture.catalog = fewFixture.catalog.slice(0, 43);
  await seedLabSyntheticProfile(fewPage, fewFixture);
  await fewPage.reload({ waitUntil: "networkidle", timeout: 60000 });
  await fewPage.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await fewPage.locator(".topbar [data-nav='lab']").click({ timeout: 5000 });
  await fewPage.waitForFunction(() => {
    const state = document.querySelector("[data-lab-metrics-state]")?.dataset.labMetricsState;
    return state === "ready" || state === "error";
  }, null, { timeout: 30000 });
  assert.equal(await fewPage.locator("[data-lab-metrics-state]").getAttribute("data-lab-metrics-state"), "ready",
    "A sparse profile must finish the battery rather than remain pending");
  assert.equal(await fewPage.locator("[data-action='copy-recommendation-diagnostics']").isEnabled(), true,
    "The one copy button must become available after all phases reach final states, even when some are unavailable");
  await fewPage.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async text => { window.__sparseDiagnosticReport = text; } }
    });
  });
  await fewPage.locator("[data-action='copy-recommendation-diagnostics']").click({ timeout: 5000 });
  await fewPage.waitForFunction(() => typeof window.__sparseDiagnosticReport === "string" &&
    window.__sparseDiagnosticReport.trim().startsWith("{"), null, { timeout: 10000 });
  const sparseReport = await fewPage.evaluate(() => JSON.parse(window.__sparseDiagnosticReport));
  assert.equal(sparseReport.diagnostic.run.phases.length, 7);
  assert.ok(sparseReport.diagnostic.run.phases.some(phase => phase.status === "unavailable"));
  assert.equal(sparseReport.privacy.featureLabelsIncluded, false);
  assert.equal(sparseReport.privacy.networkTransmission, false);
  assert.equal(sparseReport.evaluation.ridgeExperiment.alphaGrid.length, 18);
  assert.equal(sparseReport.diagnostic.status, "completed-with-unavailable");
  results.fewRatingProfilePassed = true;
  if (errors.length) throw new Error("Browser exceptions in few-rating scenario: " + errors.join(" | "));
  await fewContext.close();

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
