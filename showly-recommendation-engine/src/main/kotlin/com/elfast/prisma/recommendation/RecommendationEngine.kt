package com.elfast.prisma.recommendation

import kotlin.math.exp
import kotlin.math.ln
import kotlin.math.ln1p
import kotlin.math.max
import kotlin.math.sqrt

/**
 * Deterministic, on-device hybrid recommender.
 *
 * Existing Trakt ratings build a weighted taste profile. Similarity to highly and poorly
 * rated titles, vote-smoothed community quality, popularity and novelty provide
 * complementary signals. No network calls or remote model are made by this class.
 */
class RecommendationEngine {

  fun recommend(request: RecommendationRequest): List<RecommendedMovie> {
    if (request.limit == 0 || request.candidates.isEmpty()) return emptyList()

    val samples = buildTrainingSamples(request)
    val learnedIds = samples.mapTo(HashSet()) { it.movie.id }
    val maturity = sqrt(samples.size.toDouble() / (samples.size + 15.0)).coerceIn(0.0, 1.0)
    val preferences = buildFeatureProfile(samples, request)
    val frequency = samples.flatMap { it.movie.features.map(MovieFeature::key) }.groupingBy { it }.eachCount()
    val maxPopularity = request.candidates.maxOfOrNull { it.popularity } ?: 0.0

    val ranked = request.candidates.asSequence()
      .filter { it.id !in request.excludedMovieIds && it.id !in learnedIds }
      .distinctBy { it.id }
      .map { movie ->
        scoreCandidate(movie, samples, preferences, frequency, maxPopularity, maturity, request)
      }
      .toList()

    return diversify(ranked, request.diversity, request.limit)
  }

  private fun buildTrainingSamples(request: RecommendationRequest): List<TrainingSample> {
    val latestRatings = request.ratings
      .filter { it.rating in 1..10 }
      .groupBy { it.movie.id }
      .mapValues { (_, values) -> values.maxBy { it.ratedAtEpochMillis } }
      .values
      .toList()

    val ratingMean = latestRatings.map { it.rating.toDouble() }.average().takeIf { it.isFinite() } ?: 6.0
    val ratingSamples = latestRatings.map { entry ->
      val absolute = ((entry.rating - 5.5) / 4.5).coerceIn(-1.0, 1.0)
      val relative = ((entry.rating - ratingMean) / 4.5).coerceIn(-1.0, 1.0)
      TrainingSample(entry.movie, (0.72 * absolute + 0.28 * relative).coerceIn(-1.0, 1.0), entry.ratedAtEpochMillis)
    }
    return ratingSamples
  }

  private fun buildFeatureProfile(
    samples: List<TrainingSample>,
    request: RecommendationRequest,
  ): Map<String, FeaturePreference> {
    val numerator = HashMap<String, Double>()
    val denominator = HashMap<String, Double>()

    samples.forEach { sample ->
      val recency = timeWeight(sample.timestamp, request.nowEpochMillis, request.ratingHalfLifeDays)
      sample.movie.features.distinctBy { it.key }.forEach { feature ->
        val weight = recency * feature.type.importance
        numerator[feature.key] = (numerator[feature.key] ?: 0.0) + sample.signal * weight
        denominator[feature.key] = (denominator[feature.key] ?: 0.0) + weight
      }
    }

    return numerator.mapValues { (key, total) ->
      val evidence = denominator[key] ?: 0.0
      FeaturePreference((total / (evidence + request.featurePriorStrength)).coerceIn(-1.0, 1.0), evidence)
    }
  }

  private fun scoreCandidate(
    movie: MovieProfile,
    samples: List<TrainingSample>,
    preferences: Map<String, FeaturePreference>,
    frequency: Map<String, Int>,
    maxPopularity: Double,
    maturity: Double,
    request: RecommendationRequest,
  ): RecommendedMovie {
    val features = movie.features.distinctBy { it.key }
    val featureWeight = features.sumOf { it.type.importance }
    val affinity = if (featureWeight == 0.0) 0.0 else {
      features.sumOf { (preferences[it.key]?.preference ?: 0.0) * it.type.importance } / featureWeight
    }.coerceIn(-1.0, 1.0)
    val taste = ((affinity + 1.0) / 2.0).coerceIn(0.0, 1.0)
    val similarity = historySimilarity(movie, samples, request)
    val quality = smoothedQuality(movie)
    val popularity = if (maxPopularity <= 0.0) 0.5 else {
      (ln1p(movie.popularity) / ln1p(maxPopularity)).coerceIn(0.0, 1.0)
    }
    val novelty = novelty(movie, frequency, samples.isNotEmpty())

    // Coefficients sum to 1 for every maturity level.
    val weights = Weights(
      taste = 0.35 + 0.25 * maturity,
      similarity = 0.10 + 0.05 * maturity,
      quality = 0.35 - 0.20 * maturity,
      popularity = 0.12 - 0.07 * maturity,
      novelty = 0.08 - 0.03 * maturity,
    )
    val score = (
      taste * weights.taste +
        similarity * weights.similarity +
        quality * weights.quality +
        popularity * weights.popularity +
        novelty * weights.novelty
      ).coerceIn(0.0, 1.0)

    val similarTitle = samples.asSequence()
      .filter { it.signal > 0.15 }
      .map { it to weightedJaccard(movie.features, it.movie.features) }
      .filter { it.second > 0.08 }
      .maxByOrNull { it.second * it.first.signal }
      ?.first?.movie?.title

    val liked = features.mapNotNull { feature ->
      val preference = preferences[feature.key]?.preference ?: return@mapNotNull null
      if (preference >= 0.18) feature.value to preference * feature.type.importance else null
    }.sortedByDescending { it.second }.take(3).map { it.first }

    val avoided = features.mapNotNull { feature ->
      val preference = preferences[feature.key]?.preference ?: return@mapNotNull null
      if (preference <= -0.18) feature.value to -preference * feature.type.importance else null
    }.sortedByDescending { it.second }.take(3).map { it.first }

    val support = if (features.isEmpty() || preferences.isEmpty() || featureWeight == 0.0) 0.0 else {
      features.sumOf { feature ->
        val evidence = preferences[feature.key]?.evidence ?: 0.0
        evidence / (evidence + 2.0) * feature.type.importance
      } / featureWeight
    }.coerceIn(0.0, 1.0)
    val confidence = (0.12 + 0.78 * maturity * support).coerceIn(0.0, 0.90)

    return RecommendedMovie(
      movie = movie,
      score = score,
      confidence = confidence,
      breakdown = RecommendationScoreBreakdown(taste, similarity, quality, popularity, novelty, 0.0),
      explanation = RecommendationExplanation(liked, avoided, similarTitle),
    )
  }

  private fun historySimilarity(
    candidate: MovieProfile,
    samples: List<TrainingSample>,
    request: RecommendationRequest,
  ): Double {
    if (samples.isEmpty()) return 0.5
    var weightedSignal = 0.0
    var mass = 0.0
    samples.forEach { sample ->
      val similarity = weightedJaccard(candidate.features, sample.movie.features)
      if (similarity <= 0.0) return@forEach
      val weight = similarity * timeWeight(sample.timestamp, request.nowEpochMillis, request.ratingHalfLifeDays)
      weightedSignal += sample.signal * weight
      mass += weight
    }
    val affinity = weightedSignal / (mass + 0.75)
    return ((affinity.coerceIn(-1.0, 1.0) + 1.0) / 2.0).coerceIn(0.0, 1.0)
  }

  private fun smoothedQuality(movie: MovieProfile): Double {
    val rating = movie.communityRating ?: return 0.5
    val reliability = movie.communityVotes.toDouble() / (movie.communityVotes + 100.0)
    return (0.5 * (1.0 - reliability) + rating / 10.0 * reliability).coerceIn(0.0, 1.0)
  }

  private fun novelty(movie: MovieProfile, frequency: Map<String, Int>, hasHistory: Boolean): Double {
    if (!hasHistory || movie.features.isEmpty()) return 0.5
    val totalWeight = movie.features.sumOf { it.type.importance }
    if (totalWeight <= 0.0) return 0.5
    return (movie.features.sumOf { (1.0 / (1.0 + (frequency[it.key] ?: 0))) * it.type.importance } /
      totalWeight).coerceIn(0.0, 1.0)
  }

  private fun diversify(
    ranked: List<RecommendedMovie>,
    diversity: Double,
    limit: Int,
  ): List<RecommendedMovie> {
    if (ranked.size <= 1 || diversity <= 0.0) {
      return ranked.sortedWith(compareByDescending<RecommendedMovie> { it.score }.thenBy { it.movie.id }).take(limit)
    }

    val remaining = ranked.toMutableList()
    val selected = mutableListOf<RecommendedMovie>()
    while (remaining.isNotEmpty() && selected.size < limit) {
      val next = remaining.maxWithOrNull(
        compareBy<RecommendedMovie> { candidate ->
          val maxSimilarity = selected.maxOfOrNull {
            weightedJaccard(candidate.movie.features, it.movie.features)
          } ?: 0.0
          candidate.score - 0.25 * diversity * maxSimilarity
        }.thenBy { -it.movie.id },
      ) ?: break

      val maxSimilarity = selected.maxOfOrNull {
        weightedJaccard(next.movie.features, it.movie.features)
      } ?: 0.0
      val penalty = 0.25 * diversity * maxSimilarity
      selected += next.copy(
        score = (next.score - penalty).coerceIn(0.0, 1.0),
        breakdown = next.breakdown.copy(diversityPenalty = penalty),
      )
      remaining.remove(next)
    }
    return selected
  }

  private fun timeWeight(timestamp: Long, now: Long, halfLifeDays: Double): Double {
    val ageDays = max(0L, now - timestamp).toDouble() / MILLIS_PER_DAY
    return exp(-LN_2 * ageDays / halfLifeDays).coerceIn(0.0, 1.0)
  }

  private fun weightedJaccard(left: Set<MovieFeature>, right: Set<MovieFeature>): Double {
    if (left.isEmpty() || right.isEmpty()) return 0.0
    val leftByKey = left.associateBy { it.key }
    val rightByKey = right.associateBy { it.key }
    val union = leftByKey.keys + rightByKey.keys
    val intersection = leftByKey.keys.intersect(rightByKey.keys)
    val unionWeight = union.sumOf { key -> (leftByKey[key] ?: rightByKey.getValue(key)).type.importance }
    if (unionWeight <= 0.0) return 0.0
    return (intersection.sumOf { leftByKey.getValue(it).type.importance } / unionWeight).coerceIn(0.0, 1.0)
  }

  private data class Weights(
    val taste: Double,
    val similarity: Double,
    val quality: Double,
    val popularity: Double,
    val novelty: Double,
  )

  private companion object {
    const val MILLIS_PER_DAY = 86_400_000.0
    const val LN_2 = 0.6931471805599453
  }
}
