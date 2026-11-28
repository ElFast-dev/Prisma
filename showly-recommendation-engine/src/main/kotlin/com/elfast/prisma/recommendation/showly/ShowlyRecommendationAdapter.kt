package com.elfast.prisma.recommendation.showly

import com.elfast.prisma.recommendation.MovieFeature
import com.elfast.prisma.recommendation.MovieFeatureType
import com.elfast.prisma.recommendation.MovieProfile
import com.elfast.prisma.recommendation.RecommendationEngine
import com.elfast.prisma.recommendation.RecommendationRequest
import com.elfast.prisma.recommendation.RecommendedMovie
import com.elfast.prisma.recommendation.UserMovieRating

/**
 * SDK-independent snapshot of a Showly movie or series plus optional TMDB enrichment.
 *
 * Showly adapter notes:
 * - idTrakt <- Movie.traktId
 * - year/genres/language/country/rating/votes <- ui_model.Movie
 * - popularity can be supplied by the candidate source or left at zero
 * - directors/cast/writers/keywords/franchise/studio come from TMDB credits and metadata when
 *   available; no missing data is fabricated.
 */
data class ShowlyTitleMetadata(
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
  val networks: List<String> = emptyList(),
)

/** Snapshot of a Showly TraktRating joined with its full title metadata. */
data class ShowlyTitleRatingRecord(
  val title: ShowlyTitleMetadata,
  val rating: Int,
  val ratedAtEpochMillis: Long,
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

  fun toProfile(movie: ShowlyTitleMetadata): MovieProfile {
    val features = buildSet {
      addAll(movie.genres, MovieFeatureType.GENRE)
      addAll(movie.directors, MovieFeatureType.DIRECTOR)
      addAll(movie.writers, MovieFeatureType.WRITER)
      addAll(movie.cast, MovieFeatureType.CAST)
      addAll(movie.keywords, MovieFeatureType.KEYWORD)
      addAll(movie.franchises, MovieFeatureType.FRANCHISE)
      addAll(movie.studios, MovieFeatureType.STUDIO)
      addAll(movie.networks, MovieFeatureType.NETWORK)
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
    candidates: List<ShowlyTitleMetadata>,
    ratings: List<ShowlyTitleRatingRecord>,
    /** Pass watched, hidden and otherwise unavailable Trakt IDs already known by Showly. */
    excludedMovieIds: Set<Long> = emptySet(),
    limit: Int = 20,
    diversity: Double = 0.35,
    nowEpochMillis: Long = System.currentTimeMillis(),
  ): List<RecommendedMovie> {
    val request = RecommendationRequest(
      candidates = candidates.map(::toProfile),
      ratings = ratings.map {
        UserMovieRating(
          movie = toProfile(it.title),
          rating = it.rating,
          ratedAtEpochMillis = it.ratedAtEpochMillis,
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
