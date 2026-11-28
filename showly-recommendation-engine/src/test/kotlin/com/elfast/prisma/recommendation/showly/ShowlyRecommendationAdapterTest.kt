package com.elfast.prisma.recommendation.showly

import com.elfast.prisma.recommendation.MovieFeatureType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ShowlyRecommendationAdapterTest {

  private val adapter = ShowlyRecommendationAdapter()
  private val now = 1_800_000_000_000L

  @Test
  fun mapsShowlyAndTmdbMetadataIntoTypedFeatures() {
    val profile = adapter.toProfile(
      ShowlyTitleMetadata(
        idTrakt = 42,
        title = "A Feature-Rich Film",
        year = 1998,
        genres = listOf("Science Fiction", "science fiction", "Drama"),
        language = "en",
        country = "US",
        directors = listOf("Jane Director"),
        writers = listOf("A. Writer"),
        cast = listOf("Actor One", "Actor Two"),
        keywords = listOf("time travel"),
        franchises = listOf("Example Saga"),
        studios = listOf("Example Studios"),
        networks = listOf("HBO"),
        communityRating = 8.1,
        communityVotes = 1200,
        popularity = 32.0,
      ),
    )

    assertEquals(42L, profile.id)
    assertEquals("A Feature-Rich Film", profile.title)
    assertEquals(1998, profile.releaseYear)
    assertEquals(8.1, profile.communityRating!!, 0.0)
    assertTrue(profile.features.any { it.type == MovieFeatureType.GENRE && it.normalizedValue == "science fiction" })
    assertEquals(1, profile.features.count { it.type == MovieFeatureType.GENRE && it.normalizedValue == "science fiction" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.DIRECTOR && it.normalizedValue == "jane director" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.WRITER && it.normalizedValue == "a writer" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.CAST && it.normalizedValue == "actor one" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.KEYWORD && it.normalizedValue == "time travel" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.FRANCHISE && it.normalizedValue == "example saga" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.STUDIO && it.normalizedValue == "example studios" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.NETWORK && it.normalizedValue == "hbo" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.LANGUAGE && it.normalizedValue == "en" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.COUNTRY && it.normalizedValue == "us" })
    assertTrue(profile.features.any { it.type == MovieFeatureType.DECADE && it.normalizedValue == "1990s" })
  }

  @Test
  fun usesTraktRatingsToRankCandidatesAndOmitsRatedMovies() {
    val history = listOf(
      rating(movie(1, "Arrival", "science fiction", director = "Denis Villeneuve"), 10, 20),
      rating(movie(2, "Blade Runner", "science fiction", director = "Denis Villeneuve"), 9, 40),
      rating(movie(3, "The Notebook", "romance", director = "Nick Cassavetes"), 2, 60),
      rating(movie(4, "La La Land", "romance", director = "Damien Chazelle"), 3, 80),
    )
    val candidates = listOf(
      movie(1, "Arrival", "science fiction", director = "Denis Villeneuve"),
      movie(10, "Moon", "science fiction", director = "Duncan Jones", rating = 7.7, popularity = 45.0),
      movie(11, "Romance Pick", "romance", director = "Nick Cassavetes", rating = 8.4, popularity = 100.0),
      movie(12, "The Martian", "science fiction", director = "Ridley Scott", rating = 8.0, popularity = 70.0),
    )

    val results = adapter.recommend(
      candidates = candidates,
      ratings = history,
      diversity = 0.0,
      limit = 10,
      nowEpochMillis = now,
    )

    assertFalse(results.any { it.movie.id == 1L })
    val sciFi = results.filter { it.movie.id == 10L || it.movie.id == 12L }.map { it.score }
    val romance = results.single { it.movie.id == 11L }.score
    assertTrue("Personal ratings should outweigh popularity alone", sciFi.all { it > romance })
  }

  @Test
  fun excludesAlreadyRatedHiddenAndUnavailableMovies() {
    val watchedAndRated = movie(1, "Already Watched", "drama")
    val hidden = movie(2, "Hidden", "mystery")
    val unavailable = movie(3, "Unavailable", "romance")
    val candidates = listOf(
      watchedAndRated,
      hidden,
      unavailable,
      movie(4, "Eligible", "comedy"),
    )

    val results = adapter.recommend(
      candidates = candidates,
      ratings = listOf(rating(watchedAndRated, 8, 1)),
      excludedMovieIds = setOf(2L, 3L),
      nowEpochMillis = now,
    )

    assertEquals(listOf(4L), results.map { it.movie.id })
  }

  @Test
  fun aNormalRatingChangeRebuildsTheTasteProfileWithoutExtraFeedback() {
    val candidates = listOf(
      movie(20, "Comedy Pick", "comedy", rating = 7.5, popularity = 20.0),
      movie(21, "Drama Pick", "drama", rating = 7.5, popularity = 20.0),
    )
    val comedyHistory = movie(1, "Rated Title", "comedy")
    val comedyScore = adapter.recommend(
      candidates = candidates,
      ratings = listOf(rating(comedyHistory, 10, 1)),
      diversity = 0.0,
      limit = 5,
      nowEpochMillis = now,
    )
    val revisedHistory = adapter.recommend(
      candidates = candidates,
      ratings = listOf(rating(comedyHistory.copy(genres = listOf("drama")), 2, 1)),
      diversity = 0.0,
      limit = 5,
      nowEpochMillis = now,
    )

    assertEquals(20L, comedyScore.first().movie.id)
    assertEquals(21L, revisedHistory.first().movie.id)
  }

  private fun rating(movie: ShowlyTitleMetadata, value: Int, ageDays: Int) =
    ShowlyTitleRatingRecord(movie, value, now - ageDays * DAY)

  private fun movie(
    id: Long,
    title: String,
    genre: String,
    director: String = "Unknown",
    rating: Double? = 7.5,
    popularity: Double = 20.0,
  ) = ShowlyTitleMetadata(
    idTrakt = id,
    title = title,
    genres = listOf(genre),
    directors = listOf(director),
    communityRating = rating,
    communityVotes = 5000,
    popularity = popularity,
  )

  private companion object {
    const val DAY = 86_400_000L
  }
}
