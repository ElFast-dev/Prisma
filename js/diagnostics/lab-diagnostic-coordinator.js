const PHASES = Object.freeze([
  { id: "coverage", label: "Estado y cobertura del perfil", cost: 1 },
  { id: "baseline", label: "Línea base heurística", cost: 4 },
  { id: "ranking", label: "Calidad del ranking", cost: 7 },
  { id: "normalization", label: "Calibración de normalización", cost: 7 },
  { id: "ridge", label: "Validación Ridge", cost: 25 },
  { id: "temporal", label: "Evaluación temporal", cost: 12 },
  { id: "featureFamilies", label: "Familias de características", cost: 8 }
]);
const FINAL_STATUSES = new Set(["completed", "unavailable", "cancelled", "error"]);
const ROUNDING = 10;

function clone(value) {
  if (typeof structuredClone === "function") {
    try { return structuredClone(value); } catch (_) { /* older WebViews */ }
  }
  if (value == null || typeof value !== "object") return value;
  if (value instanceof Map) {
    const copy = new Map();
    value.forEach(function (item, key) { copy.set(clone(key), clone(item)); });
    return copy;
  }
  if (value instanceof Set) {
    const copy = new Set();
    value.forEach(function (item) { copy.add(clone(item)); });
    return copy;
  }
  if (Array.isArray(value)) return value.map(clone);
  const copy = {};
  Object.keys(value).forEach(function (key) { copy[key] = clone(value[key]); });
  return copy;
}

function publicSnapshot(value) {
  const copy = clone(value);
  if (!copy) return null;
  copy.phases.forEach(function (phase) { phase.result = null; });
  delete copy.results;
  return copy;
}

function percent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort(function (a, b) { return a - b; });
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function createPhaseState(phase) {
  return {
    id: phase.id,
    label: phase.label,
    status: "pending",
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    progress: { completed: 0, total: 1, fraction: 0 },
    result: null,
    error: null,
    unavailableReason: null
  };
}

export function createLabDiagnosticCoordinator(options) {
  const settings = options || {};
  const now = typeof settings.now === "function" ? settings.now : function () { return Date.now(); };
  const getDataKey = typeof settings.getDataKey === "function" ? settings.getDataKey : function () { return "default"; };
  const getSampleCount = typeof settings.getSampleCount === "function" ? settings.getSampleCount : function () { return 0; };
  const runPhase = typeof settings.runPhase === "function" ? settings.runPhase : async function () { return { available: false, unavailableReason: "Fase sin implementación." }; };
  const onUpdate = typeof settings.onUpdate === "function" ? settings.onUpdate : function () {};
  const yieldToBrowser = typeof settings.yieldToBrowser === "function"
    ? settings.yieldToBrowser
    : function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); };
  const cache = new Map();
  const timingHistory = Object.create(null);
  let generation = 0;
  let activePromise = null;
  let activeKey = "";
  let snapshot = null;
  let snapshotKey = "";
  let completedAt = null;

  function sampleCount() {
    const value = Number(getSampleCount());
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  function initialSnapshot(key) {
    return {
      schema: "prisma-lab-diagnostic-run/v1",
      dataKey: key,
      status: "pending",
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      priorDurationMs: 0,
      sampleCount: sampleCount(),
      globalPercent: 0,
      completedPhases: 0,
      totalPhases: PHASES.length,
      currentPhase: null,
      elapsedMs: 0,
      estimatedRemainingMs: null,
      estimateStatus: "calculating",
      phases: PHASES.map(createPhaseState),
      results: {}
    };
  }

  function isCurrent(runGeneration, key) {
    return runGeneration === generation && key === getDataKey();
  }

  function phaseWeight(phase) {
    return Math.max(1, sampleCount()) * phase.cost;
  }

  function calculateProgress(current, nowValue) {
    const phases = current.phases;
    const totalWeight = PHASES.reduce(function (sum, phase) { return sum + phaseWeight(phase); }, 0) || 1;
    let work = 0;
    phases.forEach(function (state) {
      const phase = PHASES.find(function (item) { return item.id === state.id; });
      const fraction = FINAL_STATUSES.has(state.status)
        ? 1
        : (state.status === "running" ? state.progress.fraction : 0);
      work += phaseWeight(phase) * fraction;
    });
    current.globalPercent = percent(work / totalWeight * 100);
    current.completedPhases = phases.filter(function (state) { return FINAL_STATUSES.has(state.status); }).length;
    current.totalPhases = phases.length;
    current.elapsedMs = (Number(current.priorDurationMs) || 0) +
      (current.startedAt == null ? 0 : Math.max(0, nowValue - current.startedAt));
    const remaining = phases.filter(function (state) { return !FINAL_STATUSES.has(state.status); });
    const measured = phases.filter(function (state) { return Number.isFinite(state.durationMs) && state.durationMs > 0; });
    const rates = measured.map(function (state) {
      const phase = PHASES.find(function (item) { return item.id === state.id; });
      return state.durationMs / Math.max(1, Math.max(1, current.sampleCount) * phase.cost);
    });
    const historyRates = Object.keys(timingHistory).flatMap(function (id) {
      return (timingHistory[id] || []).slice(-6).map(function (entry) {
        return entry.durationMs / Math.max(1, entry.sampleCount * entry.cost);
      });
    }).filter(Number.isFinite);
    const rate = median(rates.length >= 2 ? rates : historyRates);
    if (!remaining.length) {
      current.estimatedRemainingMs = 0;
      current.estimateStatus = "measured";
    } else if (measured.length >= 2 && rate != null) {
      current.estimatedRemainingMs = Math.round(remaining.reduce(function (sum, state) {
        const phase = PHASES.find(function (item) { return item.id === state.id; });
        const fraction = state.status === "running" ? Math.max(0, Math.min(1, state.progress.fraction)) : 0;
        return sum + rate * Math.max(1, current.sampleCount) * phase.cost * (1 - fraction);
      }, 0) / ROUNDING) * ROUNDING;
      current.estimateStatus = "estimated";
    } else {
      current.estimatedRemainingMs = null;
      current.estimateStatus = "calculating";
    }
    const unfinished = phases.find(function (state) { return state.status === "running"; }) ||
      phases.find(function (state) { return state.status === "pending"; });
    current.currentPhase = unfinished ? unfinished.id : null;
    if (phases.every(function (state) { return FINAL_STATUSES.has(state.status); })) {
      current.status = phases.some(function (state) { return state.status === "error"; })
        ? "partial-error"
        : (phases.some(function (state) { return state.status === "cancelled"; }) ? "partial-cancelled" : "completed");
      current.finishedAt = nowValue;
      current.durationMs = (Number(current.priorDurationMs) || 0) +
        Math.max(0, current.finishedAt - current.startedAt);
    } else {
      current.status = "running";
    }
    return current;
  }

  function publish() {
    if (!snapshot) return;
    calculateProgress(snapshot, now());
    onUpdate(publicSnapshot(snapshot), snapshot.results);
  }

  function recordTiming(phaseId, durationMs, count) {
    const phase = PHASES.find(function (item) { return item.id === phaseId; });
    if (!phase || !Number.isFinite(durationMs) || durationMs <= 0) return;
    const rows = timingHistory[phaseId] || (timingHistory[phaseId] = []);
    rows.push({ durationMs: durationMs, sampleCount: Math.max(1, count), cost: phase.cost });
    if (rows.length > 6) rows.shift();
  }

  async function executePhase(phase, runGeneration, key) {
    const phaseState = snapshot.phases.find(function (item) { return item.id === phase.id; });
    if (!phaseState || !isCurrent(runGeneration, key)) return;
    phaseState.status = "running";
    phaseState.startedAt = now();
    phaseState.finishedAt = null;
    phaseState.durationMs = null;
    phaseState.error = null;
    phaseState.unavailableReason = null;
    phaseState.progress = { completed: 0, total: 1, fraction: 0 };
    publish();

    const onProgress = function (update) {
      if (!isCurrent(runGeneration, key) || !snapshot) return false;
      const raw = update && typeof update === "object" ? update : {};
      const total = Number(raw.totalWork != null ? raw.totalWork : raw.total);
      const completed = Number(raw.completedWork != null ? raw.completedWork : raw.completed);
      const fallbackTotal = Number.isFinite(total) && total > 0 ? total :
        (Number.isFinite(raw.totalRepeats) ? raw.totalRepeats : (Number.isFinite(raw.totalWindows) ? raw.totalWindows : 1));
      const fallbackCompleted = Number.isFinite(completed) ? completed :
        (Number.isFinite(raw.completedRepeats) ? raw.completedRepeats : (Number.isFinite(raw.completedWindows) ? raw.completedWindows : 0));
      const validTotal = Math.max(1, fallbackTotal);
      const validCompleted = Math.max(0, Math.min(validTotal, fallbackCompleted));
      phaseState.progress = { completed: validCompleted, total: validTotal, fraction: validCompleted / validTotal };
      if (raw.detail) phaseState.progress.detail = String(raw.detail).slice(0, 160);
      publish();
      return isCurrent(runGeneration, key);
    };

    try {
      await yieldToBrowser();
      if (!isCurrent(runGeneration, key)) {
        phaseState.status = "cancelled";
        phaseState.error = "La ejecución se invalidó porque cambiaron los datos del diagnóstico.";
      } else {
        const result = await runPhase(phase.id, {
          shouldContinue: function () { return isCurrent(runGeneration, key); },
          onProgress: onProgress,
          sampleCount: sampleCount(),
          getDataKey: getDataKey
        });
        if (!isCurrent(runGeneration, key)) {
          phaseState.status = "cancelled";
          phaseState.error = "El resultado se descartó porque los datos cambiaron durante la evaluación.";
          phaseState.result = null;
        } else if (result == null) {
          phaseState.status = "cancelled";
          phaseState.error = "La evaluación se canceló antes de producir un resultado.";
        } else {
          phaseState.result = result;
          if (result.available === false || result.status === "unavailable") {
            phaseState.status = "unavailable";
            phaseState.unavailableReason = String(result.unavailableReason || result.reason || "La muestra no cumple los requisitos de esta evaluación.");
          } else {
            phaseState.status = "completed";
          }
          phaseState.progress = { completed: 1, total: 1, fraction: 1 };
        }
      }
    } catch (error) {
      if (!isCurrent(runGeneration, key)) {
        phaseState.status = "cancelled";
        phaseState.error = "El resultado se descartó porque los datos cambiaron durante la evaluación.";
      } else {
        phaseState.status = "error";
        phaseState.error = "La fase falló de forma controlada; las demás evaluaciones continuarán.";
      }
      phaseState.result = null;
    } finally {
      const finished = now();
      phaseState.finishedAt = finished;
      phaseState.durationMs = Math.max(0, finished - phaseState.startedAt);
      if (isCurrent(runGeneration, key)) {
        recordTiming(phase.id, phaseState.durationMs, sampleCount());
        if (snapshot && FINAL_STATUSES.has(phaseState.status)) {
          snapshot.results[phase.id] = phaseState.result;
        }
        publish();
      }
    }
  }

  async function run(runOptions) {
    const request = runOptions || {};
    const key = getDataKey();
    if (!request.force && !request.retryFailures && activePromise && activeKey === key) return activePromise;
    if (!request.force && !request.retryFailures && cache.has(key)) {
      snapshot = clone(cache.get(key));
      snapshotKey = key;
      publish();
      return clone(snapshot);
    }
    if (!request.force && !request.retryFailures && snapshot && snapshotKey === key &&
        snapshot.phases.every(function (state) { return FINAL_STATUSES.has(state.status); })) {
      cache.set(key, clone(snapshot));
      return clone(snapshot);
    }

    const runGeneration = ++generation;
    if (request.retryFailures && snapshot && snapshotKey === key) {
      snapshot = clone(snapshot);
      snapshot.priorDurationMs = (Number(snapshot.priorDurationMs) || 0) + (Number(snapshot.durationMs) || 0);
      snapshot.startedAt = now();
      snapshot.status = "running";
      snapshot.finishedAt = null;
      snapshot.durationMs = null;
      snapshot.globalPercent = 0;
      snapshot.estimatedRemainingMs = null;
      snapshot.estimateStatus = "calculating";
      snapshot.phases.forEach(function (state) {
        if (state.status === "error" || state.status === "cancelled") {
          state.status = "pending";
          state.startedAt = null;
          state.finishedAt = null;
          state.durationMs = null;
          state.progress = { completed: 0, total: 1, fraction: 0 };
          state.result = null;
          state.error = null;
          state.unavailableReason = null;
        }
      });
    } else {
      snapshot = initialSnapshot(key);
    }
    snapshotKey = key;
    if (!request.retryFailures) snapshot.priorDurationMs = 0;
    if (!snapshot.startedAt) snapshot.startedAt = now();
    snapshot.sampleCount = sampleCount();
    activeKey = key;
    completedAt = null;
    publish();

    activePromise = (async function () {
      await yieldToBrowser();
      for (const phase of PHASES) {
        if (!isCurrent(runGeneration, key)) break;
        const state = snapshot.phases.find(function (item) { return item.id === phase.id; });
        if (request.retryFailures && state && FINAL_STATUSES.has(state.status)) continue;
        await executePhase(phase, runGeneration, key);
        if (!isCurrent(runGeneration, key)) break;
      }
      if (!isCurrent(runGeneration, key)) return null;
      publish();
      if (snapshot.phases.every(function (state) { return FINAL_STATUSES.has(state.status); })) {
        cache.set(key, clone(snapshot));
        completedAt = snapshot.finishedAt;
      }
      return clone(snapshot);
    })().finally(function () {
      if (runGeneration === generation) {
        activePromise = null;
        activeKey = "";
        if (snapshotKey !== getDataKey()) {
          generation += 1;
          snapshot = null;
          snapshotKey = "";
          completedAt = null;
          onUpdate(null);
        } else {
          publish();
        }
      }
    });
    return activePromise;
  }

  function invalidate() {
    generation += 1;
    activePromise = null;
    activeKey = "";
    snapshot = null;
    snapshotKey = "";
    completedAt = null;
    cache.clear();
    onUpdate(null);
  }

  function getSnapshot() {
    if (!snapshot || snapshotKey !== getDataKey()) return null;
    return clone(snapshot);
  }

  return {
    phases: PHASES.map(function (phase) { return { id: phase.id, label: phase.label, cost: phase.cost }; }),
    run: run,
    ensure: function () { return run({}); },
    restart: function () { return run({ force: true }); },
    retryFailures: function () { return run({ retryFailures: true }); },
    invalidate: invalidate,
    getSnapshot: getSnapshot,
    get isRunning() { return Boolean(activePromise); }
  };
}
