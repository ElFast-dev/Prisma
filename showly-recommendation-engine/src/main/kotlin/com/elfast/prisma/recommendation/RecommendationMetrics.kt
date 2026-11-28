package com.elfast.prisma.recommendation

import kotlin.math.ln

/** Deterministic offline ranking metrics for synthetic and temporal hold-out evaluation. */
object RecommendationMetrics {

  fun precisionAtK(recommendedIds: List<Long>, relevantIds: Set<Long>, k: Int): Double {
    require(k > 0) { "k must be positive" }
    val topK = recommendedIds.distinct().take(k)
    if (topK.isEmpty()) return 0.0
    return topK.count { it in relevantIds }.toDouble() / k
  }

  fun recallAtK(recommendedIds: List<Long>, relevantIds: Set<Long>, k: Int): Double {
    require(k > 0) { "k must be positive" }
    if (relevantIds.isEmpty()) return 0.0
    return recommendedIds.distinct().take(k).count { it in relevantIds }.toDouble() / relevantIds.size
  }

  fun hitRateAtK(recommendedIds: List<Long>, relevantIds: Set<Long>, k: Int): Double {
    require(k > 0) { "k must be positive" }
    return if (recommendedIds.distinct().take(k).any { it in relevantIds }) 1.0 else 0.0
  }

  /** NDCG@k for graded relevance labels, conventionally Trakt ratings from 0 to 10. */
  fun ndcgAtK(recommendedIds: List<Long>, relevance: Map<Long, Int>, k: Int): Double {
    require(k > 0) { "k must be positive" }
    fun gain(value: Int) = Math.pow(2.0, value.coerceAtLeast(0).toDouble()) - 1.0
    val actual = recommendedIds.distinct().take(k).mapIndexed { index, id ->
      gain(relevance[id] ?: 0) / (ln(index + 2.0) / LN_2)
    }.sum()
    val ideal = relevance.values.sortedDescending().take(k).mapIndexed { index, value ->
      gain(value) / (ln(index + 2.0) / LN_2)
    }.sum()
    return if (ideal == 0.0) 0.0 else (actual / ideal).coerceIn(0.0, 1.0)
  }

  fun catalogCoverage(recommendedIds: List<Long>, catalogSize: Int): Double {
    require(catalogSize >= 0) { "Catalog size must not be negative" }
    if (catalogSize == 0) return 0.0
    return (recommendedIds.distinct().size.toDouble() / catalogSize).coerceIn(0.0, 1.0)
  }

  /** Mean pairwise distance (1 - weighted Jaccard); higher means a more varied list. */
  fun intraListDiversity(movies: List<MovieProfile>): Double {
    if (movies.size < 2) return 0.0
    var totalSimilarity = 0.0
    var pairs = 0
    for (leftIndex in 0 until movies.lastIndex) {
      for (rightIndex in leftIndex + 1 until movies.size) {
        totalSimilarity += weightedJaccard(movies[leftIndex].features, movies[rightIndex].features)
        pairs++
      }
    }
    return (1.0 - totalSimilarity / pairs).coerceIn(0.0, 1.0)
  }

  private fun weightedJaccard(left: Set<MovieFeature>, right: Set<MovieFeature>): Double {
    if (left.isEmpty() || right.isEmpty()) return 0.0
    val leftByKey = left.associateBy { it.key }
    val rightByKey = right.associateBy { it.key }
    val union = leftByKey.keys + rightByKey.keys
    val intersection = leftByKey.keys.intersect(rightByKey.keys)
    val totalWeight = union.sumOf { key -> (leftByKey[key] ?: rightByKey.getValue(key)).type.importance }
    if (totalWeight <= 0.0) return 0.0
    return intersection.sumOf { leftByKey.getValue(it).type.importance } / totalWeight
  }

  private const val LN_2 = 0.6931471805599453
}
