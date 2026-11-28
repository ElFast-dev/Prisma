package com.elfast.prisma.recommendation.simulation

import com.elfast.prisma.recommendation.MovieFeature
import com.elfast.prisma.recommendation.MovieFeatureType
import com.elfast.prisma.recommendation.MovieProfile
import com.elfast.prisma.recommendation.RecommendationEngine
import com.elfast.prisma.recommendation.RecommendationFeedback
import com.elfast.prisma.recommendation.RecommendationFeedbackType
import com.elfast.prisma.recommendation.RecommendationMetrics
import com.elfast.prisma.recommendation.RecommendationRequest
import com.elfast.prisma.recommendation.UserMovieRating

/** Repeatable synthetic-user simulation; contains no personal or downloaded data. */
object RecommendationSimulation {
  private const val NOW = 1_800_000_000_000L
  private const val DAY = 86_400_000L
  private val engine = RecommendationEngine()

  @JvmStatic
  fun main(args: Array<String>) {
    learnsPositiveAndNegativeTaste()
    excludesSeenAndHiddenTitles()
    learnsExplicitRejection()
    newerFeedbackOverridesOlderRating()
    coldStartUsesCommunitySignals()
    handlesEmptyAndZeroLimit()
    diversifiesAndMeasuresResults()
    println("Recommendation simulation passed: 7 scenarios")
  }

  private fun learnsPositiveAndNegativeTaste() {
    val history = listOf(
      rated(film(1, "Arrival", "sci-fi", "Denis Villeneuve", "Amy Adams"), 10, 12),
      rated(film(2, "Blade Runner 2049", "sci-fi", "Denis Villeneuve", "Ryan Gosling"), 9, 30),
      rated(film(3, "Ex Machina", "sci-fi", "Alex Garland", "Alicia Vikander"), 9, 65),
      rated(film(4, "The Notebook", "romance", "Nick Cassavetes", "Ryan Gosling"), 2, 90),
      rated(film(5, "La La Land", "romance", "Damien Chazelle", "Ryan Gosling"), 3, 120),
    )
    val candidates = listOf(
      film(10, "Moon", "sci-fi", "Duncan Jones", "Sam Rockwell", 7.8, 9000, 54.0),
      film(11, "Romantic Weekend", "romance", "Nick Cassavetes", "Ryan Gosling", 8.2, 50000, 95.0),
      film(12, "The Martian", "sci-fi", "Ridley Scott", "Matt Damon", 8.0, 70000, 70.0),
      film(13, "Random Western", "western", "Jane Doe", "Actor Z", 6.2, 900, 12.0),
    )
    val results = engine.recommend(
      RecommendationRequest(candidates, history, limit = 4, diversity = 0.0, nowEpochMillis = NOW),
    )
    val sciFiScores = results.filter { it.movie.id == 10L || it.movie.id == 12L }.map { it.score }
    val romanceScore = results.single { it.movie.id == 11L }.score
    check(sciFiScores.all { it > romanceScore }) { "Learned sci-fi preference should outrank disliked romance" }
    check(results.first().explanation.likedFeatures.isNotEmpty()) { "Recommendation should explain matched preferences" }
    check(results.first().confidence > 0.12) { "Confidence should grow with useful personal evidence" }
  }

  private fun excludesSeenAndHiddenTitles() {
    val history = listOf(rated(film(1, "Seen Sci-Fi", "sci-fi", "D1", "A1"), 9, 20))
    val candidates = listOf(
      film(1, "Seen Sci-Fi", "sci-fi", "D1", "A1"),
      film(2, "Hidden Mystery", "mystery", "D2", "A2"),
      film(3, "New Sci-Fi", "sci-fi", "D3", "A3"),
    )
    val feedback = listOf(RecommendationFeedback(candidates[1], RecommendationFeedbackType.HIDE, NOW - DAY))
    val results = engine.recommend(RecommendationRequest(candidates, history, feedback, limit = 10, nowEpochMillis = NOW))
    check(results.map { it.movie.id } == listOf(3L)) { "Seen and hidden IDs must not be recommended" }
  }

  private fun learnsExplicitRejection() {
    val rejected = film(2, "Romance Rejected", "romance", "Director R", "Actor R")
    val candidates = listOf(
      film(10, "Romantic Drama", "romance", "Director R", "Actor R", 8.9, 90000, 100.0),
      film(11, "Science Fiction", "sci-fi", "Director S", "Actor S", 7.6, 10000, 40.0),
    )
    val feedback = listOf(RecommendationFeedback(rejected, RecommendationFeedbackType.NOT_INTERESTED, NOW - 5 * DAY))
    val results = engine.recommend(
      RecommendationRequest(candidates, emptyList(), feedback, limit = 2, diversity = 0.0, nowEpochMillis = NOW),
    )
    check(results.first().movie.id == 11L) { "Explicit rejection should lower similar recommendations" }
  }

  private fun newerFeedbackOverridesOlderRating() {
    val title = film(1, "Changed Mind", "romance", "Director R", "Actor R")
    val candidate = film(2, "Another Romance", "romance", "Director R", "Actor R", 8.0, 30000, 30.0)
    val request = RecommendationRequest(
      candidates = listOf(candidate),
      ratings = listOf(rated(title, 10, 90)),
      feedback = listOf(RecommendationFeedback(title, RecommendationFeedbackType.NOT_INTERESTED, NOW - DAY)),
      limit = 1,
      diversity = 0.0,
      nowEpochMillis = NOW,
    )
    val result = engine.recommend(request).single()
    check(result.explanation.avoidedFeatures.isNotEmpty()) { "The most recent explicit feedback should win" }
  }

  private fun coldStartUsesCommunitySignals() {
    val candidates = listOf(
      film(1, "Low Rated", "drama", "D1", "A1", 4.2, 40000, 30.0),
      film(2, "Highly Rated", "thriller", "D2", "A2", 8.8, 30000, 80.0),
      film(3, "Unrated", "comedy", "D3", "A3", null, 0, 10.0),
    )
    val results = engine.recommend(RecommendationRequest(candidates, emptyList(), limit = 3, nowEpochMillis = NOW))
    check(results.first().movie.id == 2L) { "Cold start should rely on quality and popularity" }
    check(results.all { it.confidence == 0.12 }) { "Cold-start confidence should stay conservative" }
  }

  private fun handlesEmptyAndZeroLimit() {
    check(engine.recommend(RecommendationRequest(emptyList(), emptyList())).isEmpty()) { "Empty candidates should return empty" }
    val candidates = listOf(film(2, "B", "drama", "D", "A"), film(1, "A", "drama", "D", "A"))
    val first = engine.recommend(RecommendationRequest(candidates, emptyList(),  limit = 2, diversity = 0.0, nowEpochMillis = NOW))
    val second = engine.recommend(RecommendationRequest(candidates.reversed(), emptyList(), limit = 2, diversity = 0.0, nowEpochMillis = NOW))
    check(first.map { it.movie.id } == second.map { it.movie.id }) { "Tie breaking should be deterministic" }
    check(engine.recommend(RecommendationRequest(candidates, emptyList(), limit = 0)).isEmpty()) { "Zero limit should return empty" }
  }

  private fun diversifiesAndMeasuresResults() {
    val history = listOf(
      rated(film(1, "Classic Sci-Fi 1", "sci-fi", "D1", "A1"), 10, 15),
      rated(film(2, "Classic Sci-Fi 2", "sci-fi", "D2", "A2"), 9, 35),
      rated(film(3, "Classic Sci-Fi 3", "sci-fi", "D3", "A3"), 9, 55),
    )
    val candidates = listOf(
      film(10, "Space A", "sci-fi", "D1", "A1", 8.3, 20000, 70.0),
      film(11, "Space B", "sci-fi", "D2", "A2", 8.2, 20000, 69.0),
      film(12, "Space C", "sci-fi", "D3", "A3", 8.1, 20000, 68.0),
      film(13, "Psychological Thriller", "thriller", "D4", "A4", 8.0, 19000, 67.0),
      film(14, "Historical Mystery", "mystery", "D5", "A5", 7.9, 18000, 66.0),
    )
    val concentrated = engine.recommend(RecommendationRequest(candidates, history, limit = 3, diversity = 0.0, nowEpochMillis = NOW))
    val varied = engine.recommend(RecommendationRequest(candidates, history, limit = 3, diversity = 1.0, nowEpochMillis = NOW))
    check(
      RecommendationMetrics.intraListDiversity(varied.map { it.movie }) >=
        RecommendationMetrics.intraListDiversity(concentrated.map { it.movie }),
    ) { "Diversity re-ranking should not lower list diversity" }
    check(varied.size == 3) { "Diversity should preserve requested result count" }
    check(RecommendationMetrics.precisionAtK(listOf(1, 4, 2, 3), setOf(1, 2), 4) == 0.5) { "Precision@4" }
    check(RecommendationMetrics.recallAtK(listOf(1, 4, 2, 3), setOf(1, 2), 2) == 0.5) { "Recall@2" }
    check(RecommendationMetrics.hitRateAtK(listOf(1, 4, 2, 3), setOf(1, 2), 1) == 1.0) { "HitRate@1" }
    check(RecommendationMetrics.ndcgAtK(listOf(1, 2), mapOf(1L to 10, 2L to 5), 2) == 1.0) { "NDCG ideal ranking" }
    check(RecommendationMetrics.catalogCoverage(listOf(1, 1, 2), 10) == 0.2) { "Catalog coverage" }
  }

  private fun rated(movie: MovieProfile, rating: Int, ageDays: Int) =
    UserMovieRating(movie, rating, NOW - ageDays * DAY)

  private fun film(
    id: Long,
    title: String,
    genre: String,
    director: String,
    actor: String,
    community: Double? = 7.5,
    votes: Int = 1000,
    popularity: Double = 20.0,
  ) = MovieProfile(
    id = id,
    title = title,
    features = setOf(
      MovieFeature(MovieFeatureType.GENRE, genre),
      MovieFeature(MovieFeatureType.DIRECTOR, director),
      MovieFeature(MovieFeatureType.CAST, actor),
    ),
    communityRating = community,
    communityVotes = votes,
    popularity = popularity,
  )
}
