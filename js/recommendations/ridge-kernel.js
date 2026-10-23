const FAMILY_SCALES = Object.freeze({ genre: 1, theme: 0.35, decade: 0.2 });
export function clampRating(value) {
  return Math.max(1, Math.min(10, value));
}

function featureScale(feature) {
  if (feature.indexOf("tema: ") === 0) return FAMILY_SCALES.theme;
  if (feature.indexOf("década: ") === 0) return FAMILY_SCALES.decade;
  return FAMILY_SCALES.genre;
}

export function vectorize(features) {
  const vector = new Map();
  (features || []).forEach(function (feature) {
    const name = String(feature || "");
    if (!name) return;
    vector.set(name, featureScale(name));
  });
  return vector;
}

function dot(left, right) {
  let sum = 0;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  small.forEach(function (value, name) {
    const other = large.get(name);
    if (other != null) sum += value * other;
  });
  return sum;
}

export function buildKernel(rows) {
  const kernel = Array.from({ length: rows.length }, function () {
    return new Float64Array(rows.length);
  });
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = 0; right <= left; right += 1) {
      const value = dot(rows[left].trainingVector, rows[right].trainingVector);
      kernel[left][right] = value;
      kernel[right][left] = value;
    }
  }
  return kernel;
}

function solveCholesky(matrix, target) {
  const size = target.length;
  const lower = Array.from({ length: size }, function () { return new Float64Array(size); });
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = matrix[row][column];
      for (let previous = 0; previous < column; previous += 1) {
        value -= lower[row][previous] * lower[column][previous];
      }
      if (row === column) {
        if (!Number.isFinite(value) || value <= 1e-12) {
          throw new Error("Matriz no definida positiva");
        }
        lower[row][column] = Math.sqrt(value);
      } else {
        const diagonal = lower[column][column];
        if (!diagonal || !Number.isFinite(diagonal)) throw new Error("Factorización inestable");
        lower[row][column] = value / diagonal;
      }
    }
  }

  const intermediate = new Float64Array(size);
  for (let row = 0; row < size; row += 1) {
    let value = target[row];
    for (let column = 0; column < row; column += 1) {
      value -= lower[row][column] * intermediate[column];
    }
    intermediate[row] = value / lower[row][row];
  }

  const solution = new Float64Array(size);
  for (let row = size - 1; row >= 0; row -= 1) {
    let value = intermediate[row];
    for (let column = row + 1; column < size; column += 1) {
      value -= lower[column][row] * solution[column];
    }
    solution[row] = value / lower[row][row];
    if (!Number.isFinite(solution[row])) throw new Error("Solución no finita");
  }
  return solution;
}

export function trainRidge(rows, kernel, trainIndices, alpha) {
  if (!trainIndices.length || !Number.isFinite(alpha) || alpha <= 0) {
    throw new Error("Parámetros de entrenamiento inválidos");
  }
  const size = trainIndices.length;
  const rowMeans = new Float64Array(size);
  let grandMean = 0;
  let targetMean = 0;

  for (let i = 0; i < size; i += 1) {
    const index = trainIndices[i];
    let rowSum = 0;
    for (let j = 0; j < size; j += 1) {
      rowSum += kernel[index][trainIndices[j]];
    }
    rowMeans[i] = rowSum / size;
    grandMean += rowMeans[i];
    targetMean += rows[index].rating;
  }
  grandMean /= size;
  targetMean /= size;

  const centered = Array.from({ length: size }, function () { return new Float64Array(size); });
  const target = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    target[i] = rows[trainIndices[i]].rating - targetMean;
    for (let j = 0; j < size; j += 1) {
      centered[i][j] = kernel[trainIndices[i]][trainIndices[j]] -
        rowMeans[i] - rowMeans[j] + grandMean;
    }
    centered[i][i] += alpha;
  }
  return {
    trainIndices: trainIndices.slice(),
    rowMeans: rowMeans,
    grandMean: grandMean,
    targetMean: targetMean,
    coefficients: solveCholesky(centered, target)
  };
}

export function predictRidge(rows, model, candidateVector) {
  const size = model.trainIndices.length;
  const raw = new Float64Array(size);
  let testMean = 0;
  for (let i = 0; i < size; i += 1) {
    raw[i] = dot(candidateVector, rows[model.trainIndices[i]].trainingVector);
    testMean += raw[i];
  }
  testMean /= size;
  let adjustment = 0;
  for (let i = 0; i < size; i += 1) {
    const centeredKernel = raw[i] - testMean - model.rowMeans[i] + model.grandMean;
    adjustment += centeredKernel * model.coefficients[i];
  }
  const prediction = model.targetMean + adjustment;
  if (!Number.isFinite(prediction)) throw new Error("Predicción no finita");
  return clampRating(prediction);
}


function yieldTask(control) {
  const settings = control || {};
  if (typeof settings.shouldContinue === "function" && !settings.shouldContinue()) {
    return Promise.reject(new Error("La evaluación Ridge fue invalidada."));
  }
  if (typeof settings.yieldToBrowser === "function") return Promise.resolve(settings.yieldToBrowser());
  return new Promise(function (resolve) { setTimeout(resolve, 0); });
}

export async function buildKernelAsync(rows, control) {
  const settings = control || {};
  const kernel = Array.from({ length: rows.length }, function () {
    return new Float64Array(rows.length);
  });
  for (let left = 0; left < rows.length; left += 1) {
    if (typeof settings.shouldContinue === "function" && !settings.shouldContinue()) {
      throw new Error("La evaluación Ridge fue invalidada.");
    }
    for (let right = 0; right <= left; right += 1) {
      const value = dot(rows[left].trainingVector, rows[right].trainingVector);
      kernel[left][right] = value;
      kernel[right][left] = value;
    }
    if ((left + 1) % 8 === 0 || left + 1 === rows.length) {
      if (typeof settings.onProgress === "function") {
        settings.onProgress({ completedWork: left + 1, totalWork: Math.max(1, rows.length), stage: "kernel" });
      }
      await yieldTask(settings);
    }
  }
  return kernel;
}

export async function trainRidgeAsync(rows, kernel, trainIndices, alpha, control) {
  const settings = control || {};
  if (!trainIndices.length || !Number.isFinite(alpha) || alpha <= 0) {
    throw new Error("Parámetros de entrenamiento inválidos");
  }
  const shouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
  const batchSize = Math.max(8, Math.min(64, Number(settings.batchSize) || 48));
  const size = trainIndices.length;
  const rowMeans = new Float64Array(size);
  let grandMean = 0;
  let targetMean = 0;

  for (let i = 0; i < size; i += 1) {
    if (!shouldContinue()) throw new Error("La evaluación Ridge fue invalidada.");
    const index = trainIndices[i];
    let rowSum = 0;
    for (let j = 0; j < size; j += 1) rowSum += kernel[index][trainIndices[j]];
    rowMeans[i] = rowSum / size;
    grandMean += rowMeans[i];
    targetMean += rows[index].rating;
    if ((i + 1) % batchSize === 0 || i + 1 === size) await yieldTask(settings);
  }
  grandMean /= size;
  targetMean /= size;

  const centered = Array.from({ length: size }, function () { return new Float64Array(size); });
  const target = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    if (!shouldContinue()) throw new Error("La evaluación Ridge fue invalidada.");
    target[i] = rows[trainIndices[i]].rating - targetMean;
    const sourceRow = kernel[trainIndices[i]];
    const centerRow = centered[i];
    for (let j = 0; j < size; j += 1) {
      centerRow[j] = sourceRow[trainIndices[j]] - rowMeans[i] - rowMeans[j] + grandMean;
    }
    centerRow[i] += alpha;
    if ((i + 1) % batchSize === 0 || i + 1 === size) await yieldTask(settings);
  }

  const lower = Array.from({ length: size }, function () { return new Float64Array(size); });
  for (let row = 0; row < size; row += 1) {
    if (!shouldContinue()) throw new Error("La evaluación Ridge fue invalidada.");
    for (let column = 0; column <= row; column += 1) {
      let value = centered[row][column];
      for (let previous = 0; previous < column; previous += 1) {
        value -= lower[row][previous] * lower[column][previous];
      }
      if (row === column) {
        if (!Number.isFinite(value) || value <= 1e-12) {
          throw new Error("Matriz no definida positiva");
        }
        lower[row][column] = Math.sqrt(value);
      } else {
        const diagonal = lower[column][column];
        if (!diagonal || !Number.isFinite(diagonal)) throw new Error("Factorización inestable");
        lower[row][column] = value / diagonal;
      }
    }
    if ((row + 1) % batchSize === 0 || row + 1 === size) {
      if (typeof settings.onProgress === "function") settings.onProgress({
        completedWork: row + 1, totalWork: size, stage: "cholesky"
      });
      await yieldTask(settings);
    }
  }

  const intermediate = new Float64Array(size);
  for (let row = 0; row < size; row += 1) {
    if (!shouldContinue()) throw new Error("La evaluación Ridge fue invalidada.");
    let value = target[row];
    for (let column = 0; column < row; column += 1) value -= lower[row][column] * intermediate[column];
    intermediate[row] = value / lower[row][row];
    if ((row + 1) % batchSize === 0 || row + 1 === size) await yieldTask(settings);
  }

  const solution = new Float64Array(size);
  for (let row = size - 1; row >= 0; row -= 1) {
    if (!shouldContinue()) throw new Error("La evaluación Ridge fue invalidada.");
    let value = intermediate[row];
    for (let column = row + 1; column < size; column += 1) value -= lower[column][row] * solution[column];
    solution[row] = value / lower[row][row];
    if (!Number.isFinite(solution[row])) throw new Error("Solución no finita");
    if ((size - row) % batchSize === 0 || row === 0) await yieldTask(settings);
  }
  return {
    trainIndices: trainIndices.slice(),
    rowMeans: rowMeans,
    grandMean: grandMean,
    targetMean: targetMean,
    coefficients: solution
  };
}
