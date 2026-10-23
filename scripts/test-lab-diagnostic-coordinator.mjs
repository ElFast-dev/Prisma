import assert from "node:assert/strict";
import { createLabDiagnosticCoordinator } from "../js/diagnostics/lab-diagnostic-coordinator.js";

let clock = 1000;
let dataKey = "synthetic-profile-v1";
let failRidgeOnce = true;
let invalidateDuringCoverage = false;
const counts = Object.create(null);
const snapshots = [];

const coordinator = createLabDiagnosticCoordinator({
  now: () => clock,
  getDataKey: () => dataKey,
  getSampleCount: () => 351,
  yieldToBrowser: () => Promise.resolve(),
  onUpdate: (snapshot) => { if (snapshot) snapshots.push(snapshot); },
  runPhase: async (phase, control) => {
    counts[phase] = (counts[phase] || 0) + 1;
    clock += 5;
    control.onProgress({ completedWork: 1, totalWork: 2, detail: "Synthetic unit one" });
    await Promise.resolve();
    clock += 25;
    if (phase === "coverage" && invalidateDuringCoverage) {
      dataKey = "synthetic-profile-v3";
      invalidateDuringCoverage = false;
      return { available: true, sampleCount: 351, synthetic: true };
    }
    if (phase === "ridge" && failRidgeOnce) {
      failRidgeOnce = false;
      throw new Error("Controlled synthetic Ridge failure");
    }
    if (phase === "temporal") {
      control.onProgress({ completedWork: 1, totalWork: 2 });
      return { available: false, unavailableReason: "Synthetic sample has no trusted watched dates." };
    }
    control.onProgress({ completedWork: 2, totalWork: 2, detail: "Synthetic unit two" });
    return { available: true, phase, sampleCount: 351 };
  }
});

const firstA = coordinator.ensure();
const firstB = coordinator.ensure();
await Promise.all([firstA, firstB]);
let result = coordinator.getSnapshot();
assert.ok(result, "A completed diagnostic snapshot should be readable for the current data key");
assert.equal(result.phases.length, 7);
assert.equal(result.completedPhases, 7);
assert.equal(result.globalPercent, 100);
assert.equal(result.status, "partial-error");
assert.equal(result.phases.find(phase => phase.id === "temporal").status, "unavailable");
assert.equal(result.phases.find(phase => phase.id === "ridge").status, "error");
assert.ok(result.phases.filter(phase => phase.durationMs > 0).length >= 6,
  "Completed and failed phases must record their real duration");
assert.ok(snapshots.some(snapshot =>
  snapshot.completedPhases >= 2 &&
  snapshot.estimateStatus === "estimated" &&
  Number.isFinite(snapshot.estimatedRemainingMs) &&
  snapshot.estimatedRemainingMs > 0
), "ETA must be calculated from at least two measured phases");
assert.ok(snapshots.some(snapshot =>
  snapshot.phases.some(phase => phase.status === "running" && phase.progress.completed > 0)
), "Progress must be linked to reported work units, not a wall-clock timer");
assert.ok(coordinator.phases.every(phase => counts[phase.id] === 1),
  "Concurrent ensure calls must share one battery and avoid duplicate computations");

const cached = await coordinator.ensure();
assert.equal(cached.status, "partial-error");
assert.ok(coordinator.phases.every(phase => counts[phase.id] === 1),
  "The completed run, including a terminal partial error, must be cacheable until explicit retry");

await coordinator.retryFailures();
result = coordinator.getSnapshot();
assert.equal(result.status, "completed", "Retrying the controlled phase failure should repair the overall status");
assert.ok(coordinator.phases.every(phase => counts[phase.id] === 1 || (phase.id === "ridge" && counts[phase.id] === 2)),
  "Retry must re-run only failed/cancelled phases and preserve successful and unavailable results");
assert.equal(result.phases.find(phase => phase.id === "temporal").status, "unavailable",
  "Not available is a final, distinguishable status and must not be converted to success");
const afterRetryCounts = { ...counts };
await coordinator.ensure();
assert.deepEqual(counts, afterRetryCounts, "A valid result must be reused from cache");

dataKey = "synthetic-profile-v2";
invalidateDuringCoverage = true;
const stale = await coordinator.ensure();
assert.equal(stale, null, "A run whose profile changes during an active phase must be discarded");
assert.equal(coordinator.getSnapshot(), null, "A stale snapshot must not be returned for a different profile key");

await coordinator.ensure();
result = coordinator.getSnapshot();
assert.equal(result.dataKey, "synthetic-profile-v3");
assert.equal(result.status, "partial-error",
  "A new profile generation must start its own battery rather than reuse stale values");
assert.ok(result.phases.every(phase => ["completed", "unavailable", "cancelled", "error"].includes(phase.status)));
console.log("Laboratory diagnostic coordinator: deduplication, measured progress/ETA, unavailable phase, controlled retry, cache invalidation and stale-result rejection passed.");
