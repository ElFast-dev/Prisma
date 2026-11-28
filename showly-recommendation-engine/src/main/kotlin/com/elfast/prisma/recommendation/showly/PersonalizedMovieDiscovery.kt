package com.elfast.prisma.recommendation.showly

import com.elfast.prisma.recommendation.RecommendedMovie

/**
 * Complete, enriched input snapshot that the Android/Room integration assembles for a movie or series feed refresh.
 *
 * Keeping storage and network access behind this boundary allows the ranking core to remain
 * deterministic and independent from Android, Room, Retrofit and Trakt authentication.
 */
data class ShowlyRecommendationData(
  val candidates: List<ShowlyTitleMetadata>,
  val ratings: List<ShowlyTitleRatingRecord>,
  val excludedMovieIds: Set<Long>,
)

/**
 * Implement this contract in the Showly Android layer:
 * - candidates from the movie or series discovery repository / Trakt discovery endpoints
 * - ratings from the matching MoviesRatingsRepository or ShowsRatingsRepository, joined to local title rows
 * - excluded IDs from rated and hidden titles, plus collection/watchlist when requested
 *
 * The source should perform network/cache work and metadata enrichment; no API calls are made
 * by PersonalizedMovieDiscovery itself.
 */
interface ShowlyRecommendationDataSource {
  suspend fun loadRecommendationData(): ShowlyRecommendationData
}

/** Generic use case boundary for a Showly personalized feed such as "Para ti". */
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
