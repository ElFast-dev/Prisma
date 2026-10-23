import { summarizeRepeatedRidgeStability } from "../recommendations/repeated-validation-summary.js?v=core-20261021-1";

export function createLabViews(ctx) {
  function renderRecommendationDiagnosticPanel() {
    const reportText = ctx.recommendationDiagnosticReportText || "";
    const disclosure = '<p class="metric-note">El informe se calcula con tus datos reales en este dispositivo. Incluye cantidades, distribución agregada de notas, cobertura del perfil, pesos del modelo, estadísticas resumidas de señales y los resultados agregados de MAE, Ridge, validación repetida y temporal, nDCG@5 por modo y diversidad.</p>' +
      '<p class="metric-note">No incluye títulos de películas, IDs TMDB, notas por película, fechas personales, emociones, notas libres, credenciales ni copias de seguridad. Si incluyes nombres de señales, esos géneros y temas agregados pueden revelar parte de tus gustos.</p>';
    const detailsToggle = '<label class="diagnostic-feature-option"><input id="diagnosticFeatureLabels" type="checkbox"' +
      (ctx.recommendationDiagnosticFeatureLabelsIncluded ? ' checked' : '') +
      '> Incluir hasta 40 nombres de señales agregadas (géneros, temas y décadas) para facilitar el análisis</label>';
    const output = reportText
      ? '<div class="diagnostic-report-result"><p class="metric-note">' + ctx.escapeHTML(ctx.recommendationDiagnosticCopyMessage || "") + '</p>' +
        '<textarea class="field diagnostic-report-output" id="recommendationDiagnosticOutput" rows="12" readonly aria-label="Informe técnico para revisar">' + ctx.escapeHTML(reportText) + '</textarea>' +
        '<div class="hero-actions"><button class="btn btn-quiet btn-small" type="button" data-action="clear-recommendation-diagnostics">Limpiar informe</button></div></div>'
      : "";
    return '<section class="panel recommendation-diagnostic-panel" aria-labelledby="recommendation-diagnostic-heading">' +
      '<div class="panel-head"><div><h3 id="recommendation-diagnostic-heading">Informe para revisar el recomendador</h3><p class="metric-note">Preparado localmente a partir de las pruebas del Laboratorio</p></div>' +
      '<button class="btn btn-secondary btn-small" type="button" data-action="copy-recommendation-diagnostics">Copiar diagnóstico técnico</button></div>' +
      disclosure + detailsToggle +
      '<p class="metric-note">Copiar no envía datos. Solo tú decides si pegas el informe en otra conversación.</p>' +
      output + '</section>';
  }

  function renderRidgeExperimentPanel() {
    const result = ctx.ridgeEvaluationResult || null;
    const busy = Boolean(ctx.ridgeEvaluationBusy);
    const temporalBusy = Boolean(ctx.temporalRidgeEvaluationBusy);
    const progress = ctx.ridgeEvaluationProgress || null;
    const completedRepeats = Number(progress && progress.completedRepeats || 0);
    const totalRepeats = Number(progress && progress.totalRepeats || 3);
    const buttonLabel = busy ? "Ridge " + completedRepeats + "/" + totalRepeats + "…" :
      (temporalBusy ? "Evaluación temporal en curso…" : (result ? "Volver a ejecutar" : "Ejecutar experimento Ridge"));
    let body = "";
    if (busy) {
      body = '<p class="metric-note" aria-live="polite">Validación repetida en curso: ' + completedRepeats + ' de ' +
        totalRepeats + ' repeticiones completadas. Cada repetición evalúa cinco pliegues externos y selecciona alpha en tres pliegues internos. El cálculo es local; no se envían ni guardan datos nuevos.</p>';
    } else if (!result) {
      body = '<p class="metric-note" aria-live="polite">Esta prueba no se ejecuta automáticamente. Ejecuta validación anidada repetida (3 × 5 pliegues) para elegir alpha sin consultar las notas retenidas al evaluar.</p>';
    } else if (!result.available) {
      body = '<p class="metric-note" aria-live="polite">' + ctx.escapeHTML(result.reason || "No hay una muestra suficiente para evaluar Ridge.") + '</p>';
    } else {
      const ridgeMae = Number(result.mae);
      const baseMae = Number(result.baselineMae);
      const delta = Number(result.deltaBaseMinusRidge);
      const alphaCounts = Object.keys(result.selectedAlphaCounts || {}).filter(function (alpha) {
        return Number(result.selectedAlphaCounts[alpha]) > 0;
      }).sort(function (left, right) { return Number(left) - Number(right); }).map(function (alpha) {
        return alpha + ": " + Number(result.selectedAlphaCounts[alpha]);
      }).join(" · ");
      const comparison = Math.abs(delta) < 0.005
        ? "Ridge y la base aditiva tienen un MAE muy parecido en estos pliegues."
        : delta > 0
          ? "Ridge reduce el MAE en " + delta.toFixed(3).replace(".", ",") + " puntos frente a la base aditiva en los mismos pliegues."
          : "Ridge aumenta el MAE en " + Math.abs(delta).toFixed(3).replace(".", ",") + " puntos frente a la base aditiva en los mismos pliegues.";
      const rankingQuality = result.rankingQuality || null;
      const rankingModeNames = { balanced: "Equilibrado", affinity: "Más afines", variety: "Más variedad" };
      let rankingMarkup = "";
      if (rankingQuality && rankingQuality.available) {
        rankingMarkup = '<div class="ridge-ranking-quality"><h4>Calidad del orden · nDCG@5</h4>' +
          '<p class="metric-note">Mismas películas externas y mismos pliegues para los tres comparadores; son valoraciones conocidas retenidas, no películas desconocidas.</p>' +
          (rankingQuality.modes || []).map(function (mode) {
            const baseline = Number(mode.baselineNdcgAt5);
            const ridge = Number(mode.ridgeNdcgAt5);
            const difference = Number(mode.deltaRidgeMinusBaseline);
            if (!mode.available || !Number.isFinite(baseline) || !Number.isFinite(ridge) || !Number.isFinite(difference)) return "";
            const hybrid = mode.hybridNdcgAt5 == null || mode.deltaHybridMinusBaseline == null
              ? ""
              : ' · Híbrido 50/50 ' + Number(mode.hybridNdcgAt5).toFixed(4).replace(".", ",") +
                ' · cambio ' + (Number(mode.deltaHybridMinusBaseline) > 0 ? "+" : "") +
                Number(mode.deltaHybridMinusBaseline).toFixed(4).replace(".", ",") +
                ' · gana ' + Number(mode.foldsHybridWins || 0) + ', empata ' +
                Number(mode.foldsHybridTies || 0) + ', pierde ' + Number(mode.foldsHybridLosses || 0);
            return '<p class="metric-note"><strong>' + ctx.escapeHTML(rankingModeNames[mode.mode] || mode.mode) + ':</strong> aditivo ' +
              baseline.toFixed(4).replace(".", ",") + ' · Ridge ' + ridge.toFixed(4).replace(".", ",") + hybrid +
              ' · cambio Ridge ' + (difference > 0 ? "+" : "") + difference.toFixed(4).replace(".", ",") +
              ' · pliegues válidos: ' + Number(mode.foldsEvaluated || 0) + '.</p>';
          }).join("") + '</div>';
      } else {
        rankingMarkup = '<p class="metric-note">Comparación de nDCG@5: ' +
          ctx.escapeHTML((rankingQuality && rankingQuality.reason) || "No disponible con esta muestra.") + '</p>';
      }
      const stability = result.foldStability || {};
      const foldStabilityMarkup = stability.available
        ? '<p class="metric-note">Estabilidad de MAE (' + Number(stability.foldsEvaluated || 0) + ' pliegues): Ridge mejora en ' +
          Number(stability.ridgeMaeWins || 0) + ', empata en ' + Number(stability.ties || 0) + ' y la base mejora en ' +
          Number(stability.baselineMaeWins || 0) + '. Recuento descriptivo, no prueba de significación estadística.</p>'
        : '';
      const hybridStability = result.hybridFoldStability || {};
      const hybridFoldStabilityMarkup = hybridStability.available
        ? '<p class="metric-note">Estabilidad del híbrido 50/50 frente a la base (' +
          Number(hybridStability.foldsEvaluated || 0) + ' pliegues): mejora en ' +
          Number(hybridStability.hybridMaeWins || 0) + ', empata en ' +
          Number(hybridStability.ties || 0) + ' y la base mejora en ' +
          Number(hybridStability.baselineMaeWins || 0) +
          '. Recuento descriptivo, no prueba de significación estadística.</p>'
        : '';
      const repeated = result.repeatedValidation || null;
      let repeatedMarkup = '';
      if (repeated && repeated.available) {
        const repeatedRanking = repeated.rankingQuality || {};
        const repeatedModeMarkup = (repeatedRanking.modes || []).map(function (mode) {
          if (!mode.available) return '';
          const baseline = Number(mode.baselineNdcgAt5);
          const ridge = Number(mode.ridgeNdcgAt5);
          const deltaMode = Number(mode.deltaRidgeMinusBaseline);
          if (!Number.isFinite(baseline) || !Number.isFinite(ridge) || !Number.isFinite(deltaMode)) return '';
          const hybridText = mode.hybridNdcgAt5 == null || mode.deltaHybridMinusBaseline == null
            ? ""
            : ' · híbrido 50/50 ' + Number(mode.hybridNdcgAt5).toFixed(4).replace('.', ',') +
              ' · cambio ' + (Number(mode.deltaHybridMinusBaseline) > 0 ? '+' : '') +
              Number(mode.deltaHybridMinusBaseline).toFixed(4).replace('.', ',') +
              ' · gana ' + Number(mode.foldsHybridWins || 0) + ', empata ' +
              Number(mode.foldsHybridTies || 0) + ', pierde ' + Number(mode.foldsHybridLosses || 0);
          return '<p class="metric-note"><strong>' + ctx.escapeHTML(rankingModeNames[mode.mode] || mode.mode) +
            ':</strong> aditivo ' + baseline.toFixed(4).replace('.', ',') + ' · Ridge ' +
            ridge.toFixed(4).replace('.', ',') + hybridText + ' · cambio Ridge ' +
            (deltaMode > 0 ? '+' : '') + deltaMode.toFixed(4).replace('.', ',') +
            ' · pliegues válidos ' + Number(mode.foldsEvaluated || 0) + '.</p>';
        }).join('');
        const repeatedAlphaCounts = Object.keys(repeated.selectedAlphaCounts || {}).filter(function (alpha) {
          return Number(repeated.selectedAlphaCounts[alpha]) > 0;
        }).sort(function (left, right) { return Number(left) - Number(right); }).map(function (alpha) {
          return alpha + ': ' + Number(repeated.selectedAlphaCounts[alpha]);
        }).join(' · ');
        const repeatedFoldStability = repeated.foldStability || {};
        const hybridRepeatedStability = repeated.hybridFoldStability || {};
        const repeatConsistency = summarizeRepeatedRidgeStability(repeated);
        const formatObservedDelta = function (value) {
          return (Number(value) > 0 ? "+" : "") + Number(value).toFixed(4).replace(".", ",");
        };
        const consistencyLine = function (label, summary) {
          if (!summary || !summary.available) return "";
          return '<p class="metric-note"><strong>' + ctx.escapeHTML(label) + ':</strong> cambio favorable a Ridge en ' +
            Number(summary.ridgeFavorableRepeats || 0) + '/' + Number(summary.repeatsEvaluated || 0) +
            ' repeticiones válidas · empates ' + Number(summary.ties || 0) +
            ' · a favor de la base: ' + Number(summary.baselineFavorableRepeats || 0) +
            ' · rango observado ' + formatObservedDelta(summary.minDelta) + ' a ' +
            formatObservedDelta(summary.maxDelta) + '.</p>';
        };
        const repeatConsistencyMarkup = repeatConsistency.available
          ? '<h5>Consistencia por repetición (agregados)</h5>' +
            consistencyLine("MAE (base − Ridge)", repeatConsistency.mae) +
            repeatConsistency.rankingModes.map(function (mode) {
              return consistencyLine((rankingModeNames[mode.mode] || mode.mode) + " · nDCG@5", mode);
            }).join("") +
            '<p class="metric-note">El rango es el observado en estas repeticiones, no un intervalo de confianza. Las repeticiones usan el mismo historial.</p>'
          : "";
        const repeatMarkup = (repeated.repeatSummaries || []).map(function (repeat) {
          const repeatDelta = Number(repeat.deltaBaseMinusRidge);
          const repeatHybridDelta = Number(repeat.deltaBaseMinusHybrid);
          const repeatAlphaCounts = Object.keys(repeat.selectedAlphaCounts || {}).filter(function (alpha) {
            return Number(repeat.selectedAlphaCounts[alpha]) > 0;
          }).sort(function (left, right) { return Number(left) - Number(right); }).map(function (alpha) {
            return alpha + ': ' + Number(repeat.selectedAlphaCounts[alpha]);
          }).join(' · ');
          const repeatModes = repeat.rankingQuality && Array.isArray(repeat.rankingQuality.modes)
            ? repeat.rankingQuality.modes : [];
          const modeDeltaText = repeatModes.filter(function (mode) {
            return mode.available && Number.isFinite(Number(mode.deltaRidgeMinusBaseline));
          }).map(function (mode) {
            const deltaMode = Number(mode.deltaRidgeMinusBaseline);
            return (rankingModeNames[mode.mode] || mode.mode) + ' ' +
              (deltaMode > 0 ? '+' : '') + deltaMode.toFixed(3).replace('.', ',');
          }).join(' · ');
          return '<p class="metric-note"><strong>Repetición ' + Number(repeat.repeat || 0) + ':</strong> MAE Ridge ' +
            Number(repeat.mae).toFixed(4).replace('.', ',') + ' · base ' +
            Number(repeat.baselineMae).toFixed(4).replace('.', ',') + ' · base − Ridge ' +
            (repeatDelta > 0 ? '+' : '') + repeatDelta.toFixed(4).replace('.', ',') +
            ' · MAE híbrido 50/50 ' + Number(repeat.hybridMae).toFixed(4).replace('.', ',') +
            ' · base − híbrido ' + (repeatHybridDelta > 0 ? '+' : '') + repeatHybridDelta.toFixed(4).replace('.', ',') +
            (repeatAlphaCounts ? ' · alpha: ' + ctx.escapeHTML(repeatAlphaCounts) : '') +
            (modeDeltaText ? ' · delta nDCG@5 Ridge: ' + ctx.escapeHTML(modeDeltaText) : '') + '.</p>';
        }).join('');
        repeatedMarkup = '<section class="ridge-repeated-validation" aria-label="Validación Ridge repetida">' +
          '<h4>Validación repetida · ' + Number(repeated.repeats || 0) + ' × ' +
          Number(repeated.foldsPerRepeat || 0) + ' pliegues</h4>' +
          '<p class="metric-note">Resultado agrupado de ' + Number(repeated.foldsEvaluated || 0) +
          ' pliegues externos: MAE Ridge ' + Number(repeated.mae).toFixed(4).replace('.', ',') +
          ' · base ' + Number(repeated.baselineMae).toFixed(4).replace('.', ',') +
          ' · base − Ridge ' + (Number(repeated.deltaBaseMinusRidge) > 0 ? '+' : '') +
          Number(repeated.deltaBaseMinusRidge).toFixed(4).replace('.', ',') +
          ' · MAE híbrido 50/50 ' + Number(repeated.hybridMae).toFixed(4).replace('.', ',') +
          ' · base − híbrido ' + (Number(repeated.deltaBaseMinusHybrid) > 0 ? '+' : '') +
          Number(repeated.deltaBaseMinusHybrid).toFixed(4).replace('.', ',') + '.</p>' +
          '<p class="metric-note">Alpha elegido en los pliegues de las repeticiones (recuento agregado): ' +
          ctx.escapeHTML(repeatedAlphaCounts || 'sin datos') + '.</p>' +
          (repeatedFoldStability.available
            ? '<p class="metric-note">Estabilidad de MAE de Ridge en 15 pliegues: mejora en ' +
              Number(repeatedFoldStability.ridgeMaeWins || 0) + ', empata en ' +
              Number(repeatedFoldStability.ties || 0) + ' y la base mejora en ' +
              Number(repeatedFoldStability.baselineMaeWins || 0) + '.</p>'
            : '') +
          (hybridRepeatedStability.available
            ? '<p class="metric-note">Estabilidad de MAE del híbrido 50/50 en 15 pliegues: mejora en ' +
              Number(hybridRepeatedStability.hybridMaeWins || 0) + ', empata en ' +
              Number(hybridRepeatedStability.ties || 0) + ' y la base mejora en ' +
              Number(hybridRepeatedStability.baselineMaeWins || 0) + '.</p>'
            : '') +
          repeatConsistencyMarkup +
          '<h5>nDCG@5 agrupado por modo</h5>' + (repeatedModeMarkup || '<p class="metric-note">nDCG@5 no disponible con esta muestra.</p>') +
          '<h5>Resultados por repetición</h5>' + repeatMarkup +
          '<p class="metric-note">Estas repeticiones reutilizan el mismo historial y no constituyen muestras independientes ni una prueba de significación estadística. El ranking activo sigue usando el modelo aditivo.</p>' +
          '</section>';
      } else if (repeated && !repeated.available) {
        repeatedMarkup = '<p class="metric-note">Validación repetida no disponible: ' +
          ctx.escapeHTML(repeated.unavailableReason || 'no hay suficientes datos.') + '</p>';
      }
      const hybridMae = Number(result.hybridMae);
      const deltaHybrid = Number(result.deltaBaseMinusHybrid);
      const hybridComparison = Math.abs(deltaHybrid) < 0.005
        ? "El híbrido y la base aditiva tienen un MAE muy parecido en estos pliegues."
        : deltaHybrid > 0
          ? "El híbrido reduce el MAE en " + deltaHybrid.toFixed(3).replace(".", ",") + " puntos frente a la base aditiva."
          : "El híbrido aumenta el MAE en " + Math.abs(deltaHybrid).toFixed(3).replace(".", ",") + " puntos frente a la base aditiva.";
      body = '<div class="metrics-grid">' +
        ctx.metric("MAE Ridge", ridgeMae.toFixed(4).replace(".", ","), result.count + " películas · " + result.foldsEvaluated + "/" + result.outerFolds + " pliegues") +
        ctx.metric("MAE aditivo emparejado", baseMae.toFixed(4).replace(".", ","), "Mismas películas externas") +
        ctx.metric("MAE híbrido 50/50", hybridMae.toFixed(4).replace(".", ","), "Media de Ridge y aditivo") +
        ctx.metric("Diferencia base − Ridge", (delta > 0 ? "+" : "") + delta.toFixed(4).replace(".", ","), "Positivo favorece Ridge") +
        '</div><p class="metric-note" aria-live="polite">' + ctx.escapeHTML(comparison) + '</p>' +
        '<p class="metric-note" aria-live="polite">' + ctx.escapeHTML(hybridComparison) + ' Diferencia descriptiva, no una prueba de significación.</p>' +
        '<p class="metric-note">Alpha se seleccionó en ' + result.innerFolds + ' pliegues internos entre ' +
          (result.alphaGrid || []).map(function (value) { return String(value); }).join(", ") + '. Distribución elegida por pliegue: ' +
          ctx.escapeHTML(alphaCounts || "sin datos") + '.</p>' +
        foldStabilityMarkup +
        hybridFoldStabilityMarkup +
        rankingMarkup +
        repeatedMarkup +
        '<p class="metric-note">Solo diagnóstico: las recomendaciones activas siguen usando el modelo aditivo. nDCG@5 mide el orden de películas valoradas retenidas y no garantiza satisfacción futura ni significación estadística.</p>';
    }
    return '<section class="panel ridge-experiment-panel" aria-labelledby="ridge-experiment-heading">' +
      '<div class="panel-head"><div><h3 id="ridge-experiment-heading">Experimento Ridge (regularización L2)</h3>' +
      '<p class="metric-note">Comparación local de la base aditiva, Ridge y una mezcla fija 50/50</p></div>' +
      '<button class="btn btn-secondary btn-small" type="button" data-action="run-ridge-experiment"' +
      (busy || temporalBusy ? ' disabled aria-disabled="true"' : '') + '>' + buttonLabel + '</button></div>' +
      body + '</section>';
  }


  function renderInfluenceNormalizationPanel() {
    const result = ctx.influenceNormalizationEvaluationResult || null;
    const busy = Boolean(ctx.influenceNormalizationEvaluationBusy);
    const ridgeBusy = Boolean(ctx.ridgeEvaluationBusy);
    const temporalBusy = Boolean(ctx.temporalRidgeEvaluationBusy);
    const buttonLabel = busy ? "Evaluando normalización…" : (result ? "Volver a evaluar" : "Evaluar normalización");
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
        '<p class="metric-note">Pulsa “Evaluar normalización” para calcular MAE, estabilidad por pliegue y nDCG@5. La ejecución es local y no modifica el perfil guardado ni las recomendaciones de producción.</p>';
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
      '<button class="btn btn-secondary btn-small" type="button" data-action="run-influence-normalization-experiment"' +
      (busy || ridgeBusy || temporalBusy ? ' disabled aria-disabled="true"' : '') + '>' + buttonLabel + '</button></div>' +
      body + '</section>';
  }


  function renderTemporalRidgePanel() {
    const result = ctx.temporalRidgeEvaluationResult || null;
    const busy = Boolean(ctx.temporalRidgeEvaluationBusy);
    const ridgeBusy = Boolean(ctx.ridgeEvaluationBusy);
    const useCollectionAddedAtProxy = Boolean(ctx.temporalUseCollectionAddedAtProxy);
    const progress = ctx.temporalRidgeEvaluationProgress || null;
    const completedWindows = Number(progress && progress.completedWindows || 0);
    const totalWindows = Number(progress && progress.totalWindows || 5);
    const buttonLabel = busy ? "Ventana " + completedWindows + "/" + totalWindows + "…" :
      (ridgeBusy ? "Validación Ridge en curso…" : (result ? "Volver a evaluar" : "Evaluar historial temporal"));
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
      (busy || ridgeBusy ? ' disabled aria-disabled="true"' : '') + '>' +
      (useCollectionAddedAtProxy ? "Proxy de fecha añadida: activado" : "Activar proxy de fecha añadida") + '</button>' +
      '<p class="metric-note">' + dateSourceDescription + '</p>' +
      '<p class="metric-note">La elección es temporal y local. No modifica watchedAt, las fechas guardadas ni las recomendaciones activas.</p></div>';
    const modeNames = { balanced: "Equilibrado", affinity: "Más afines", variety: "Más variedad" };
    let body = "";
    if (busy) {
      body = '<p class="metric-note" aria-live="polite">Evaluación temporal en curso: ' + completedWindows + ' de ' +
        totalWindows + (dateIsProxy ? ' ventanas por fecha de incorporación completadas. Esta es una comparación exploratoria, no una cronología confirmada de visionados.' : ' ventanas futuras completadas. Cada ventana se entrena con días anteriores y selecciona alpha con validación walk-forward interna.') + '</p>';
    } else if (ridgeBusy) {
      body = '<p class="metric-note" aria-live="polite">El experimento temporal se ejecutará cuando termine la validación Ridge estándar.</p>';
    } else if (!result) {
      body = '<p class="metric-note">Esta prueba se ejecuta solo al solicitarla. Necesita al menos 100 valoraciones con características y fecha utilizable, repartidas en 12 días distintos. ' +
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
      '<button class="btn btn-secondary btn-small" type="button" data-action="run-temporal-ridge-experiment"' +
      (busy || ridgeBusy ? ' disabled aria-disabled="true"' : '') + '>' + buttonLabel + '</button></div>' +
      dateProxyControl + body +
      '<p class="metric-note">Cautela con historiales antiguos: algunas versiones anteriores pudieron guardar ciertas fechas a partir de la edición de una nota. Las fechas watchedAt ya existentes no siempre permiten verificar esa procedencia. Las ediciones sin fecha fiable no crean watchedAt desde updatedAt.</p>' +
      '</section>';
  }

  function renderLab() {
    const stats = ctx.summaryStats();
    const profile = ctx.buildProfile();
    const evaluation = ctx.evaluateModel();
    const recommendationQuality = ctx.evaluateRecommendationQuality();
    const affinityReference = recommendationQuality.ranking.modes.find(function (item) { return item.mode === "affinity"; });
    const genres = ctx.genreStats();
    const overall = stats.average || 6.5;
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
    const decadeEvaluationMarkup = evaluation.decadeImprovement == null
      ? '<div class="metric-note">Se necesitan al menos 5 valoraciones evaluadas con año válido para medir la señal de década · n=' + (evaluation.decadeExamples || 0) + '</div>'
      : '<div class="metric-note">Sin señal de década: ' + evaluation.withoutDecadeMae.toFixed(2).replace(".",",") + ' MAE</div>' +
        '<div class="metric-note">' + (Math.abs(evaluation.decadeImprovement) < 0.005
          ? 'La década no cambia el MAE en esta muestra.'
          : (evaluation.decadeImprovement > 0
            ? 'Con década, el MAE baja ' : 'Con década, el MAE sube ') +
              Math.abs(evaluation.decadeImprovement).toFixed(2).replace(".",",") + ' puntos frente a la variante sin década.') + '</div>';
    const themeShrinkageEvaluationMarkup = evaluation.themeShrinkageMae == null
      ? '<div class="metric-note">Regularización experimental de temas: se necesitan al menos 5 películas valoradas con características · n=' + evaluation.count + '</div>'
      : '<div class="metric-note">Experimento (temas atenuados por soporte): ' + evaluation.themeShrinkageMae.toFixed(2).replace(".",",") + ' MAE · n=' + evaluation.count + ' · n/(n+' + evaluation.themeShrinkagePrior + ')</div>' +
        '<div class="metric-note">' + (Math.abs(evaluation.themeShrinkageDelta) < 0.005
          ? 'La regularización no cambia el MAE de forma apreciable en esta muestra.'
          : (evaluation.themeShrinkageDelta > 0
            ? 'La variante experimental reduce el MAE en ' : 'La variante experimental aumenta el MAE en ') +
              Math.abs(evaluation.themeShrinkageDelta).toFixed(2).replace(".",",") + ' puntos frente al modelo base.') + '</div>' +
        '<div class="metric-note">Solo diagnóstico: las recomendaciones activas siguen usando el modelo base. Diferencia descriptiva, no una prueba de significación estadística.</div>';
    const evaluationMarkup = (evaluation.available ?
      '<div class="metric-value">' + evaluation.mae.toFixed(2).replace(".",",") + '</div>' +
      '<div class="metric-note">MAE del modelo · n=' + evaluation.count + '</div>' +
      '<div class="metric-note">Referencia (media de entrenamiento): ' + evaluation.baselineMae.toFixed(2).replace(".",",") + '</div>' +
      evaluationComparison + decadeEvaluationMarkup :
      '<div class="metric-value">—</div><div class="metric-note">Datos insuficientes: se necesitan al menos 5 películas valoradas con características · n=' + evaluation.count + '</div>') + themeShrinkageEvaluationMarkup;
    return '<section class="page-heading"><h1>Laboratorio</h1>' + ctx.infoButton("lab","Información sobre el Laboratorio") + '</section>' +
      '<div class="metrics-grid">' + ctx.metric("Historial enlazado",profile.withMetadata + "/" + stats.total,"") + ctx.metric("Señales",String(profile.features.size),"") + ctx.metric("Nota media",overall.toFixed(1).replace(".",","),"") + '</div>' +
      '<div class="lab-metadata-host">' + ctx.renderTMDBHistoryPanel() + '</div>' +
      '<div class="two-col lab-charts"><section class="panel"><div class="panel-head"><h3>Géneros mejor valorados</h3></div>' +
      (top.length ? '<div class="bar-list">' + top.map(function (item) { return ctx.barRow(ctx.displayGenre(item.name),item.average,10,item.average.toFixed(1).replace(".",",") + " · " + item.count); }).join("") + '</div>' : '<div class="empty-inline"><strong>Datos insuficientes</strong></div>') +
      '</section><section class="panel"><div class="panel-head"><h3>Géneros con notas más bajas</h3></div>' +
      (bottom.length ? '<div class="bar-list">' + bottom.map(function (item) { return ctx.barRow(ctx.displayGenre(item.name),item.average,10,item.average.toFixed(1).replace(".",",") + " · " + item.count); }).join("") + '</div>' : '<div class="empty-inline"><strong>Datos insuficientes</strong></div>') +
      '</section></div>' +
      '<section class="panel lab-ranking-diagnostics"><div class="panel-head"><div><h3>Calidad del ranking</h3><p class="metric-note">Diagnóstico offline, no una garantía de gusto futuro.</p></div>' + ctx.infoButton("lab","Información sobre la calidad del ranking y la diversidad") + '</div>' +
      '<div class="metrics-grid">' +
      ctx.metric("Películas evaluables", String(recommendationQuality.ranking.count), "Con características enlazadas") +
      ctx.metric("Notas relevantes", String(recommendationQuality.ranking.relevantCount), "Puntuación personal de 7 a 10") +
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
  }

  return { renderLab };
}
