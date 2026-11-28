package com.elfast.prisma.recommendation.showly

import com.elfast.prisma.recommendation.MovieFeature
import com.elfast.prisma.recommendation.MovieFeatureType
import com.elfast.prisma.recommendation.MovieProfile
import com.elfast.prisma.recommendation.RecommendationEngine
import com.elfast.prisma.recommendation.RecommendationFeedback
import com.elfast.prisma.recommendation.RecommendationFeedbackType
import com.elfast.prisma.recommendation.RecommendationRequest
import com.elfast.prisma.recommendation.RecommendedMovie
import com.elfast.prisma.recommendation.UserMovieRating

/**
 * Minimal, SDK-independent snapshot of Showly's ui_model.Movie plus optional TMDB enrichment.
 *
 * Showly adapter notes:
 * - idTrakt <- Movie.traktId
 * - year/genres/language/country/rating/votes <- ui_model.Movie
 * - popularity can be supplied by the candidate source or left at zero
 * - directors/cast/writers/keywords/franchise/studio come from TMDB credits and metadata when
 *   available; no missing data is fabricated.
 */
data class ShowlyMovieMetadata(
  val idTrakt: Long,
  val title: String,
  val year: Int? = null,
  val genres: List<String> = emptyList(),
  val language: String? = null,
  val country: String? = null,
  val communityRating: Double? = null,
  val communityVotes: Int = 0,
  val popularity: Double = 0.0,
  val directors: List<String> = emptyList(),
  val writers: List<String> = emptyList(),
  val cast: List<String> = emptyList(),
  val keywords: List<String> = emptyList(),
  val franchises: List<String> = emptyList(),
  val studios: List<String> = emptyList(),
)

/** Snapshot of a Showly TraktRating joined with its full movie metadata. */
data class ShowlyRatingRecord(
  val movie: ShowlyMovieMetadata,
  val rating: Int,
  val ratedAtEpochMillis: Long,
)

/** Explicit recommendation feedback stored by the derived app in Room. */
data class ShowlyFeedbackRecord(
  val movie: ShowlyMovieMetadata,
  val type: RecommendationFeedbackType,
  val createdAtEpochMillis: Long,
)

/**
 * Converts Showly and TMDB data into the portable engine model.
 *
 * The adapter deliberately does not depend on Android, Room, Retrofit or Showly classes, so it
 * can be unit-tested independently. The Android integration layer is responsible for joining
 * Trakt rating IDs with cached Movie rows and enriching credits before invoking this class.
 */
class ShowlyRecommendationAdapter(
  private val engine: RecommendationEngine = RecommendationEngine(),
) {

  fun toProfile(movie: ShowlyMovieMetadata): MovieProfile {
    val features = buildSet {
      movie.genres.addAll(MovieFeatureType.GENRE)
      movie.directors.addAll(MovieFeatureType.DIRECTOR)
      movie.writers.addAll(MovieFeatureType.WRITER)
      movie.cast.addAll(MovieFeatureType.CAST)
      movie.keywords.addAll(MovieFeatureType.KEYWORD)
      movie.franchises.addAll(MovieFeatureType.FRANCHISE)
      movie.studios.addAll(MovieFeatureType.STUDIO)
      movie.language?.let { addFeature(MovieFeatureType.LANGUAGE, it) }
      movie.country?.let { addFeature(MovieFeatureType.COUNTRY, it) }
      movie.year?.takeIf { it > 0 }?.let { year ->
        addFeature(MovieFeatureType.DECADE, "${year / 10 * 10}s")
      }
    }

    return MovieProfile(
      id = movie.idTrakt,
      title = movie.title,
      features = features,
      releaseYear = movie.year,
      communityRating = movie.communityRating,
      communityVotes = movie.communityVotes,
      popularity = movie.popularity,
    )
  }

  fun recommend(
    candidates: List<ShowlyMovieMetadata>,
    ratings: List<ShowlyRatingRecord>,
    feedback: List<ShowlyFeedbackRecord> = emptyList(),
    /** Pass all watched, hidden, dismissed and otherwise unavailable Trakt IDs from Showly. */
    excludedMovieIds: Set<Long> = emptySet(),
    limit: Int = 20,
    diversity: Double = 0.35,
    nowEpochMillis: Long = System.currentTimeMillis(),
  ): List<RecommendedMovie> {
    val request = RecommendationRequest(
      candidates = candidates.map(::toProfile),
      ratings = ratings.map {
        UserMovieRating(
          movie = toProfile(it.movie),
          rating = it.rating,
          ratedAtEpochMillis = it.ratedAtEpochMillis,
        )
      },
      feedback = feedback.map {
        RecommendationFeedback(
          movie = toProfile(it.movie),
          type = it.type,
          createdAtEpochMillis = it.createdAtEpochMillis,
        )
      },
      excludedMovieIds = excludedMovieIds,
      limit = limit,
      diversity = diversity,
      nowEpochMillis = nowEpochMillis,
    )
    return engine.recommend(request)
  }

  private fun MutableSet<MovieFeature>.addAll(
    values: List<String>,
    type: MovieFeatureType,
  ) {
    values.asSequence()
      .map(String::trim)
      .filter(String::isNotEmpty)
      .distinctBy { it.lowercase() }
      .forEach { add(MovieFeature(type, it)) }
  }

  private fun MutableSet<MovieFeature>.addFeature(type: MovieFeatureType, value: String) {
    value.trim().takeIf(String::isNotEmpty)?.let { add(MovieFeature(type, it)) }
  }
}
