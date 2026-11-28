package com.elfast.prisma.recommendation.showly

import com.elfast.prisma.recommendation.RecommendedMovie

/**
 * Complete, enriched input snapshot that the Android/Room integration assembles for one refresh.
 *
 * Keeping storage and network access behind this boundary allows the ranking core to remain
 * deterministic and independent from Android, Room, Retrofit and Trakt authentication.
 */
data class ShowlyRecommendationData(
  val candidates: List<ShowlyMovieMetadata>,
  val ratings: List<ShowlyRatingRecord>,
  val excludedMovieIds: Set<Long>,
)

/**
 * Implement this contract in the Showly Android layer:
 * - candidates from DiscoverMoviesRepository / Trakt discovery endpoints
 * - ratings from MoviesRatingsRepository.loadMoviesRatings(), joined to local Movie rows
 * - excluded IDs from watched, rated, watchlist and hidden movies
 *
 * The source should perform network/cache work and metadata enrichment; no API calls are made
 * by PersonalizedMovieDiscovery itself.
 */
interface ShowlyRecommendationDataSource {
  suspend fun loadRecommendationData(): ShowlyRecommendationData
}

/** Use case boundary for a future Showly feed tab such as "Para ti". */
class PersonalizedMovieDiscovery(
  private val dataSource: ShowlyRecommendationDataSource,
  private val adapter: ShowlyRecommendationAdapter = ShowlyRecommendationAdapter(),
) {
  suspend fun recommend(
    limit: Int = 20,
    diversity: Double = 0.35,
    nowEpochMillis: Long = System.currentTimeMillis(),
  ): List<RecommendedMovie> {
    val data = dataSource.loadRecommendationData()
    return adapter.recommend(
      candidates = data.candidates,
      ratings = data.ratings,
      excludedMovieIds = data.excludedMovieIds,
      limit = limit,
      diversity = diversity,
      nowEpochMillis = nowEpochMillis,
    )
  }
}
