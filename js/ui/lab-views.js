import { createLabRidgeView } from "./lab-ridge-view.js?v=core-20261023-6";
import { createLabTemporalView } from "./lab-temporal-view.js?v=core-20261023-3";

export function createLabViews(ctx) {
  function formatDiagnosticDuration(milliseconds) {
    if (!Number.isFinite(Number(milliseconds)) || Number(milliseconds) < 0) return "—";
    const seconds = Math.round(Number(milliseconds) / 1000);
    if (seconds < 60) return seconds + " s";
    return Math.floor(seconds / 60) + " min " + String(seconds % 60).padStart(2, "0") + " s";
  }

  function renderLabDiagnosticProgressPanel() {
    const run = ctx.labDiagnosticSnapshot || null;
    const phases = run && Array.isArray(run.phases) ? run.phases : [
      { id: "coverage", label: "Estado y cobertura del perfil", status: "pending", progress: { completed: 0, total: 1 } },
      { id: "baseline", label: "Línea base heurística", status: "pending", progress: { completed: 0, total: 1 } },
      { id: "ranking", label: "Calidad del ranking", status: "pending", progress: { completed: 0, total: 1 } },
      { id: "normalization", label: "Calibración de normalización", status: "pending", progress: { completed: 0, total: 1 } },
      { id: "ridge", label: "Validación Ridge", status: "pending", progress: { completed: 0, total: 1 } },
      { id: "temporal", label: "Evaluación temporal", status: "pending", progress: { completed: 0, total: 1 } },
      { id: "featureFamilies", label: "Familias de características", status: "pending", progress: { completed: 0, total: 1 } }
    ];
    const finalStatuses = ["completed", "unavailable", "cancelled", "error"];
    const allFinal = phases.every(function (phase) { return finalStatuses.includes(phase.status); });
    const busy = Boolean(ctx.labMetricsBusy);
    const currentId = run && run.currentPhase;
    const current = phases.find(function (phase) { return phase.id === currentId; }) ||
      phases.find(function (phase) { return phase.status === "running"; }) || null;
    const percent = Math.max(0, Math.min(100, Number(run && run.globalPercent) || 0));
    const statusLabels = {
      pending: "Pendiente", running: "En curso", completed: "Completada",
      unavailable: "No disponible", cancelled: "Cancelada", error: "Error"
    };
    const statusMarks = {
      pending: "○", running: "◌", completed: "✓",
      unavailable: "—", cancelled: "Ⅱ", error: "!"
    };
    const phaseList = phases.map(function (phase) {
      const status = statusLabels[phase.status] ? phase.status : "pending";
      const progress = phase.progress || {};
      const unitLabel = status === "running"
        ? '<small class="lab-diagnostic-phase-units">' + Number(progress.completed || 0) + ' / ' + Math.max(1, Number(progress.total) || 1) + ' unidades</small>'
        : (phase.durationMs != null && finalStatuses.includes(status)
          ? '<small class="lab-diagnostic-phase-units">' + formatDiagnosticDuration(phase.durationMs) + '</small>' : "");
      const reason = status === "unavailable" && phase.unavailableReason
        ? '<small class="lab-diagnostic-phase-reason">' + ctx.escapeHTML(phase.unavailableReason) + '</small>' : "";
      return '<li class="lab-diagnostic-phase status-' + status + (phase.id === (current && current.id) && busy ? ' is-current' : '') + '">' +
        '<span class="lab-diagnostic-phase-mark" aria-hidden="true">' + statusMarks[status] + '</span>' +
        '<span class="lab-diagnostic-phase-copy"><strong>' + ctx.escapeHTML(phase.label || phase.id) + '</strong>' +
        '<small>' + statusLabels[status] + '</small>' + unitLabel + reason + '</span></li>';
    }).join("");
    const eta = run && run.estimatedRemainingMs != null && run.estimateStatus !== "calculating"
      ? "≈ " + formatDiagnosticDuration(run.estimatedRemainingMs)
      : (allFinal ? "0 s" : "Calculando estimación…");
    const overallStatus = allFinal
      ? (phases.some(function (phase) { return phase.status === "error"; }) ? "Diagnóstico parcial: hay fases con error"
        : (phases.some(function (phase) { return phase.status === "unavailable"; }) ? "Diagnóstico terminado con métricas no disponibles" : "Diagnóstico terminado"))
      : (busy ? "Batería automática en curso" : "La batería automática comenzará al entrar en el Laboratorio");
    const canRetry = allFinal && phases.some(function (phase) { return phase.status === "error" || phase.status === "cancelled"; });
    const actionButtons = '<div class="lab-diagnostic-actions">' +
      (canRetry ? '<button class="btn btn-secondary btn-small" type="button" data-action="retry-lab-diagnostic">Reintentar fases fallidas</button>' : "") +
      '<button class="btn btn-quiet btn-small" type="button" data-action="restart-lab-diagnostic"' +
      (busy ? ' disabled aria-disabled="true"' : '') + '>Repetir diagnóstico</button></div>';
    return '<section class="panel lab-diagnostic-progress" aria-labelledby="lab-diagnostic-progress-title">' +
      '<div class="panel-head"><div><h2 id="lab-diagnostic-progress-title">Diagnóstico automático de Prisma</h2>' +
      '<p class="metric-note" role="status" aria-live="polite">' + ctx.escapeHTML(overallStatus) + '</p></div>' +
      '<span class="lab-diagnostic-percent">' + percent + '%</span></div>' +
      '<progress class="lab-diagnostic-progress-bar" value="' + percent + '" max="100" aria-label="Progreso global del diagnóstico">' + percent + '%</progress>' +
      '<div class="lab-diagnostic-summary" aria-live="polite">' +
      '<span><strong>Fase actual:</strong> ' + ctx.escapeHTML(current ? current.label : (allFinal ? "Ninguna" : "Preparando batería")) + '</span>' +
      '<span><strong>Fases finalizadas:</strong> ' + Number(run && run.completedPhases || (allFinal ? phases.length : 0)) + ' de ' + phases.length + '</span>' +
      '<span><strong>Transcurrido:</strong> ' + formatDiagnosticDuration(run ? run.elapsedMs : 0) + '</span>' +
      '<span><strong>Restante estimado:</strong> ' + eta + '</span></div>' +
      '<p class="metric-note">La estimación se deriva de duraciones y unidades observadas; puede variar entre fases y perfiles. En esta primera ejecución se muestra “Calculando estimación…” hasta disponer de mediciones suficientes.</p>' +
      '<ol class="lab-diagnostic-phase-list">' + phaseList + '</ol>' + actionButtons +
      '</section>';
  }

  function renderRecommendationDiagnosticPanel() {
    const reportText = ctx.recommendationDiagnosticReportText || "";
    const reportFormat = ctx.recommendationDiagnosticReportFormat === "json" ? "json" : "brief";
    const metricsBusy = Boolean(ctx.labMetricsBusy);
    const snapshot = ctx.labDiagnosticSnapshot || null;
    const finalStatuses = ["completed", "unavailable", "cancelled", "error"];
    const allFinal = Boolean(snapshot && Array.isArray(snapshot.phases) &&
      snapshot.phases.length === 7 && snapshot.phases.every(function (phase) { return finalStatuses.includes(phase.status); }));
    const disabled = metricsBusy || !allFinal ? ' disabled aria-disabled="true"' : '';
    const detailsToggle = '<details class="diagnostic-advanced-options"><summary>Opciones avanzadas del JSON completo</summary>' +
      '<label class="diagnostic-feature-option"><input id="diagnosticFeatureLabels" type="checkbox"' +
      (ctx.recommendationDiagnosticFeatureLabelsIncluded ? ' checked' : '') +
      '> Incluir hasta 40 nombres de señales agregadas en el JSON (puede revelar parte de tus gustos)</label></details>';
    const outputLabel = reportFormat === "json" ? "JSON técnico completo" : "Contexto resumido para IA";
    const output = reportText
      ? '<div class="diagnostic-report-result"><p class="metric-note">' + ctx.escapeHTML(ctx.recommendationDiagnosticCopyMessage || "") + '</p>' +
        '<p class="metric-note"><strong>Formato preparado:</strong> ' + outputLabel + ' · ' + reportText.length.toLocaleString() + ' caracteres.</p>' +
        '<textarea class="field diagnostic-report-output" id="recommendationDiagnosticOutput" rows="14" readonly aria-label="' + outputLabel + '">' + ctx.escapeHTML(reportText) + '</textarea>' +
        '<div class="hero-actions"><button class="btn btn-quiet btn-small" type="button" data-action="clear-recommendation-diagnostics">Limpiar contenido</button></div></div>'
      : "";
    return '<section class="panel recommendation-diagnostic-panel" aria-labelledby="recommendation-diagnostic-heading">' +
      '<div class="panel-head"><div><h3 id="recommendation-diagnostic-heading">Contexto técnico para la IA desarrolladora</h3>' +
      '<p class="metric-note">La copia principal es un resumen accionable, no un volcado interminable de JSON.</p></div>' +
      '<div class="hero-actions"><button class="btn btn-primary" type="button" data-action="copy-recommendation-diagnostics"' + disabled +
      '>Copiar contexto resumido para IA</button>' +
      '<button class="btn btn-quiet btn-small" type="button" data-action="copy-recommendation-diagnostics-json"' + disabled +
      '>Copiar JSON técnico completo</button></div></div>' +
      '<p class="metric-note">El contexto resumido incluye reglas del proyecto, estado, cifras decisivas, interpretación, límites y siguiente tarea recomendada. Omite tablas repetidas, nombres individuales de señales y datos personales.</p>' +
      '<p class="metric-note">Se genera en este dispositivo. Copiar no envía nada a ningún servidor; solo tú decides qué compartir.</p>' +
      detailsToggle + output + '</section>';
  }

  const { renderRidgeExperimentPanel } = createLabRidgeView(ctx);

  function renderInfluenceNormalizationPanel() {
    const result = ctx.influenceNormalizationEvaluationResult || null;
    const busy = Boolean(ctx.influenceNormalizationEvaluationBusy);
    const ridgeBusy = Boolean(ctx.ridgeEvaluationBusy);
    const temporalBusy = Boolean(ctx.temporalRidgeEvaluationBusy);
    const metricsBusy = Boolean(ctx.labMetricsBusy);
    const buttonLabel = "";
    const methodNames = {
      mean: "Media actual · N",
      "coverage-sqrt": "Raíz de cobertura · √(N×K)",
      "matched-only": "Solo coincidencias · K"
    };
    const modeNames = { balanced: "Equilibrado", affinity: "Más afines", variety: "Más variedad" };
    let body = "";
    if (busy) {
      body = '<p class="metric-note" aria-live="polite">Comparando tres fórmulas con las mismas cinco particiones, perfiles de entrenamiento y películas retenidas. El recomendador activo no cambia.</p>';
    } else if (!result) {
      body = '<p class="metric-note">Esta prueba mide si dividir entre todas las características atenúa demasiado las señales conocidas. La raíz geométrica reduce esa atenuación conservando una penalización por baja cobertura; solo coincidencias se muestra como control sin esa penalización.</p>' +
        '<p class="metric-note">Esta evaluación se ejecuta automáticamente como parte de la batería integrada, sin pulsar botones individuales. La fórmula activa permanece sin cambios.</p>';
    } else if (!result.available) {
      body = '<p class="metric-note" aria-live="polite">Experimento no disponible: ' +
        ctx.escapeHTML(result.unavailableReason || "faltan valoraciones enlazadas.") + '</p>';
    } else {
      const methodMarkup = (result.methods || []).map(function (method) {
        const delta = Number(method.deltaMaeVsMean);
        const deltaLabel = method.method === "mean" ? "referencia" :
          ((delta > 0 ? "+" : "") + delta.toFixed(4).replace(".", ",") + " · positivo favorece la variante");
        const stability = method.maeFoldStability || {};
        const stabilityMarkup = method.method === "mean" ? "" :
          '<p class="metric-note">Estabilidad MAE frente a la media actual: mejora en ' +
          Number(stability.variantWins || 0) + ', empata en ' + Number(stability.ties || 0) +
          ' y la media actual mejora en ' + Number(stability.meanWins || 0) + ' de ' +
          Number(stability.foldsEvaluated || 0) + ' pliegues.</p>';
        const rankingMarkup = (method.rankingModes || []).filter(function (item) {
          return item.available;
        }).map(function (item) {
          const change = Number(item.deltaNdcgVsMean);
          return '<p class="metric-note"><strong>' + ctx.escapeHTML(modeNames[item.mode] || item.mode) +
            ' · nDCG@5:</strong> ' + Number(item.ndcgAt5).toFixed(4).replace(".", ",") +
            ' · cambio frente a media ' + (change > 0 ? "+" : "") + change.toFixed(4).replace(".", ",") +
            ' · gana ' + Number(item.foldsWins || 0) + ', empata ' + Number(item.foldsTies || 0) +
            ', pierde ' + Number(item.foldsLosses || 0) + '.</p>';
        }).join("");
        return '<section class="normalization-method-result"><h4>' +
          ctx.escapeHTML(methodNames[method.method] || method.method) + '</h4>' +
          '<div class="metrics-grid">' +
          ctx.metric("MAE", Number(method.mae).toFixed(4).replace(".", ","), "Mismas películas retenidas") +
          ctx.metric("Media − variante", deltaLabel, method.method === "mean" ? "Control sin cambios" : "Positivo favorece la variante") +
          '</div>' + stabilityMarkup +
          '<h5>Calidad del ranking · nDCG@5</h5>' +
          (rankingMarkup || '<p class="metric-note">nDCG@5 no disponible: la muestra no alcanza los mínimos de ranking.</p>') +
          '</section>';
      }).join("");
      body = '<p class="metric-note">Muestra: ' + Number(result.sampleCount || 0) +
        ' valoraciones · ' + Number(result.foldsEvaluated || 0) + '/' + Number(result.folds || 0) +
        ' pliegues · relevancia personal: nota ≥ ' + Number(result.relevantRatingThreshold || 7) + '.</p>' +
        methodMarkup +
        '<p class="metric-note">La fórmula actual se mantiene como control de producción. Resultados descriptivos: las particiones reutilizan el mismo historial y no prueban satisfacción futura ni significación estadística.</p>';
    }
    return '<section class="panel influence-normalization-panel" aria-labelledby="influence-normalization-heading">' +
      '<div class="panel-head"><div><h3 id="influence-normalization-heading">Calibración de la normalización de influencia</h3>' +
      '<p class="metric-note">¿La cantidad de metadatos diluye demasiado las coincidencias conocidas?</p></div>' +
      '<p class="metric-note lab-automatic-label">Incluida en el diagnóstico automático</p></div>' +
      body + '</section>';
  }


  const { renderTemporalRidgePanel } = createLabTemporalView(ctx);

  function renderLab() {
    const renderStartedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const metrics = ctx.labMetrics || null;
    const metricsBusy = Boolean(ctx.labMetricsBusy);
    const stats = metrics ? metrics.stats : { total: (ctx.state.rated || []).length, average: null };
    const profile = metrics ? metrics.profile : { withMetadata: 0, count: (ctx.state.rated || []).length, features: new Map() };
    const evaluation = metrics ? metrics.evaluation : {
      available: false, count: 0, mae: null, baselineMae: null, improvementPct: null,
      withoutDecadeMae: null, decadeImprovement: null, themeShrinkageMae: null,
      themeShrinkageDelta: null, themeShrinkagePrior: 2, decadeExamples: 0
    };
    const recommendationQuality = metrics ? metrics.recommendationQuality : {
      ranking: {
        available: false,
        reason: "Las métricas se calculan en segundo plano después del primer renderizado.",
        count: 0, relevantCount: 0, folds: 5, foldsEvaluated: 0,
        modes: ["balanced", "affinity", "variety"].map(function (mode) {
          return { mode: mode, available: false, ndcgAt5: null, foldsEvaluated: 0 };
        })
      },
      diversity: ["balanced", "affinity", "variety"].map(function (mode) {
        return { mode: mode, score: null, pairs: 0, titles: 0, titlesWithGenres: 0, uniqueGenres: 0 };
      })
    };
    const affinityReference = recommendationQuality.ranking.modes.find(function (item) { return item.mode === "affinity"; });
    const genres = metrics ? metrics.genres : [];
    const overall = Number.isFinite(stats.average) ? stats.average : 6.5;
    const top = genres.slice().sort(function (a,b) { return b.average-a.average; }).slice(0,7);
    const bottom = genres.slice().sort(function (a,b) { return a.average-b.average; }).slice(0,7);
    const events = ctx.state.events.slice(0,8).map(function (event) {
      return '<div class="event-item"><div class="event-mark">' + ctx.escapeHTML(event.symbol || "✦") + '</div><div class="event-copy"><strong>' + ctx.escapeHTML(event.title) + '</strong><small>' + ctx.escapeHTML(event.description) + ' · ' + ctx.escapeHTML(ctx.formatDate(event.at)) + '</small></div></div>';
    }).join("");
    const evaluationComparison = evaluation.improvementPct == null
      ? '<div class="metric-note">La referencia tiene MAE cero; no se puede calcular una mejora porcentual.</div>'
      : (Math.abs(evaluation.improvementPct) < 0.05
        ? '<div class="metric-note">Rendimiento igual a la referencia.</div>'
        : '<div class="metric-note">' + (evaluation.improvementPct > 0 ? 'Mejora relativa del ' : 'Error relativo mayor en ') + Math.abs(evaluation.improvementPct).toFixed(1).replace(".",",") + '% respecto a la referencia.</div>');
    const decadeEvaluationMarkup = !metrics
      ? '<div class="metric-note">La comparación con y sin década se calculará en segundo plano.</div>'
      : (evaluation.decadeImprovement == null
      ? '<div class="metric-note">Se necesitan al menos 5 valoraciones evaluadas con año válido para medir la señal de década · n=' + (evaluation.decadeExamples || 0) + '</div>'
      : '<div class="metric-note">Sin señal de década: ' + evaluation.withoutDecadeMae.toFixed(2).replace(".",",") + ' MAE</div>' +
        '<div class="metric-note">' + (Math.abs(evaluation.decadeImprovement) < 0.005
          ? 'La década no cambia el MAE en esta muestra.'
          : (evaluation.decadeImprovement > 0
            ? 'Con década, el MAE baja ' : 'Con década, el MAE sube ') +
              Math.abs(evaluation.decadeImprovement).toFixed(2).replace(".",",") + ' puntos frente a la variante sin década.') + '</div>');
    const themeShrinkageEvaluationMarkup = !metrics
      ? '<div class="metric-note">El experimento de soporte de temas se actualizará cuando terminen las métricas iniciales.</div>'
      : (evaluation.themeShrinkageMae == null
      ? '<div class="metric-note">Regularización experimental de temas: se necesitan al menos 5 películas valoradas con características · n=' + evaluation.count + '</div>'
      : '<div class="metric-note">Experimento (temas atenuados por soporte): ' + evaluation.themeShrinkageMae.toFixed(2).replace(".",",") + ' MAE · n=' + evaluation.count + ' · n/(n+' + evaluation.themeShrinkagePrior + ')</div>' +
        '<div class="metric-note">' + (Math.abs(evaluation.themeShrinkageDelta) < 0.005
          ? 'La regularización no cambia el MAE de forma apreciable en esta muestra.'
          : (evaluation.themeShrinkageDelta > 0
            ? 'La variante experimental reduce el MAE en ' : 'La variante experimental aumenta el MAE en ') +
              Math.abs(evaluation.themeShrinkageDelta).toFixed(2).replace(".",",") + ' puntos frente al modelo base.') + '</div>' +
        '<div class="metric-note">Solo diagnóstico: las recomendaciones activas siguen usando el modelo base. Diferencia descriptiva, no una prueba de significación estadística.</div>');
    const evaluationMarkup = (!metrics
      ? '<div class="metric-value">—</div><div class="metric-note">' +
        (ctx.labMetricsError
          ? ctx.escapeHTML(ctx.labMetricsError)
          : (metricsBusy ? 'Calculando la validación en segundo plano…' : 'La validación estará disponible al terminar el cálculo inicial.')) +
        '</div>'
      : (evaluation.available ?
        '<div class="metric-value">' + evaluation.mae.toFixed(2).replace(".",",") + '</div>' +
        '<div class="metric-note">MAE del modelo · n=' + evaluation.count + '</div>' +
        '<div class="metric-note">Referencia (media de entrenamiento): ' + evaluation.baselineMae.toFixed(2).replace(".",",") + '</div>' +
        evaluationComparison + decadeEvaluationMarkup :
        '<div class="metric-value">—</div><div class="metric-note">Datos insuficientes: se necesitan al menos 5 películas valoradas con características · n=' + evaluation.count + '</div>')) + themeShrinkageEvaluationMarkup;
    const metricsReady = Boolean(metrics && metrics.coverage);
    const diagnostic = ctx.labDiagnosticSnapshot || null;
    const finalStatuses = ["completed", "unavailable", "cancelled", "error"];
    const batteryFinal = Boolean(diagnostic && Array.isArray(diagnostic.phases) &&
      diagnostic.phases.length === 7 && diagnostic.phases.every(function (phase) { return finalStatuses.includes(phase.status); }));
    const statusState = batteryFinal ? (ctx.labMetricsError ? "error" : "ready")
      : (metricsBusy ? "loading" : "pending");
    const statusMessage = batteryFinal
      ? (ctx.labMetricsError
        ? ctx.labMetricsError
        : (diagnostic.phases.some(function (phase) { return phase.status === "unavailable"; })
          ? "Diagnóstico terminado; algunas métricas no estaban disponibles por cobertura."
          : "Diagnóstico completo. El motor de producción permanece sin cambios."))
      : (metricsReady ? "Cobertura medida; el diagnóstico automático continúa en segundo plano."
        : (metricsBusy ? "Calculando métricas en segundo plano; puedes seguir navegando mientras terminan…"
          : "Preparando las métricas del Laboratorio…"));
    const labMetricsStatusMarkup = '<p class="metric-note" data-lab-metrics-state="' + statusState + '" aria-live="polite">' +
      ctx.escapeHTML(statusMessage) + '</p>';
    const markup = '<section class="page-heading"><h1>Laboratorio</h1>' + ctx.infoButton("lab","Información sobre el Laboratorio") + '</section>' +
      renderLabDiagnosticProgressPanel() +
      labMetricsStatusMarkup +
      '<div class="metrics-grid">' + ctx.metric("Historial enlazado",metricsReady ? profile.withMetadata + "/" + stats.total : "Calculando…","") + ctx.metric("Señales",metricsReady ? String(profile.features.size) : "…","") + ctx.metric("Nota media",metricsReady ? overall.toFixed(1).replace(".",",") : "…","") + '</div>' +
      '<div class="lab-metadata-host">' + ctx.renderTMDBHistoryPanel() + '</div>' +
      '<div class="two-col lab-charts"><section class="panel"><div class="panel-head"><h3>Géneros mejor valorados</h3></div>' +
      (top.length ? '<div class="bar-list">' + top.map(function (item) { return ctx.barRow(ctx.displayGenre(item.name),item.average,10,item.average.toFixed(1).replace(".",",") + " · " + item.count); }).join("") + '</div>' : '<div class="empty-inline"><strong>Datos insuficientes</strong></div>') +
      '</section><section class="panel"><div class="panel-head"><h3>Géneros con notas más bajas</h3></div>' +
      (bottom.length ? '<div class="bar-list">' + bottom.map(function (item) { return ctx.barRow(ctx.displayGenre(item.name),item.average,10,item.average.toFixed(1).replace(".",",") + " · " + item.count); }).join("") + '</div>' : '<div class="empty-inline"><strong>Datos insuficientes</strong></div>') +
      '</section></div>' +
      '<section class="panel lab-ranking-diagnostics"><div class="panel-head"><div><h3>Calidad del ranking</h3><p class="metric-note">Diagnóstico offline, no una garantía de gusto futuro.</p></div>' + ctx.infoButton("lab","Información sobre la calidad del ranking y la diversidad") + '</div>' +
      '<div class="metrics-grid">' +
      ctx.metric("Películas evaluables", metrics ? String(recommendationQuality.ranking.count) : "…", "Con características enlazadas") +
      ctx.metric("Notas relevantes", metrics ? String(recommendationQuality.ranking.relevantCount) : "…", "Puntuación personal de 7 a 10") +
      ctx.metric("Particiones", String(recommendationQuality.ranking.folds), "Mismas cinco para los tres modos") +
      '</div>' +
      '<div class="metric-note">' + ctx.escapeHTML(recommendationQuality.ranking.available
        ? "Validación cruzada offline: las tres variantes reciben las mismas candidatas retenidas por pliegue y el perfil se entrena sin sus notas. Ganancia graduada: nota − 6 para notas de 7 a 10; las notas de 1 a 6 no se consideran relevantes."
        : recommendationQuality.ranking.reason) + '</div>' +
      '<div class="panel-head"><h4>Calidad del orden · nDCG@5 por modo</h4></div>' +
      '<div class="event-list">' + recommendationQuality.ranking.modes.map(function (item) {
        const label = {balanced:"Equilibrado",affinity:"Más afines",variety:"Más variedad"}[item.mode] || item.mode;
        const delta = item.available && affinityReference && affinityReference.available
          ? item.ndcgAt5 - affinityReference.ndcgAt5
          : null;
        const deltaLabel = item.mode === "affinity"
          ? "referencia"
          : (delta == null
            ? "sin referencia comparable"
            : "Δ frente a Más afines: " + (Math.abs(delta) < 0.005
              ? "0,00"
              : (delta > 0 ? "+" : "−") + Math.abs(delta).toFixed(2).replace(".",",")));
        const summary = item.available
          ? "nDCG@5 " + item.ndcgAt5.toFixed(2).replace(".",",") + " · " + deltaLabel + " · " + item.foldsEvaluated + "/" + recommendationQuality.ranking.folds + " pliegues"
          : "Sin medición suficiente para este modo";
        return '<div class="event-item"><div class="event-mark" aria-hidden="true">✦</div><div class="event-copy"><strong>' + label + '</strong><small>' + ctx.escapeHTML(summary) + '</small></div></div>';
      }).join("") + '</div>' +
      '<div class="metric-note">Δ frente a Más afines es una diferencia descriptiva de nDCG, no una mejora estadísticamente demostrada. El nDCG estima el orden de películas valoradas retenidas; no mide satisfacción ni garantiza el orden de títulos aún no vistos.</div>' +
      '<div class="panel-head"><h4>Diversidad de géneros · primeras cinco películas del catálogo actual</h4></div>' +
      '<div class="event-list">' + recommendationQuality.diversity.map(function (item) {
        const label = {balanced:"Equilibrado",affinity:"Más afines",variety:"Más variedad"}[item.mode] || item.mode;
        const summary = item.score == null
          ? "Sin suficientes géneros comparables · " + item.titles + " películas"
          : "Disimilitud " + item.score.toFixed(2).replace(".",",") + " · " + item.uniqueGenres + " géneros distintos · " + item.titles + " películas · " + item.pairs + " pares";
        return '<div class="event-item"><div class="event-mark" aria-hidden="true">✦</div><div class="event-copy"><strong>' + label + '</strong><small>' + ctx.escapeHTML(summary) + '</small></div></div>';
      }).join("") + '</div>' +
      '<div class="metric-note">La disimilitud de géneros se calcula con Jaccard entre pares que tienen metadatos. No mide serendipia ni satisfacción.</div></section>' +
      '<div class="two-col lab-bottom"><section class="panel"><div class="panel-head"><h3>Validación de notas</h3>' + ctx.infoButton("lab","Información sobre la validación") + '</div>' + evaluationMarkup + '</section>' +
      '<section class="panel"><div class="panel-head"><h3>Actividad reciente</h3></div>' + (events ? '<div class="event-list">' + events + '</div>' : '<div class="empty-inline"><strong>Sin actividad reciente</strong></div>') + '</section></div>' +
      renderRidgeExperimentPanel() + renderInfluenceNormalizationPanel() + renderTemporalRidgePanel() + renderRecommendationDiagnosticPanel();
    const renderFinishedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    if (typeof console !== "undefined" && typeof console.info === "function") {
      console.info("[Prisma performance]", JSON.stringify({
        operation: "renderLab",
        durationMs: Math.round(Math.max(0, renderFinishedAt - renderStartedAt) * 10) / 10,
        sampleCount: (ctx.state.rated || []).length,
        status: "completed"
      }));
    }
    return markup;
  }

  return { renderLab };
}
