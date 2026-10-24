function formatDuration(milliseconds) {
  if (!Number.isFinite(Number(milliseconds)) || Number(milliseconds) < 0) return "—";
  const seconds = Math.round(Number(milliseconds) / 1000);
  if (seconds < 60) return seconds + " s";
  return Math.floor(seconds / 60) + " min " + String(seconds % 60).padStart(2, "0") + " s";
}

export function createLabViews(ctx) {
  function renderLab() {
    const snapshot = ctx.labDiagnosticSnapshot || null;
    const phases = snapshot && Array.isArray(snapshot.phases) ? snapshot.phases : [];
    const finalStatuses = ["completed", "unavailable", "cancelled", "error"];
    const allFinal = phases.length === 7 && phases.every(function (phase) {
      return finalStatuses.includes(phase.status);
    });
    const busy = Boolean(ctx.labMetricsBusy);
    const errors = phases.filter(function (phase) {
      return phase.status === "error" || phase.status === "cancelled";
    }).length;
    const unavailable = phases.filter(function (phase) { return phase.status === "unavailable"; }).length;
    const completed = Number(snapshot && snapshot.completedPhases) || phases.filter(function (phase) {
      return finalStatuses.includes(phase.status);
    }).length;
    const percent = Math.max(0, Math.min(100, Number(snapshot && snapshot.globalPercent) || (allFinal ? 100 : 0)));
    const current = phases.find(function (phase) { return phase.status === "running"; }) ||
      phases.find(function (phase) { return phase.id === (snapshot && snapshot.currentPhase); }) || null;
    const currentDetail = current && current.progress && current.progress.detail
      ? " · " + ctx.escapeHTML(current.progress.detail) : "";
    const eta = snapshot && snapshot.estimatedRemainingMs != null && snapshot.estimateStatus !== "calculating"
      ? formatDuration(snapshot.estimatedRemainingMs)
      : (allFinal ? "0 s" : "calculando");
    const statusState = allFinal ? (errors ? "error" : "ready") : (busy ? "loading" : "pending");
    const statusMessage = allFinal
      ? (errors
        ? "Diagnóstico parcial tras un reintento automático. El resumen señala el estado y las fases que requieren revisión."
        : (unavailable
          ? "Diagnóstico finalizado. Algunas pruebas no aplican a este perfil; el resumen está listo."
          : "Diagnóstico finalizado. El resumen técnico está listo para copiar."))
      : (busy
        ? "Prisma está ejecutando el diagnóstico local automáticamente."
        : "Preparando el diagnóstico local…");
    const canCopy = allFinal && !busy;
    const disabled = canCopy ? "" : ' disabled aria-disabled="true"';
    const reportText = ctx.recommendationDiagnosticReportText || "";
    const copyMessage = ctx.recommendationDiagnosticCopyMessage || "";
    const clipboardFailed = copyMessage.indexOf("No se pudo copiar automáticamente") === 0;
    const fallback = clipboardFailed && reportText
      ? '<label class="lab-copy-fallback-label" for="recommendationDiagnosticOutput">Copia manual del resumen técnico</label>' +
        '<textarea class="field diagnostic-report-output" id="recommendationDiagnosticOutput" rows="12" readonly aria-label="Resumen técnico para ChatGPT">' +
        ctx.escapeHTML(reportText) + '</textarea>'
      : "";
    const copyStatus = copyMessage
      ? '<p class="metric-note lab-copy-status" role="status" aria-live="polite">' + ctx.escapeHTML(copyMessage) + '</p>'
      : "";

    return '<section class="page-heading"><h1>Laboratorio</h1></section>' +
      '<section class="panel lab-diagnostic-progress lab-one-click-panel" aria-labelledby="lab-one-click-title">' +
      '<div class="panel-head"><div><h2 id="lab-one-click-title">Diagnóstico automático de Prisma</h2>' +
      '<p class="metric-note" data-lab-metrics-state="' + statusState + '" role="status" aria-live="polite">' +
      ctx.escapeHTML(statusMessage) + '</p></div><span class="lab-diagnostic-percent">' + percent + '%</span></div>' +
      '<progress class="lab-diagnostic-progress-bar" value="' + percent + '" max="100" aria-label="Progreso del diagnóstico">' +
      percent + '%</progress>' +
      '<div class="lab-diagnostic-summary lab-one-click-summary"><span><strong>Fase:</strong> ' +
      ctx.escapeHTML(current ? current.label : (allFinal ? "Completada" : "Preparando")) + currentDetail + '</span>' +
      '<span><strong>Fases:</strong> ' + completed + ' de 7</span>' +
      '<span><strong>Transcurrido:</strong> ' + formatDuration(snapshot ? snapshot.elapsedMs : 0) + '</span>' +
      '<span><strong>Restante estimado:</strong> ' + eta + '</span></div>' +
      '<p class="metric-note">La batería compara el modelo activo con alternativas experimentales, incluida la búsqueda Ridge ampliada. No modifica las recomendaciones de producción.</p>' +
      '<button class="btn btn-primary lab-copy-report-button" type="button" data-action="copy-recommendation-diagnostics"' +
      disabled + '>Copiar resumen técnico para ChatGPT</button>' +
      '<p class="metric-note">El resumen compacto se genera en este dispositivo con resultados clave y siguientes pasos. No incluye títulos, IDs ni nombres individuales de señales. Copiar no envía datos.</p>' +
      copyStatus + fallback +
      '</section>';
  }

  return { renderLab: renderLab };
}
