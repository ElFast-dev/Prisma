package com.elfast.prisma.recommendation

import java.text.Normalizer
import java.util.Locale

/** Metadata used by the recommender. Showly adapters map Movie and TMDB credits to this type. */
data class MovieProfile(
  val id: Long,
  val title: String,
  val features: Set<MovieFeature>,
  val releaseYear: Int? = null,
  val communityRating: Double? = null,
  val communityVotes: Int = 0,
  val popularity: Double = 0.0,
) {
  init {
    require(id > 0) { "Movie id must be positive" }
    require(title.isNotBlank()) { "Movie title must not be blank" }
    require(communityRating == null || communityRating in 0.0..10.0) {
      "Community rating must be between 0 and 10"
    }
    require(communityVotes >= 0) { "Community vote count must not be negative" }
    require(popularity >= 0.0 && popularity.isFinite()) {
      "Popularity must be finite and non-negative"
    }
  }
}

/** Typed features prevent a genre called "Drama" colliding with a director called "Drama". */
data class MovieFeature(
  val type: MovieFeatureType,
  val value: String,
) {
  val normalizedValue: String = normalizeFeatureValue(value)
  val key: String = "${type.name}:$normalizedValue"

  init {
    require(normalizedValue.isNotBlank()) { "Feature value must not be blank" }
  }
}

enum class MovieFeatureType(val importance: Double) {
  GENRE(1.30),
  DIRECTOR(1.20),
  KEYWORD(1.00),
  CAST(0.95),
  WRITER(0.90),
  FRANCHISE(0.85),
  STUDIO(0.65),
  LANGUAGE(0.55),
  COUNTRY(0.40),
  DECADE(0.25),
}

/** Trakt personal rating (1..10) plus the timestamp at which it was recorded. */
data class UserMovieRating(
  val movie: MovieProfile,
  val rating: Int,
  val ratedAtEpochMillis: Long,
)

enum class RecommendationFeedbackType {
  LIKE,
  DISLIKE,
  NOT_INTERESTED,
  HIDE,
}

data class RecommendationFeedback(
  val movie: MovieProfile,
  val type: RecommendationFeedbackType,
  val createdAtEpochMillis: Long,
)

data class RecommendationRequest(
  val candidates: List<MovieProfile>,
  val ratings: List<UserMovieRating>,
  val feedback: List<RecommendationFeedback> = emptyList(),
  /** Watched, hidden, already-rated and otherwise unavailable IDs must be passed here. */
  val excludedMovieIds: Set<Long> = emptySet(),
  val limit: Int = 20,
  /** 0 preserves raw score order; 1 applies strongest diversity re-ranking. */
  val diversity: Double = 0.35,
  val nowEpochMillis: Long = System.currentTimeMillis(),
  val ratingHalfLifeDays: Double = 730.0,
  val featurePriorStrength: Double = 2.0,
) {
  init {
    require(limit >= 0) { "Limit must not be negative" }
    require(diversity in 0.0..1.0) { "Diversity must be between 0 and 1" }
    require(ratingHalfLifeDays > 0.0 && ratingHalfLifeDays.isFinite()) {
      "Rating half-life must be finite and positive"
    }
    require(featurePriorStrength >= 0.0 && featurePriorStrength.isFinite()) {
      "Feature prior strength must be finite and non-negative"
    }
  }
}

data class RecommendationScoreBreakdown(
  val taste: Double,
  val similarity: Double,
  val quality: Double,
  val popularity: Double,
  val novelty: Double,
  val diversityPenalty: Double,
)

data class RecommendationExplanation(
  val likedFeatures: List<String>,
  val avoidedFeatures: List<String>,
  val similarToTitle: String?,
)

data class RecommendedMovie(
  val movie: MovieProfile,
  val score: Double,
  val confidence: Double,
  val breakdown: RecommendationScoreBreakdown,
  val explanation: RecommendationExplanation,
)

internal data class FeaturePreference(
  val preference: Double,
  val evidence: Double,
)

internal data class TrainingSample(
  val movie: MovieProfile,
  val signal: Double,
  val timestamp: Long,
)

internal fun normalizeFeatureValue(value: String): String {
  val decomposed = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
  return decomposed
    .replace(Regex("\\p{Mn}+"), "")
    .lowercase(Locale.ROOT)
    .replace(Regex("[^\\p{L}\\p{N}]+"), " ")
    .trim()
}
