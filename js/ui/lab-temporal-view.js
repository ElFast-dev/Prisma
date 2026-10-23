export function createLabTemporalView(ctx) {
  function renderTemporalRidgePanel() {
    const result = ctx.temporalRidgeEvaluationResult || null;
    const busy = Boolean(ctx.temporalRidgeEvaluationBusy);
    const ridgeBusy = Boolean(ctx.ridgeEvaluationBusy);
    const metricsBusy = Boolean(ctx.labMetricsBusy);
    const useCollectionAddedAtProxy = Boolean(ctx.temporalUseCollectionAddedAtProxy);
    const progress = ctx.temporalRidgeEvaluationProgress || null;
    const completedWindows = Number(progress && progress.completedWindows || 0);
    const totalWindows = Number(progress && progress.totalWindows || 5);
    const buttonLabel = metricsBusy ? "Preparando métricas iniciales…" : (busy ? "Ventana " + completedWindows + "/" + totalWindows + "…" :
      (ridgeBusy ? "Validación Ridge en curso…" : (result ? "Volver a evaluar" : "Evaluar historial temporal")));
    const dateSourceMode = result && result.dateSourceMode
      ? result.dateSourceMode
      : (useCollectionAddedAtProxy ? "collection-added-proxy" : "watchedAt-only");
    const dateIsProxy = dateSourceMode === "collection-added-proxy";
    const dateSourceDescription = dateIsProxy
      ? "Proxy exploratorio activado. La fecha de incorporación no confirma el día real del visionado y se cuenta como no verificada. Los días se agrupan por fecha local de Panamá (America/Panama, UTC−05:00). Las marcas anteriores al 15 de enero de 2026 de la exportación del reto no se usan como fechas reales, ni siquiera con el proxy."
      : "Modo normal: watchedAt se convierte al día local de Panamá (America/Panama, UTC−05:00). En la exportación Android v2 reconocida, cada marca válida del historial se conserva como fecha explícita de visionado; el reto de 280 días permanece limitado del 15 de enero al 21 de octubre de 2026.";
    const dateProxyControl = '<div class="temporal-date-proxy-control">' +
      '<button class="btn btn-secondary btn-small" type="button" data-action="toggle-temporal-added-date-proxy" aria-pressed="' +
      (useCollectionAddedAtProxy ? "true" : "false") + '"' +
      (metricsBusy || busy || ridgeBusy ? ' disabled aria-disabled="true"' : '') + '>' +
      (useCollectionAddedAtProxy ? "Proxy exploratorio: activado" : "Permitir experimento exploratorio con fecha añadida") + '</button>' +
      '<p class="metric-note">' + dateSourceDescription + '</p>' +
      '<p class="metric-note">El diagnóstico automático nunca usa este proxy; solo habilita una exploración manual identificada expresamente. La elección es local y no modifica watchedAt, las fechas guardadas ni el motor de producción.</p></div>' +
      (useCollectionAddedAtProxy ? '<button class="btn btn-secondary btn-small" type="button" data-action="run-temporal-ridge-experiment"' +
        (metricsBusy || busy || ridgeBusy ? ' disabled aria-disabled="true"' : '') +
        '>Ejecutar evaluación exploratoria con proxy</button>' : '');
    const modeNames = { balanced: "Equilibrado", affinity: "Más afines", variety: "Más variedad" };
    let body = "";
    if (busy) {
      body = '<p class="metric-note" aria-live="polite">Evaluación temporal en curso: ' + completedWindows + ' de ' +
        totalWindows + (dateIsProxy ? ' ventanas por fecha de incorporación completadas. Esta es una comparación exploratoria, no una cronología confirmada de visionados.' : ' ventanas futuras completadas. Cada ventana se entrena con días anteriores y selecciona alpha con validación walk-forward interna.') + '</p>';
    } else if (ridgeBusy) {
      body = '<p class="metric-note" aria-live="polite">El experimento temporal se ejecutará cuando termine la validación Ridge estándar.</p>';
    } else if (!result) {
      body = '<p class="metric-note">Esta fase se intenta automáticamente usando solo fechas de visionado explícitas o confirmadas. Necesita una muestra suficiente de valoraciones fechadas repartidas en días distintos. ' +
        (dateIsProxy ? 'El modo elegido ordena por fecha de incorporación a la lista y siempre produce resultados exploratorios; no representa necesariamente el orden real de visionado.' : 'Usa watchedAt/watched_at por defecto. Si tu JSON solo contiene la fecha de incorporación a la lista, puedes activar el proxy anterior para hacer una comparación exploratoria.') +
        '</p>';
    } else if (!result.available) {
      body = '<p class="metric-note" aria-live="polite">Evaluación temporal no disponible: ' +
        ctx.escapeHTML(result.unavailableReason || "faltan suficientes valoraciones fechadas.") + '</p>' +
        '<p class="metric-note">' + dateSourceDescription + '</p>' +
        '<p class="metric-note">Con características: ' + Number(result.featureRowCount || 0) +
        ' · con fecha: ' + Number(result.timestampedFeatureCount || 0) +
        ' · campo watchedAt explícito: ' + Number(result.explicitDateCount || 0) +
        ' · procedencia no verificable: ' + Number(result.unverifiedDateCount || 0) +
        ' · sin fecha: ' + Number(result.missingDateCount || 0) + '.</p>';
    } else {
      const delta = Number(result.deltaBaseMinusRidge);
      const stability = result.windowStability || {};
      const modes = result.rankingQuality && Array.isArray(result.rankingQuality.modes)
        ? result.rankingQuality.modes : [];
      const alphaCounts = Object.keys(result.selectedAlphaCounts || {}).filter(function (alpha) {
        return Number(result.selectedAlphaCounts[alpha]) > 0;
      }).sort(function (left, right) { return Number(left) - Number(right); }).map(function (alpha) {
        return alpha + ": " + Number(result.selectedAlphaCounts[alpha]);
      }).join(" · ");
      const modeMarkup = modes.filter(function (mode) { return mode.available; }).map(function (mode) {
        const difference = Number(mode.deltaRidgeMinusBaseline);
        return '<p class="metric-note"><strong>' + ctx.escapeHTML(modeNames[mode.mode] || mode.mode) +
          ' · nDCG@5:</strong> aditivo ' + Number(mode.baselineNdcgAt5).toFixed(4).replace(".", ",") +
          ' · Ridge ' + Number(mode.ridgeNdcgAt5).toFixed(4).replace(".", ",") +
          ' · cambio ' + (difference > 0 ? "+" : "") + difference.toFixed(4).replace(".", ",") +
          ' · ventanas válidas ' + Number(mode.foldsEvaluated || 0) + '.</p>';
      }).join("");
      const windowsMarkup = (result.windowSummaries || []).map(function (window) {
        const windowDelta = Number(window.deltaBaseMinusRidge);
        return '<p class="metric-note"><strong>' + (dateIsProxy ? 'Ventana por incorporación ' : 'Ventana futura ') + Number(window.window || 0) + ':</strong> entrenamiento n=' +
          Number(window.trainingCount || 0) + ' · prueba n=' + Number(window.testCount || 0) +
          ' · alpha ' + Number(window.selectedAlpha || 0) +
          ' · MAE Ridge ' + Number(window.mae).toFixed(4).replace(".", ",") +
          ' · aditivo ' + Number(window.baselineMae).toFixed(4).replace(".", ",") +
          ' · base − Ridge ' + (windowDelta > 0 ? "+" : "") + windowDelta.toFixed(4).replace(".", ",") + '.</p>';
      }).join("");
      body = '<div class="metrics-grid">' +
        ctx.metric("MAE Ridge temporal", Number(result.mae).toFixed(4).replace(".", ","), Number(result.testCount || 0) + (dateIsProxy ? " valoraciones posteriores por incorporación" : " valoraciones futuras")) +
        ctx.metric("MAE aditivo", Number(result.baselineMae).toFixed(4).replace(".", ","), dateIsProxy ? "Mismas valoraciones ordenadas por incorporación" : "Mismas valoraciones futuras") +
        ctx.metric("Base − Ridge", (delta > 0 ? "+" : "") + delta.toFixed(4).replace(".", ","), "Positivo favorece Ridge") +
        '</div>' +
        '<p class="metric-note">Muestra fechada con características: ' + Number(result.timestampedFeatureCount || 0) +
        ' · entrenamiento inicial: ' + Number(result.warmupCount || 0) +
        (dateIsProxy ? ' · prueba ordenada por incorporación: ' : ' · prueba futura: ') + Number(result.testCount || 0) +
        ' · campo watchedAt explícito: ' + Number(result.explicitDateCount || 0) +
        ' · procedencia no verificable: ' + Number(result.unverifiedDateCount || 0) +
        ' · sin fecha: ' + Number(result.missingDateCount || 0) + '.</p>' +
        '<p class="metric-note">' + dateSourceDescription + '</p>' +
        (result.dateProvenanceStatus === "exploratory"
          ? '<p class="metric-note">Resultado <strong>exploratorio</strong>: algunas fechas no tienen procedencia de visionado verificable. No interpretes la fecha de incorporación a una lista como el día confirmado en que viste la película. Los resultados no son evidencia concluyente.</p>'
          : '<p class="metric-note">Las fechas usadas tienen procedencia explícita o confirmada. Este marcador describe la procedencia del dato, no verifica de forma independiente que la fecha de origen sea correcta.</p>') +
        '<p class="metric-note">Alpha se eligió en tres ventanas internas ordenadas dentro del pasado disponible: ' +
        ctx.escapeHTML(alphaCounts || "sin datos") + '.</p>' +
        (stability.available
          ? '<p class="metric-note">Estabilidad entre las ' + Number(stability.windowsEvaluated || 0) +
            ' ventanas: Ridge mejora el MAE en ' + Number(stability.ridgeMaeWins || 0) +
            ', empata en ' + Number(stability.ties || 0) + ' y la base mejora en ' +
            Number(stability.baselineMaeWins || 0) + '.</p>'
          : '') +
        '<h4>' + (dateIsProxy ? 'Calidad del orden por fecha de incorporación · nDCG@5 (exploratoria)' : 'Calidad del orden futuro · nDCG@5') + '</h4>' +
        (modeMarkup || '<p class="metric-note">nDCG@5 no disponible ' + (dateIsProxy ? 'con las valoraciones ordenadas por fecha de incorporación' : 'con la parte futura de esta muestra') + ': se necesitan al menos 50 pruebas y 10 notas relevantes.</p>') +
        '<h4>Resultados agregados por ventana</h4>' + windowsMarkup +
        '<p class="metric-note">Las ventanas son bloques temporales del mismo historial, no muestras independientes. No se muestran fechas exactas. Las recomendaciones activas siguen usando el modelo aditivo.</p>';
    }
    return '<section class="panel temporal-ridge-panel" aria-labelledby="temporal-ridge-heading">' +
      '<div class="panel-head"><div><h3 id="temporal-ridge-heading">Validación temporal · Ridge frente al modelo aditivo</h3>' +
      '<p class="metric-note">' + (dateIsProxy ? 'Orden temporal exploratorio por fecha de incorporación; no equivale a la fecha real de visionado' : 'Entrenar con el pasado; probar con visionados posteriores') + '</p></div>' +
      '<p class="metric-note lab-automatic-label">Incluida en el diagnóstico automático</p></div>' +
      dateProxyControl + body +
      '<p class="metric-note">Cautela con historiales antiguos: algunas versiones anteriores pudieron guardar ciertas fechas a partir de la edición de una nota. Las fechas watchedAt ya existentes no siempre permiten verificar esa procedencia. Las ediciones sin fecha fiable no crean watchedAt desde updatedAt.</p>' +
      '</section>';
  }

  return { renderTemporalRidgePanel };
}
