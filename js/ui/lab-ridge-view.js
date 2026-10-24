import { summarizeRepeatedRidgeStability } from "../recommendations/repeated-validation-summary.js?v=core-20261021-1";

export function createLabRidgeView(ctx) {
  function renderRidgeExperimentPanel() {
    const result = ctx.ridgeEvaluationResult || null;
    const busy = Boolean(ctx.ridgeEvaluationBusy);
    const temporalBusy = Boolean(ctx.temporalRidgeEvaluationBusy);
    const metricsBusy = Boolean(ctx.labMetricsBusy);
    const progress = ctx.ridgeEvaluationProgress || null;
    const completedRepeats = Number(progress && progress.completedRepeats || 0);
    const totalRepeats = Number(progress && progress.totalRepeats || 3);
    const buttonLabel = metricsBusy ? "Preparando métricas iniciales…" : (busy ? "Ridge " + completedRepeats + "/" + totalRepeats + "…" :
      (temporalBusy ? "Evaluación temporal en curso…" : (result ? "Volver a ejecutar" : "Ejecutar experimento Ridge")));
    let body = "";
    if (busy) {
      body = '<p class="metric-note" aria-live="polite">Validación repetida en curso: ' + completedRepeats + ' de ' +
        totalRepeats + ' repeticiones completadas. Cada repetición evalúa cinco pliegues externos y selecciona alpha en tres pliegues internos. El cálculo es local; no se envían ni guardan datos nuevos.</p>';
    } else if (!result) {
      body = '<p class="metric-note" aria-live="polite">Esta validación anidada se ejecuta automáticamente en la batería: cinco pliegues externos, tres internos y tres repeticiones para elegir alpha sin consultar las notas retenidas.</p>';
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
      const alphaComparison = result.alphaSelectionComparison || null;
      const formatAlphaCounts = function (counts) {
        return Object.keys(counts || {}).filter(function (alpha) {
          return Number(counts[alpha]) > 0;
        }).sort(function (left, right) { return Number(left) - Number(right); }).map(function (alpha) {
          return alpha + ': ' + Number(counts[alpha]);
        }).join(' · ') || 'sin selecciones disponibles';
      };
      let alphaSelectionMarkup = '';
      if (alphaComparison) {
        const lowerBoundary = alphaComparison.lowerBoundary || {};
        const lowerBoundaryUnresolved = Boolean(lowerBoundary.unresolved ||
          (lowerBoundary.mae && lowerBoundary.mae.unresolved) ||
          (lowerBoundary.ranking && lowerBoundary.ranking.unresolved));
        const boundaryMessage = lowerBoundaryUnresolved
          ? 'El límite inferior sigue sin resolverse: el alpha mínimo se eligió en la mayoría de los pliegues válidos de al menos un criterio. Esto no demuestra que reducirlo mejore el ranking.'
          : 'El alpha mínimo no fue elegido en la mayoría de los pliegues completados; esta rejilla no aporta evidencia para seguir reduciendo el límite solo por frecuencia.';
        const selectionModes = (alphaComparison.rankingModes || []).map(function (mode) {
          if (!mode.available) return '<p class="metric-note"><strong>' +
            ctx.escapeHTML(rankingModeNames[mode.mode] || mode.mode) +
            ':</strong> nDCG@5 comparativo no disponible.</p>';
          const delta = Number(mode.deltaRankingSelectionMinusMaeSelection);
          return '<p class="metric-note"><strong>' + ctx.escapeHTML(rankingModeNames[mode.mode] || mode.mode) +
            ':</strong> Ridge-MAE ' + Number(mode.maeSelectedNdcgAt5).toFixed(4).replace('.', ',') +
            ' · Ridge-ranking ' + Number(mode.rankingSelectedNdcgAt5).toFixed(4).replace('.', ',') +
            ' · cambio ranking − MAE ' + (delta > 0 ? '+' : '') + delta.toFixed(4).replace('.', ',') +
            ' · victorias ' + Number(mode.rankingSelectorWins || 0) +
            ' · empates ' + Number(mode.ties || 0) +
            ' · derrotas ' + Number(mode.rankingSelectorLosses || 0) +
            ' · pliegues válidos ' + Number(mode.foldsEvaluated || 0) + '.</p>';
        }).join('');
        const foldDetails = (alphaComparison.foldSummaries || []).map(function (fold) {
          const maeDelta = fold.deltaRankingSelectionMinusMaeSelection;
          const modes = (fold.rankingModes || []).map(function (mode) {
            const name = rankingModeNames[mode.mode] || mode.mode;
            if (!mode.available) return name + ': no disponible';
            const delta = Number(mode.deltaRankingSelectionMinusMaeSelection);
            return name + ' ' + Number(mode.maeSelectedNdcgAt5).toFixed(3).replace('.', ',') +
              ' → ' + Number(mode.rankingSelectedNdcgAt5).toFixed(3).replace('.', ',') +
              ' (' + (delta > 0 ? '+' : '') + delta.toFixed(3).replace('.', ',') + ')';
          }).join(' · ');
          return '<li class="metric-note">Repetición ' + Number(fold.repeat) + ', pliegue ' + Number(fold.outerFold) +
            ': alpha MAE ' + Number(fold.selectedAlphaByMae) +
            ' · alpha ranking ' + (fold.selectedAlphaByRanking == null ? 'no disponible' : Number(fold.selectedAlphaByRanking)) +
            ' · MAE referencia ' + Number(fold.baselineMae).toFixed(3).replace('.', ',') +
            ' · MAE Ridge-MAE ' + Number(fold.maeSelectedMae).toFixed(3).replace('.', ',') +
            ' · MAE Ridge-ranking ' + (fold.rankingSelectedMae == null ? 'no disponible' : Number(fold.rankingSelectedMae).toFixed(3).replace('.', ',')) +
            ' · delta MAE ranking − MAE ' + (maeDelta == null ? 'no disponible' : (Number(maeDelta) > 0 ? '+' : '') + Number(maeDelta).toFixed(3).replace('.', ',')) +
            ' · ' + ctx.escapeHTML(modes) + '.</li>';
        }).join('');
        alphaSelectionMarkup = '<section class="ridge-alpha-selection" aria-label="Comparación de selección Ridge alpha">' +
          '<h4>Selección de alpha: MAE vs ranking</h4>' +
          '<p class="metric-note">Rejilla ampliada: ' + (alphaComparison.alphaGrid || []).map(String).join(', ') +
          '. Selección anidada: tres pliegues internos por cada pliegue exterior; las notas exteriores solo miden el resultado.</p>' +
          '<p class="metric-note"><strong>Conteo por MAE:</strong> ' +
          ctx.escapeHTML(formatAlphaCounts(alphaComparison.selectedAlphaCountsByMae)) + '.</p>' +
          '<p class="metric-note"><strong>Conteo por ranking:</strong> ' +
          ctx.escapeHTML(formatAlphaCounts(alphaComparison.selectedAlphaCountsByRanking)) + '.</p>' +
          '<p class="metric-note">' + ctx.escapeHTML(boundaryMessage) + '</p>' +
          (alphaComparison.available
            ? '<p class="metric-note"><strong>MAE exterior emparejado:</strong> referencia aditiva ' +
              Number(alphaComparison.maeSelected.baselineMaeSameFolds).toFixed(4).replace('.', ',') +
              ' · Ridge con alpha MAE ' + Number(alphaComparison.maeSelected.mae).toFixed(4).replace('.', ',') +
              ' · delta base − Ridge ' + (Number(alphaComparison.maeSelected.deltaBaselineMinusMaeSelected) > 0 ? '+' : '') +
              Number(alphaComparison.maeSelected.deltaBaselineMinusMaeSelected).toFixed(4).replace('.', ',') +
              '.</p><p class="metric-note"><strong>Ridge con alpha por ranking:</strong> MAE ' +
              Number(alphaComparison.rankingSelected.mae).toFixed(4).replace('.', ',') +
              ' · delta base − Ridge ' + (Number(alphaComparison.rankingSelected.deltaBaselineMinusRankingSelected) > 0 ? '+' : '') +
              Number(alphaComparison.rankingSelected.deltaBaselineMinusRankingSelected).toFixed(4).replace('.', ',') +
              ' · comparativa MAE entre selecciones: ' +
              (Number(alphaComparison.pairedMaeDifference.deltaRankingSelectionMinusMaeSelection) > 0 ? '+' : '') +
              Number(alphaComparison.pairedMaeDifference.deltaRankingSelectionMinusMaeSelection).toFixed(4).replace('.', ',') +
              '.</p>'
            : '<p class="metric-note">Comparación externa por ranking no disponible: ' +
              ctx.escapeHTML(alphaComparison.unavailableReason || 'muestra o pliegues válidos insuficientes') + '</p>') +
          '<h5>nDCG@5: selección por criterio y modo</h5>' + (selectionModes || '<p class="metric-note">No disponible.</p>') +
          '<details><summary>Detalle de los pliegues exteriores emparejados</summary><ul>' +
          (foldDetails || '<li class="metric-note">No hay pliegues completados.</li>') +
          '</ul><p class="metric-note">Los pliegues pertenecen al mismo historial de evaluación; se presentan como diagnóstico descriptivo, no como observaciones independientes ni prueba estadística.</p></details>' +
          '</section>';
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
        alphaSelectionMarkup +
        repeatedMarkup +
        '<p class="metric-note">Solo diagnóstico: las recomendaciones activas siguen usando el modelo aditivo. nDCG@5 mide el orden de películas valoradas retenidas y no garantiza satisfacción futura ni significación estadística.</p>';
    }
    return '<section class="panel ridge-experiment-panel" aria-labelledby="ridge-experiment-heading">' +
      '<div class="panel-head"><div><h3 id="ridge-experiment-heading">Experimento Ridge (regularización L2)</h3>' +
      '<p class="metric-note">Comparación local de la base aditiva, Ridge y una mezcla fija 50/50</p></div>' +
      '<p class="metric-note lab-automatic-label">Incluida en el diagnóstico automático</p></div>' +
      body + '</section>';
  }

  return { renderRidgeExperimentPanel };
}
