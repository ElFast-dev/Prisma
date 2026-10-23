const FAMILIES = Object.freeze([
  { id: "genres-only", label: "Solo géneros", accepts: function (feature) { return feature.indexOf("género: ") === 0; } },
  { id: "genres-tags", label: "Géneros + etiquetas", accepts: function (feature) { return feature.indexOf("género: ") === 0 || feature.indexOf("tema: ") === 0; } },
  { id: "genres-tags-synopsis", label: "Géneros + etiquetas + sinopsis", accepts: function (feature) {
    return feature.indexOf("género: ") === 0 || feature.indexOf("tema: ") === 0 || feature.indexOf("trama: ") === 0;
  } },
  { id: "full-current", label: "Conjunto completo actual", accepts: function () { return true; } }
]);
const FOLDS = 5;
const CUTOFF = 5;
const RELEVANT_THRESHOLD = 7;
const EPSILON = 1e-10;

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function identityFor(entry, movie, dependencies) {
  const getId = dependencies.movieTmdbId;
  const id = typeof getId === "function" ? (getId(entry) || getId(movie)) : null;
  if (id != null && String(id).trim()) return "tmdb:" + String(id).trim();
  const key = typeof dependencies.titleKey === "function"
    ? dependencies.titleKey(entry && entry.title || movie && movie.title)
    : String(entry && entry.title || movie && movie.title || "").trim().toLocaleLowerCase();
  const year = entry && (entry.year || entry.releaseYear || entry.release_year) ||
    movie && (movie.year || movie.releaseYear || movie.release_year) || "";
  return key ? "title:" + key + ":" + String(year) : "";
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mean(values) {
  return values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : null;
}

function safeCandidate(movie, entry, identity, prediction) {
  const source = movie || entry || {};
  const candidate = Object.assign({}, source, {
    title: source.title || entry && entry.title || "",
    genres: Array.isArray(source.genres) && source.genres.length ? source.genres.slice() : (entry && Array.isArray(entry.genres) ? entry.genres.slice() : []),
    tags: Array.isArray(source.tags) && source.tags.length ? source.tags.slice() : (entry && Array.isArray(entry.tags) ? entry.tags.slice() : []),
    evaluationIdentity: identity,
    prediction: { score: prediction }
  });
  [
    "rating", "userRating", "personalRating", "personal_rating", "evaluationGain",
    "note", "notes", "comment", "comments", "emotions", "emotion", "watchedAt",
    "watchedAtSource", "watched_at", "tmdb_id", "tmdbId", "tmId", "id"
  ].forEach(function (key) { delete candidate[key]; });
  return candidate;
}

function dcgAt5(rows) {
  return rows.slice(0, CUTOFF).reduce(function (sum, row, index) {
    return sum + row.gain / Math.log2(index + 2);
  }, 0);
}

function emptyResult(reason, sampleCount) {
  return {
    executionStatus: "unavailable",
    available: false,
    sampleCount: Math.max(0, Number(sampleCount) || 0),
    foldsPlanned: FOLDS,
    foldsEvaluated: 0,
    sharedPartition: true,
    families: FAMILIES.map(function (family) {
      return {
        id: family.id,
        label: family.label,
        available: false,
        mae: null,
        baselineMae: null,
        deltaMaeVsGenres: null,
        foldsEvaluated: 0,
        maeWins: 0,
        ties: 0,
        maeLosses: 0,
        rankingModes: ["balanced", "affinity", "variety"].map(function (mode) {
          return { mode: mode, available: false, ndcgAt5: null, deltaNdcgVsGenres: null, foldsEvaluated: 0, wins: 0, ties: 0, losses: 0 };
        })
      };
    }),
    unavailableReason: reason
  };
}

export function createFeatureFamilyEvaluation(dependencies) {
  const deps = dependencies || {};
  const getRatings = deps.getRatings || function () { return []; };
  const findMovie = deps.findMovie || function () { return null; };
  const movieFeatures = deps.movieFeatures || function () { return []; };
  const ratingValue = deps.ratingValue || function (entry) { return asNumber(entry && entry.rating); };
  const createEngine = deps.createRecommendationEngine;
  const rankCandidates = typeof deps.rankCandidates === "function"
    ? deps.rankCandidates
    : function (candidates, cutoff) { return candidates.slice().sort(function (a, b) {
      return b.prediction.score - a.prediction.score;
    }).slice(0, cutoff); };
  const hasAudit = typeof deps.onAudit === "function";
  const onAudit = hasAudit ? deps.onAudit : function () {};
  const yieldToBrowser = typeof deps.yieldToBrowser === "function"
    ? deps.yieldToBrowser
    : function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); };

  function filteredFeatureExtractor(family) {
    return function (movie, entry, options) {
      const features = movieFeatures(movie, entry, options) || [];
      return features.filter(family.accepts);
    };
  }

  async function evaluateAsync(control) {
    const settings = control || {};
    const shouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
    const onProgress = typeof settings.onProgress === "function" ? settings.onProgress : function () {};
    const sourceRatings = getRatings() || [];
    const rows = [];
    const seen = new Set();
    const totalWork = Math.max(1, sourceRatings.length * (FAMILIES.length + 1) + 1);

    for (let index = 0; index < sourceRatings.length; index += 1) {
      if (!shouldContinue()) return null;
      const entry = sourceRatings[index];
      const rating = ratingValue(entry);
      if (rating != null) {
        const movie = findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
        const features = movieFeatures(movie, entry) || [];
        if (features.some(function (feature) { return feature.indexOf("género: ") === 0; })) {
          const identity = identityFor(entry, movie, deps);
          if (identity && !seen.has(identity)) {
            seen.add(identity);
            rows.push({ entry: entry, movie: movie, identity: identity, rating: rating });
          }
        }
      }
      if ((index + 1) % 16 === 0 || index + 1 === sourceRatings.length) {
        onProgress({
          completedWork: index + 1,
          totalWork: totalWork,
          detail: "Preparando la muestra emparejada"
        });
        await yieldToBrowser();
      }
    }

    if (!rows.length) return emptyResult("No hay valoraciones válidas con identidad única y al menos un género enlazado.", 0);
    if (rows.length < FOLDS) return emptyResult("Se necesitan al menos cinco películas únicas con géneros enlazados para formar cinco pliegues.", rows.length);
    if (typeof createEngine !== "function") return emptyResult("No se ha configurado la fábrica del motor experimental.", rows.length);
    if (!shouldContinue()) return null;

    const ordered = rows.slice().sort(function (left, right) {
      return stableHash(left.identity) - stableHash(right.identity) || left.identity.localeCompare(right.identity);
    });
    const folds = Array.from({ length: FOLDS }, function () { return []; });
    ordered.forEach(function (row, index) { folds[index % FOLDS].push(row); });
    const familyResults = FAMILIES.map(function (family) {
      return { family: family, errors: [], baselineErrors: [], foldMae: [], foldNdcg: { balanced: [], affinity: [], variety: [] } };
    });
    let completedWork = sourceRatings.length;

    for (let familyIndex = 0; familyIndex < FAMILIES.length; familyIndex += 1) {
      const family = FAMILIES[familyIndex];
      const featureExtractor = filteredFeatureExtractor(family);
      const engine = createEngine({
        getRatings: function () { return sourceRatings; },
        findMovie: findMovie,
        movieFeatures: featureExtractor,
        ratingValue: ratingValue
      });
      const result = familyResults[familyIndex];
      for (let foldIndex = 0; foldIndex < folds.length; foldIndex += 1) {
        if (!shouldContinue()) return null;
        const testRows = folds[foldIndex];
        const testIdentities = new Set(testRows.map(function (row) { return row.identity; }));
        const trainRows = ordered.filter(function (row) { return !testIdentities.has(row.identity); });
        const trainEntries = trainRows.map(function (row) { return row.entry; });
        const profile = engine.buildProfile(trainEntries);
        const testCandidates = [];
        const gainByIdentity = new Map();
        const ideal = [];
        const foldErrors = [];
        const foldBaselineErrors = [];

        for (let index = 0; index < testRows.length; index += 1) {
          if (!shouldContinue()) return null;
          const row = testRows[index];
          const candidate = safeCandidate(row.movie, row.entry, row.identity, profile.average);
          const learned = engine.predictRating(candidate, profile);
          const prediction = asNumber(learned && learned.score);
          const score = prediction == null ? profile.average : prediction;
          candidate.prediction.score = score;
          const gain = row.rating >= RELEVANT_THRESHOLD ? row.rating - 6 : 0;
          gainByIdentity.set(row.identity, gain);
          ideal.push({ evaluationIdentity: row.identity, gain: gain });
          const error = Math.abs(score - row.rating);
          const baselineError = Math.abs(profile.personalAverage - row.rating);
          result.errors.push(error);
          result.baselineErrors.push(baselineError);
          foldErrors.push(error);
          foldBaselineErrors.push(baselineError);
          testCandidates.push(candidate);
          if (hasAudit) {
            onAudit({
              family: family.id,
              foldIndex: foldIndex,
              heldOutIdentity: row.identity,
              trainingIdentities: trainRows.map(function (item) { return item.identity; }),
              candidateHasPersonalRating: Object.prototype.hasOwnProperty.call(candidate, "rating"),
              trainingCount: trainRows.length
            });
          }
          completedWork += 1;
          if ((index + 1) % 8 === 0 || index + 1 === testRows.length) {
            onProgress({
              completedWork: Math.min(totalWork, completedWork),
              totalWork: totalWork,
              detail: "Familia " + (familyIndex + 1) + " de " + FAMILIES.length + "; pliegue " + (foldIndex + 1) + " de " + FOLDS
            });
            await yieldToBrowser();
          }
        }
        result.foldMae.push(mean(foldErrors));
        ideal.sort(function (left, right) {
          return right.gain - left.gain || String(left.evaluationIdentity).localeCompare(String(right.evaluationIdentity));
        });
        const idealDcg = dcgAt5(ideal);
        ["balanced", "affinity", "variety"].forEach(function (mode) {
          const ranked = (rankCandidates(testCandidates.slice(), CUTOFF, mode) || []).slice(0, CUTOFF);
          const dcgRows = ranked.map(function (candidate) {
            return { gain: gainByIdentity.get(candidate.evaluationIdentity) || 0 };
          });
          const ndcg = idealDcg > 0 ? Math.max(0, Math.min(1, dcgAt5(dcgRows) / idealDcg)) : null;
          if (ndcg != null) result.foldNdcg[mode].push(ndcg);
        });
      }
    }

    if (!shouldContinue()) return null;
    const baseline = familyResults[0];
    const baselineMae = mean(baseline.errors);
    const summaries = familyResults.map(function (row, familyIndex) {
      const mae = mean(row.errors);
      let wins = 0;
      let ties = 0;
      let losses = 0;
      row.foldMae.forEach(function (foldMae, index) {
        const reference = baseline.foldMae[index];
        const delta = reference - foldMae;
        if (delta > EPSILON) wins += 1;
        else if (delta < -EPSILON) losses += 1;
        else ties += 1;
      });
      const rankingModes = ["balanced", "affinity", "variety"].map(function (mode) {
        const values = row.foldNdcg[mode];
        const references = baseline.foldNdcg[mode];
        let modeWins = 0;
        let modeTies = 0;
        let modeLosses = 0;
        values.forEach(function (value, index) {
          if (!Number.isFinite(references[index])) return;
          const delta = value - references[index];
          if (delta > EPSILON) modeWins += 1;
          else if (delta < -EPSILON) modeLosses += 1;
          else modeTies += 1;
        });
        const score = mean(values);
        return {
          mode: mode,
          available: score != null,
          ndcgAt5: score,
          deltaNdcgVsGenres: familyIndex === 0 || score == null || mean(references) == null ? null : score - mean(references),
          foldsEvaluated: values.length,
          wins: modeWins,
          ties: modeTies,
          losses: modeLosses
        };
      });
      return {
        id: row.family.id,
        label: row.family.label,
        available: mae != null,
        mae: mae,
        baselineMae: mean(row.baselineErrors),
        deltaMaeVsGenres: familyIndex === 0 || mae == null || baselineMae == null ? null : baselineMae - mae,
        foldsEvaluated: row.foldMae.length,
        maeWins: familyIndex === 0 ? 0 : wins,
        ties: familyIndex === 0 ? 0 : ties,
        maeLosses: familyIndex === 0 ? 0 : losses,
        foldMae: row.foldMae,
        rankingModes: rankingModes
      };
    });
    onProgress({ completedWork: totalWork, totalWork: totalWork, detail: "Comparación emparejada completada" });
    return {
      executionStatus: "completed",
      available: true,
      sampleCount: rows.length,
      foldsPlanned: FOLDS,
      foldsEvaluated: FOLDS,
      foldDefinition: "cinco particiones deterministas comunes; cada película y sus variantes comparten identidad y pliegue",
      sharedPartition: true,
      trainingLeakageChecked: true,
      families: summaries,
      unavailableReason: null,
      interpretationLimits: [
        "La comparación usa solo películas con género enlazado, por lo que el resultado no representa valoraciones sin esa cobertura.",
        "Los términos de sinopsis son las señales disponibles de la sinopsis; la evaluación mide aportación emparejada, no causalidad.",
        "Una diferencia descriptiva en un único perfil no demuestra significación estadística.",
        "El motor de producción no se modifica; las familias usan fábricas de motor y extractores aislados."
      ]
    };
  }

  return { evaluateAsync: evaluateAsync, families: FAMILIES.map(function (family) { return { id: family.id, label: family.label }; }) };
}
