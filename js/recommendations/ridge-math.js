const FAMILY_SCALES = Object.freeze({ genre: 1, theme: 0.35, decade: 0.2 });

export function clampRating(value) {
  return Math.max(1, Math.min(10, value));
}

export function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

export function stableHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function numericYear(record) {
  const raw = record && (record.year || record.releaseYear || record.release_year);
  if (raw != null && /^\d{4}$/.test(String(raw))) return String(raw);
  const releaseDate = String(record && (record.releaseDate || record.release_date) || "");
  const match = releaseDate.match(/^(\d{4})/);
  return match ? match[1] : "";
}

export function featureScale(feature) {
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

export function dot(left, right) {
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

export function solveCholesky(matrix, target) {
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

export function foldIndices(indices, rows, foldCount, salt) {
  const ordered = indices.slice().sort(function (left, right) {
    const leftHash = stableHash(rows[left].identity + "|" + salt);
    const rightHash = stableHash(rows[right].identity + "|" + salt);
    return leftHash - rightHash || rows[left].identity.localeCompare(rows[right].identity);
  });
  const folds = Array.from({ length: foldCount }, function () { return []; });
  ordered.forEach(function (index, position) {
    folds[position % foldCount].push(index);
  });
  return folds;
}

export function meanAbsoluteError(errors) {
  if (!errors.length) throw new Error("No hay errores evaluables");
  return errors.reduce(function (sum, value) { return sum + value; }, 0) / errors.length;
}
