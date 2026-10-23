import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { makeLabSyntheticFixture, seedLabSyntheticProfile } from "./lab-regression-fixtures.mjs";

const baseUrl = process.env.PRISMA_BASELINE_URL || "http://127.0.0.1:8766/";
const thresholdMs = Number(process.env.PRISMA_BASELINE_TIMEOUT_MS) || 20000;
const browser = await chromium.launch({ headless: true });
const result = {
  baselineCommit: "edcaaf63e1a79506deeda369f26646ba6633af67",
  profileType: "synthetic-only",
  ratings: 351,
  clickToLabHeadingMs: null,
  visibleWithinTimeout: false,
  timeoutLowerBoundMs: null,
  heartbeatTicksWhileNavigating: null,
  observation: ""
};

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  await page.goto(baseUrl + "?lab-baseline=" + Date.now(), {
    waitUntil: "networkidle",
    timeout: 60000
  });
  await page.locator("main h1").waitFor({ state: "visible", timeout: 20000 });
  await seedLabSyntheticProfile(page, makeLabSyntheticFixture());
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.locator("main h1").waitFor({ state: "visible", timeout: 20000 });

  await page.evaluate(() => {
    window.__baselineLabTicks = 0;
    window.__baselineLabHeartbeat = setInterval(() => { window.__baselineLabTicks += 1; }, 10);
  });
  const startedAt = Date.now();
  const headingPromise = page.locator("main h1").filter({ hasText: "Laboratorio" })
    .waitFor({ state: "visible", timeout: thresholdMs + 10000 })
    .then(() => ({ visible: true, elapsedMs: Date.now() - startedAt }))
    .catch(() => ({ visible: false, elapsedMs: null }));
  // Do not await the click first: the old synchronous event handler may block the renderer
  // before Playwright receives its response.
  const clickPromise = page.locator(".topbar [data-nav='lab']").click({ timeout: thresholdMs + 10000 })
    .then(() => "acknowledged")
    .catch(error => "pending-or-failed: " + String(error && error.message || error));
  const outcome = await Promise.race([
    headingPromise,
    new Promise(resolve => setTimeout(() => resolve({ visible: false, elapsedMs: thresholdMs, timedOut: true }), thresholdMs))
  ]);
  result.visibleWithinTimeout = outcome.visible;
  result.clickToLabHeadingMs = outcome.elapsedMs;
  if (outcome.timedOut) {
    result.timeoutLowerBoundMs = thresholdMs;
    result.observation = "El encabezado Laboratorio no apareció dentro del umbral; el hilo de renderizado quedó ocupado antes de insertar #appRoot.";
  } else {
    result.observation = "El encabezado apareció después de completar las operaciones síncronas previas al renderizado.";
    result.heartbeatTicksWhileNavigating = await page.evaluate(() => {
      clearInterval(window.__baselineLabHeartbeat);
      return window.__baselineLabTicks || 0;
    });
  }
  result.clickAcknowledgement = await Promise.race([
    clickPromise,
    new Promise(resolve => setTimeout(() => resolve("pending when measurement ended"), 1))
  ]);
  await context.close().catch(() => {});
  await mkdir("artifacts", { recursive: true });
  await writeFile("artifacts/lab-responsiveness-before.json", JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log("Pre-fix synthetic Lab measurement:", JSON.stringify(result));
} finally {
  await browser.close();
}
