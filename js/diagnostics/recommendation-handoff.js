const MAX_BRIEF_CHARS = 9500;

function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function count(value) {
  const n = number(value);
  return n == null ? null : Math.max(0, Math.floor(n));
}
function fmt(value, digits = 3) {
  const n = number(value);
  return n == null ? "no disponible" : n.toFixed(digits);
}
function countText(value) {
  const n = count(value);
  return n == null ? "no disponible" : String(n);
}
function clean(value, maxLength = 180) {
  return String(value == null ? "" : value).replace(/[\r\n\t]+/g, " ").replace(/[<>]/g, "").trim().slice(0, maxLength);
}
function improvement(delta, digits = 4) {
  const n = number(delta);
  if (n == null) return "Δ no disponible";
  return "Δ " + (n > 0 ? "+" : "") + n.toFixed(digits);
}
function phaseLabel(id) {
  return ({coverage:"cobertura",baseline:"línea base",ranking:"ranking",normalization:"normalización",ridge:"Ridge",temporal:"temporal",featureFamilies:"familias de características"})[id] || clean(id,40);
}
function modeLabel(mode) {
  return ({balanced:"Equilibrado",affinity:"Más afines",variety:"Más variedad"})[mode] || clean(mode,40);
}
function summarizeCounts(counts) {
  if (!counts || typeof counts !== "object") return "";
  return Object.keys(counts).filter(key => (count(counts[key]) || 0) > 0)
    .sort((a,b) => Number(a)-Number(b))
    .map(key => key + "×" + countText(counts[key])).join(", ");
}
function modeLines(modes, modelKey, deltaKey, winsKey, tiesKey, lossesKey) {
  if (!Array.isArray(modes)) return [];
  return modes.filter(item => item && item.available !== false).map(item => {
    const parts = [modeLabel(item.mode) + ": nDCG@5 " + fmt(item[modelKey],4), improvement(item[deltaKey],4)];
    const wins = count(item[winsKey]), ties = count(item[tiesKey]), losses = count(item[lossesKey]);
    if (wins != null || ties != null || losses != null) parts.push(
      (wins == null ? "?" : wins) + " victorias/" + (ties == null ? "?" : ties) + " empates/" + (losses == null ? "?" : losses) + " derrotas");
    return "- " + parts.join("; ");
  });
}
function makeModeComparison(modes,leftKey,rightKey,deltaKey) {
  if (!Array.isArray(modes)) return [];
  return modes.filter(item => item && item.available !== false).map(item =>
    "- " + modeLabel(item.mode) + ": selección MAE " + fmt(item[leftKey],4) +
    "; selección por ranking " + fmt(item[rightKey],4) + "; " + improvement(item[deltaKey],4));
}
function phaseIssues(run) {
  return (Array.isArray(run && run.phases) ? run.phases : []).filter(p =>
    p && ["error","unavailable","cancelled"].includes(p.status)).map(p =>
    "- " + phaseLabel(p.id) + ": " + (p.status === "error" ? "falló" : p.status === "cancelled" ? "cancelada" : "no disponible") +
    (p.status === "unavailable" && p.unavailableReason ? ": " + clean(p.unavailableReason,130) : "")).slice(0,7);
}
function ratingDistribution(sample) {
  const h = sample && sample.ratingDistribution;
  if (!h || typeof h !== "object") return [];
  const low = [1,2,3,4,5,6].reduce((s,n) => s + (count(h[String(n)]) || 0),0);
  const high78 = (count(h["7"]) || 0) + (count(h["8"]) || 0);
  const nine = count(h["9"]) || 0, ten = count(h["10"]) || 0;
  return ["- Distribución de notas: 1–6 = " + low + "; 7–8 = " + high78 + "; 9–10 = " + (nine+ten) + " (9: " + nine + "; 10: " + ten + ")."];
}
function supportLine(coverage,model) {
  const d = coverage && coverage.supportDistribution;
  if (!d) return "";
  const total = Object.values(d).reduce((s,v) => s + (count(v) || 0),0);
  if (!total) return "";
  const once = count(d.once) || 0;
  return "- Soporte: " + total + " señales contabilizadas; " + once + " aparecen una sola vez (" +
    fmt(100*once/total,1) + "%); " + (total-once) + " tienen soporte repetido. Características aprendidas: " +
    countText(model && model.learnedFeatureCount) + ".";
}
function normalizationLines(evaluation) {
  const methods = Array.isArray(evaluation && evaluation.methods) ? evaluation.methods : [];
  return methods.filter(m => m && m.available).map(m => {
    const s = m.maeFoldStability || {};
    const stability = s.available ? "; pliegues MAE: " + countText(s.variantWins) + " gana la variante/" +
      countText(s.ties) + " empates/" + countText(s.meanWins) + " gana media" : "";
    return "- " + clean(m.method,35) + ": MAE " + fmt(m.mae,4) + "; " + improvement(m.deltaMaeVsMean,4) +
      " frente a media" + stability + (m.method === "matched-only" ? " (control exploratorio; no activar en producción)" : "") + ".";
  });
}
function familyLines(comparison) {
  const families = Array.isArray(comparison && comparison.families) ? comparison.families : [];
  return families.filter(f => f && f.available).slice(0,4).map(f => {
    const rankings = threshold => f.rankingByThreshold && f.rankingByThreshold[String(threshold)];
    const score = (rows,mode) => {
      const item = Array.isArray(rows) ? rows.find(r => r && r.mode === mode && r.available) : null;
      return item && number(item.ndcgAt5) != null ? fmt(item.ndcgAt5,3) + " (" + improvement(item.deltaNdcgVsGenres,3) + ")" : "n/d";
    };
    return "- " + clean(f.label || f.id,55) + ": MAE " + fmt(f.mae,4) + "; mejora MAE vs solo géneros " +
      improvement(f.deltaMaeVsGenres,4) + "; nDCG@5 ≥7 E/A/V=" + ["balanced","affinity","variety"].map(m=>score(rankings(7),m)).join("/") +
      "; ≥9=" + ["balanced","affinity","variety"].map(m=>score(rankings(9),m)).join("/") + ".";
  });
}
function alphaLine(repeated, fallbackGrid) {
  const sourceGrid = Array.isArray(repeated && repeated.alphaGrid) ? repeated.alphaGrid : fallbackGrid;
  const grid = Array.isArray(sourceGrid) ? sourceGrid.filter(v=>number(v)!=null && v>0).sort((a,b)=>a-b) : [];
  const counts = repeated && repeated.selectedAlphaCounts || {};
  const folds = count(repeated && repeated.foldsEvaluated) || 0;
  if (!grid.length || !folds) return "";
  const lowKey = String(grid[0]), lowCount = count(counts[lowKey]) || 0;
  if (lowCount >= Math.ceil(folds*.8)) return "- Alpha por MAE: el menor valor disponible (" + lowKey + ") se eligió en " +
    lowCount + "/" + folds + " pliegues; ampliar la rejilla por debajo y comprobar estabilidad, sin asumir que menor es automáticamente mejor.";
  return summarizeCounts(counts) ? "- Alpha elegidos por MAE (conteo de pliegues): " + summarizeCounts(counts) + "." : "";
}
function supportSummary(support) {
  const nested = support && support.nestedSelection;
  if (!nested || !nested.available) return "";
  return "- Regularización por soporte, selección interna anidada: MAE " + fmt(nested.mae,4) +
    "; mejora frente a no atenuar " + improvement(nested.deltaMaeVsNoShrinkage,4) +
    "; lambda seleccionado: " + (summarizeCounts(nested.selectedLambdaCounts) || "sin conteos") + ".";
}
function candidateLines(evaluation) {
  const candidates = Array.isArray(evaluation && evaluation.candidateAvailability) ? evaluation.candidateAvailability : [];
  return candidates.slice(0,3).filter(Boolean).map(item =>
    "- " + modeLabel(item.mode) + ": pool elegible " + countText(item.eligibleCandidatePool) +
    "; resultados " + countText(item.returnedResultCount) + "/" + countText(item.requestedResultLimit) +
    (item.shortfallReason ? "; motivo " + clean(item.shortfallReason,50) : "") + ".");
}
function nextActions(report) {
  const actions = [], evaluation = report.evaluation || {}, ridge = evaluation.ridgeExperiment || {};
  const repeated = ridge.repeatedValidation && ridge.repeatedValidation.available ? ridge.repeatedValidation : null;
  const modes = repeated && repeated.rankingQuality && repeated.rankingQuality.available
    ? repeated.rankingQuality.modes : ((ridge.rankingQuality && ridge.rankingQuality.modes) || []);
  const balanced = modes.find(m=>m && m.mode==="balanced" && m.available);
  const affinity = modes.find(m=>m && m.mode==="affinity" && m.available);
  const improvedMae = number(repeated && repeated.deltaBaselineMinusRidge) > 0;
  if (improvedMae && ((balanced && number(balanced.deltaRidgeMinusBaseline)<0) || (affinity && number(affinity.deltaRidgeMinusBaseline)<0))) {
    actions.push("Mantener el modelo aditivo en producción: Ridge mejora MAE, pero empeora el orden en al menos un modo principal.");
  }
  const alpha = alphaLine(repeated || ridge, ridge.alphaGrid);
  if (alpha.includes("menor valor disponible")) actions.push("Ampliar la búsqueda de alpha por debajo del límite inferior y seleccionar parámetros solo con validación interna.");
  const candidates = Array.isArray(evaluation.candidateAvailability) ? evaluation.candidateAvailability : [];
  if (candidates.some(c => c && count(c.requestedResultLimit)>count(c.returnedResultCount) &&
    count(c.eligibleCandidatePool)>=count(c.requestedResultLimit) &&
    !["eligible-pool-too-small","empty-personal-profile"].includes(c.shortfallReason))) {
    actions.push("Investigar las listas cortas aunque el pool elegible sea suficiente; preservar identidad, exclusiones y diversidad.");
  }
  const support = report.diagnostic && report.diagnostic.featureFamilyComparison && report.diagnostic.featureFamilyComparison.supportRegularization;
  if (support && support.available && !(support.nestedSelection && support.nestedSelection.available)) {
    actions.push("Completar la selección anidada de regularización por soporte con las mismas particiones y sin cambiar el modelo activo.");
  }
  if (!actions.length) actions.push("Escoger una única mejora SDD respaldada por estas métricas, añadir pruebas sintéticas y conservar el comportamiento activo hasta demostrar una mejora repetida en ranking.");
  return actions.slice(0,4).map(action=>"- "+action);
}

/**
 * Compact developer handoff built only from aggregate diagnostic fields.
 * It deliberately ignores feature labels/details and individual movie data.
 */
export function buildRecommendationDeveloperBrief(report) {
  const source = report && typeof report === "object" ? report : {};
  const sample = source.sample || {}, model = source.model || {}, evaluation = source.evaluation || {};
  const diagnostic = source.diagnostic || {}, run = diagnostic.run || {}, coverage = diagnostic.coverage || {};
  const families = diagnostic.featureFamilyComparison || {};
  const lines = [
    "# PRISMA — contexto técnico para continuar el desarrollo", "",
    "Usa este resumen como punto de partida; consulta el JSON completo solo si una cifra requiere inspección detallada.",
    "- Repositorio: https://github.com/ElFast-dev/Prisma",
    "- Diagnóstico: " + clean(source.schema || "esquema no disponible",70) + "; aplicación: " + clean(source.applicationVersion || "versión no disponible",90) + ".",
    "- Generado (UTC): " + clean(source.generatedAt || "fecha no disponible",40) + ".",
    "", "## Objetivo y reglas que no deben romperse",
    "- Prisma es un recomendador personal; mantener la arquitectura modular ES modules y el flujo SDD/OpenSpec.",
    "- Aprender de notas personales y metadatos cinematográficos verificables; no usar emociones, sentimientos ni comentarios libres como señales.",
    "- Con perfil vacío, «Recomendadas para ti» debe estar vacío; «Descubrir» puede buscar en TMDB sin añadir películas a la colección.",
    "- Excluir vistas, valoradas, pendientes y ocultas; deduplicar por ID TMDB y usar título normalizado + año como fallback conservador.",
    "- No inventar metadatos. Este resumen no incluye títulos, IDs, fechas personales ni nombres individuales de características.",
    "", "## Estado y muestra"
  ];
  const completed = count(run.completedPhases), total = count(run.totalPhases), duration = number(run.durationMs);
  lines.push("- Batería: " + clean(run.status || diagnostic.status || "estado no disponible",40) +
    "; fases " + (completed == null ? "?" : completed) + "/" + (total == null ? 7 : total) +
    "; duración " + (duration == null ? "n/d" : fmt(duration/1000,1)+" s") +
    "; muestra coordinada " + countText(run.sampleCount) + ".");
  lines.push("- Historial: " + countText(sample.validRatingCount) + " valoraciones válidas; " + countText(sample.ratingsWithFeatures) +
    " con características; cobertura de metadatos " + (number(sample.metadataCoverage)==null ? "n/d" : fmt(sample.metadataCoverage*100,1)+"%") +
    "; catálogo local " + countText(sample.catalogEntries) + ".");
  const collections = sample.collectionCounts || {};
  lines.push("- Colecciones: vistas " + countText(collections.watched) + "; pendientes " + countText(collections.pending) +
    "; ocultas " + countText(collections.hidden) + ".");
  lines.push.apply(lines, ratingDistribution(sample));
  if (number(model.baselineAverageRating)!=null) lines.push("- Media de notas " + fmt(model.baselineAverageRating,3) +
    "; modelo activo " + clean(model.kind || "no identificado",60) + "; modo " + modeLabel(model.activeRankingMode || "balanced") + ".");
  if (number(model.learnedFeatureCount)!=null) lines.push("- Características aprendidas: " + countText(model.learnedFeatureCount) + ".");
  const support = supportLine(coverage,model);
  if (support) lines.push(support);
  const issues = phaseIssues(run);
  if (issues.length) lines.push("- Fases a revisar:\n" + issues.join("\n"));
  else if (run.status && run.status!=="completed") lines.push("- Revisar fases y causas antes de tratar el diagnóstico como evidencia completa.");

  lines.push("", "## Hallazgos experimentales — no cambian producción por sí solos");
  const prediction = evaluation.ratingPrediction || {};
  if (prediction.available) {
    lines.push("- Predicción de notas: MAE " + fmt(prediction.mae,4) + " frente a referencia " + fmt(prediction.baselineMae,4) +
      "; mejora relativa informada " + (number(prediction.relativeImprovementPct)==null ? "n/d" : fmt(prediction.relativeImprovementPct,2)+"%") + ".");
    if (number(prediction.withDecadeMae)!=null && number(prediction.withoutDecadeMae)!=null) lines.push(
      "  Década: con " + fmt(prediction.withDecadeMae,4) + "; sin " + fmt(prediction.withoutDecadeMae,4) + "; interpretar diferencias pequeñas como no concluyentes.");
  } else lines.push("- Predicción de notas: no disponible; " + clean(prediction.unavailableReason || "muestra insuficiente",130) + ".");

  const ridge = evaluation.ridgeExperiment || {};
  const repeated = ridge.repeatedValidation && ridge.repeatedValidation.available ? ridge.repeatedValidation : null;
  if (ridge.available) {
    lines.push("- Ridge (" + (repeated ? countText(repeated.foldsEvaluated)+" pliegues repetidos" : countText(ridge.foldsEvaluated)+" pliegues") +
      "): MAE " + fmt(repeated ? repeated.mae : ridge.mae,4) + " vs referencia del mismo pliegue " +
      fmt(repeated ? repeated.baselineMaeSameFolds : ridge.baselineMaeSameFolds,4) + "; mejora MAE " +
      improvement(repeated ? repeated.deltaBaselineMinusRidge : ridge.deltaBaselineMinusRidge,4) + ".");
    const stable = repeated ? repeated.foldStability : ridge.foldStability;
    if (stable && stable.available) lines.push("  Estabilidad MAE: " + countText(stable.ridgeMaeWins) + " victorias/" +
      countText(stable.ties) + " empates/" + countText(stable.baselineMaeWins) + " derrotas ante la referencia.");
  } else lines.push("- Ridge: " + clean(ridge.unavailableReason || "no ejecutado/no disponible",150) + ".");

  const ridgeRanking = repeated && repeated.rankingQuality ? repeated.rankingQuality : (ridge.rankingQuality || {});
  if (ridgeRanking.available) {
    lines.push("- Ranking Ridge comparado con el modelo activo; nDCG@5, relevancia ≥" + countText(ridgeRanking.relevantRatingThreshold) +
      ", " + countText(ridgeRanking.sampleCount) + " registros y " + countText(ridgeRanking.foldsEvaluated) + " pliegues:");
    lines.push.apply(lines, modeLines(ridgeRanking.modes,"ridgeNdcgAt5","deltaRidgeMinusBaseline","foldsRidgeWins","foldsRidgeTies","foldsRidgeLosses"));
    const hybrids = (ridgeRanking.modes || []).filter(m=>m && m.available && number(m.hybridNdcgAt5)!=null);
    if (hybrids.length) {
      lines.push("- Mezcla híbrida fija (solo diagnóstica), nDCG@5:");
      lines.push.apply(lines, modeLines(hybrids,"hybridNdcgAt5","deltaHybridMinusBaseline","foldsHybridWins","foldsHybridTies","foldsHybridLosses"));
    }
  }
  const alphaComparison = ridge.alphaSelectionComparison || null;
  if (alphaComparison && alphaComparison.available) {
    lines.push("- Selección interna de alpha: por MAE [" + (summarizeCounts(alphaComparison.selectedAlphaCountsByMae) || "sin conteos") +
      "]; por ranking [" + (summarizeCounts(alphaComparison.selectedAlphaCountsByRanking) || "sin conteos") + "].");
    if (alphaComparison.maeSelected && alphaComparison.rankingSelected) lines.push("  MAE final con criterio MAE " +
      fmt(alphaComparison.maeSelected.mae,4) + "; con criterio ranking " + fmt(alphaComparison.rankingSelected.mae,4) + ".");
    lines.push.apply(lines, makeModeComparison(alphaComparison.rankingModes,"maeSelectedNdcgAt5","rankingSelectedNdcgAt5","deltaRankingSelectionMinusMaeSelection"));
  } else {
    const alpha = alphaLine(repeated || ridge);
    if (alpha) lines.push(alpha);
  }

  const temporal = evaluation.temporalRidgeExperiment || {};
  if (temporal.available) {
    lines.push("- Temporal: " + countText(temporal.sampleCount) + " registros; fechas explícitas " + countText(temporal.explicitDateCount) +
      "; sin verificar " + countText(temporal.unverifiedDateCount) + "; " + countText(temporal.windowsEvaluated) +
      " ventanas. MAE " + fmt(temporal.mae,4) + " vs referencia " + fmt(temporal.baselineMaeSameWindows,4) +
      "; mejora " + improvement(temporal.deltaBaselineMinusRidge,4) + ".");
    lines.push(temporal.dateProvenanceStatus==="explicit" && temporal.dateSourceMode==="watchedAt-only"
      ? "  Límite: las ventanas reutilizan el historial; el resultado es descriptivo, no concluyente."
      : "  Límite: la procedencia de las fechas no es totalmente explícita o usa proxy; resultado exploratorio.");
    if (temporal.rankingQuality && temporal.rankingQuality.available) {
      lines.push("- nDCG@5 temporal Ridge frente a referencia:");
      lines.push.apply(lines, modeLines(temporal.rankingQuality.modes,"ridgeNdcgAt5","deltaRidgeMinusBaseline","foldsRidgeWins","foldsRidgeTies","foldsRidgeLosses"));
    }
  } else lines.push("- Temporal: " + clean(temporal.unavailableReason || "no disponible/no ejecutada",150) + ".");

  const normalization = evaluation.influenceNormalizationExperiment || {};
  if (normalization.available) {
    const mean = (normalization.methods || []).find(m=>m && m.method==="mean");
    lines.push("- Normalización de influencia: " + countText(normalization.foldsEvaluated) + " pliegues; MAE base-media " + fmt(mean && mean.mae,4) + ".");
    lines.push.apply(lines, normalizationLines(normalization));
  } else lines.push("- Normalización de influencia: " + clean(normalization.unavailableReason || "no disponible/no ejecutada",150) + ".");

  lines.push("", "## Familias de características y regularización");
  if (families.available) {
    lines.push("- Familias de características:  + countText(families.sampleCount) + " registros; " + countText(families.repeats) +
      " repeticiones/" + countText(families.foldsEvaluated) + " pliegues; particiones compartidas=" +
      Boolean(families.sharedPartition) + "; revisión de fuga de entrenamiento=" + Boolean(families.trainingLeakageChecked) + ".");
    lines.push.apply(lines, familyLines(families));
    const supportResult = supportSummary(families.supportRegularization);
    if (supportResult) lines.push(supportResult);
  } else lines.push("- Familias de características: " + clean(families.unavailableReason || "sin resultados",150) + ".");

  const pools = candidateLines(evaluation);
  if (pools.length) {
    lines.push("", "## Candidatas y listas cortas");
    lines.push.apply(lines,pools);
    lines.push("- candidatesAvailable es una métrica heredada de candidatas remotas TMDB, no del catálogo local. Separar pool local, candidatas elegibles y resultados finales.");
  }

  lines.push("", "## Interpretación y próximos pasos", 
    "- MAE estima precisión de notas conocidas; nDCG@5 evalúa el orden de candidatas retenidas. No son intercambiables ni garantizan gusto futuro.",
    "- Las repeticiones y ventanas reutilizan el historial: no son muestras independientes ni prueba estadística. Las notas ≥7 reflejan afinidad amplia; ≥9 es análisis secundario y dos notas 10 no permiten medir por sí solas la capacidad de encontrar películas excepcionales.",
    "- No cambiar pesos ni modelo activo solo porque baje MAE; exigir mejora emparejada y repetida en ranking, pruebas de regresión y aceptación SDD.",
    "- El resumen se construye localmente, no incluye títulos/IDs/fechas personales/comentarios/nombres de señales y no se transmite automáticamente.",
    "- Siguiente tarea recomendada:");
  lines.push.apply(lines,nextActions(source));
  lines.push("- Mantener los cambios modulares, actualizar OpenSpec/SDD, añadir pruebas sintéticas y ejecutar los gates de calidad antes de publicar.");

  let output = lines.join("\n").replace(/\n{3,}/g,"\n\n").trim();
  if (output.length > MAX_BRIEF_CHARS) {
    const start = output.indexOf("\n## Familias de características y regularización");
    if (start >= 0) {
      const candidateStart = output.indexOf("\n## Candidatas y listas cortas", start);
      output = candidateStart >= 0 ? output.slice(0,start) + output.slice(candidateStart) : output.slice(0,start);
    }
  }
  return output.length > MAX_BRIEF_CHARS ? output.slice(0,MAX_BRIEF_CHARS-30) + "\n\n[Resumen abreviado por límite de longitud.]" : output;
}
