#!/usr/bin/env python3
"""Apply Prisma's personalized movie and series feeds to the pinned Showly submodule.

The patch is planned and validated in memory before any file is written. It is repeatable,
and it never commits or pushes changes into the upstream Showly repository.
"""

from __future__ import annotations

from pathlib import Path
import sys


PERSONALIZED_CASE = r'''package com.michaldrabik.ui_discover_movies.cases

import com.michaldrabik.common.dispatchers.CoroutineDispatchers
import com.michaldrabik.data_local.LocalDataSource
import com.michaldrabik.data_remote.RemoteDataSource
import com.michaldrabik.repository.PeopleRepository
import com.michaldrabik.repository.mappers.Mappers
import com.michaldrabik.repository.movies.MovieDetailsRepository
import com.michaldrabik.repository.movies.ratings.MoviesRatingsRepository
import com.michaldrabik.ui_model.IdTrakt
import com.michaldrabik.ui_model.Movie
import com.michaldrabik.ui_model.TraktRating
import com.michaldrabik.ui_model.Person.Department
import com.elfast.prisma.recommendation.ratingSignal
import com.elfast.prisma.recommendation.showly.ShowlyTitleMetadata
import com.elfast.prisma.recommendation.showly.ShowlyTitleRatingRecord
import com.elfast.prisma.recommendation.showly.ShowlyRecommendationAdapter
import dagger.hilt.android.scopes.ViewModelScoped
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import javax.inject.Inject

/** Builds personalized rankings from Showly's local Trakt ratings and cached movie metadata. */
@ViewModelScoped
internal class PersonalizedMoviesCase @Inject constructor(
  private val dispatchers: CoroutineDispatchers,
  private val ratingsRepository: MoviesRatingsRepository,
  private val localSource: LocalDataSource,
  private val remoteSource: RemoteDataSource,
  private val movieDetailsRepository: MovieDetailsRepository,
  private val peopleRepository: PeopleRepository,
  private val mappers: Mappers,
) {
  private val adapter = ShowlyRecommendationAdapter()

  suspend fun rank(
    candidates: List<Movie>,
    excludedIds: List<Long>,
  ): List<Movie> =
    withContext(dispatchers.IO) {
      if (candidates.isEmpty()) return@withContext emptyList()

      val allRatings = ratingsRepository.loadMoviesRatings()
        .filter { it.rating in 1..10 }
      val allRatedIds = allRatings.mapTo(HashSet()) { it.idTrakt.id }
      val ratings = allRatings
        .sortedByDescending { it.ratedAt }
        .take(MAX_HISTORY_RATINGS)

      if (ratings.isEmpty()) return@withContext coldStart(candidates, excludedIds)
      val personalRatingMean = ratings.map { it.rating.toDouble() }.average()

      val ratingIds = ratings.map { it.idTrakt.id }.distinct()
      val localRows = localSource.movies.getAllChunked(ratingIds)
      val historyById = localRows
        .map { mappers.movie.fromDatabase(it) }
        .associateBy { it.traktId }
        .toMutableMap()

      val missingRatings = ratings
        .filter { it.idTrakt.id !in historyById }
        .take(MAX_MISSING_DETAILS)
      if (missingRatings.isNotEmpty()) {
        val semaphore = Semaphore(MAX_PARALLEL_REQUESTS)
        val resolved = coroutineScope {
          missingRatings.map { rating ->
            async {
              semaphore.withPermit {
                try {
                  rating.idTrakt.id to movieDetailsRepository.load(IdTrakt(rating.idTrakt.id))
                } catch (error: CancellationException) {
                  throw error
                } catch (_: Throwable) {
                  null
                }
              }
            }
          }.awaitAll()
        }
        resolved.filterNotNull().forEach { (id, movie) -> historyById[id] = movie }
      }

      val ratingPairs = ratings.mapNotNull { rating ->
        historyById[rating.idTrakt.id]?.let { rating to it }
      }
      if (ratingPairs.isEmpty()) {
        return@withContext coldStart(candidates, excludedIds + allRatedIds)
      }

      val ratedMovies = ratingPairs.map { it.second }.distinctBy { it.traktId }
      val relatedCandidates = loadRelatedCandidates(ratingPairs, personalRatingMean)
      val recommendationCandidates = (relatedCandidates + candidates).distinctBy { it.traktId }
      val ratedCreditIds = ratedMovies.take(MAX_RATED_CREDIT_MOVIES)
        .mapTo(HashSet()) { it.traktId }
      val candidateCreditIds = recommendationCandidates.take(MAX_CANDIDATE_CREDIT_MOVIES)
        .mapTo(HashSet()) { it.traktId }

      val ratedMetadata = enrich(ratedMovies, ratedCreditIds).associateBy { it.idTrakt }
      val candidateMetadata = enrich(recommendationCandidates, candidateCreditIds)

      val ratingRecords = ratingPairs.mapNotNull { (rating, movie) ->
        ratedMetadata[movie.traktId]?.let { metadata ->
          ShowlyTitleRatingRecord(
            title = metadata,
            rating = rating.rating,
            ratedAtEpochMillis = rating.ratedAt.toInstant().toEpochMilli(),
          )
        }
      }

      val recommendations = adapter.recommend(
        candidates = candidateMetadata,
        ratings = ratingRecords,
        excludedMovieIds = (excludedIds + allRatedIds).toSet(),
        limit = recommendationCandidates.size,
        diversity = DEFAULT_DIVERSITY,
      )
      val candidatesById = recommendationCandidates.associateBy { it.traktId }
      recommendations.mapNotNull { candidatesById[it.movie.id] }
    }

  /** Expands the catalog with related titles from a few highly rated items. */
  private suspend fun loadRelatedCandidates(
    ratingPairs: List<Pair<TraktRating, Movie>>,
    personalRatingMean: Double,
  ): List<Movie> =
    coroutineScope {
      val seeds = ratingPairs
        .distinctBy { it.first.idTrakt.id }
        .filter { ratingSignal(it.first.rating, personalRatingMean) >= MIN_RELATED_SEED_SIGNAL }
        .sortedWith(
          compareByDescending<Pair<TraktRating, Movie>> { ratingSignal(it.first.rating, personalRatingMean) }
            .thenByDescending { it.first.ratedAt },
        )
        .take(MAX_RELATED_SEEDS)
      val semaphore = Semaphore(MAX_RELATED_REQUESTS)
      val relatedBySeed = seeds.map { (_, ratedTitle) ->
        async {
          semaphore.withPermit {
            try {
              remoteSource.trakt.fetchRelatedMovies(ratedTitle.traktId, RELATED_LIMIT_ADJUSTMENT)
                .map { mappers.movie.fromNetwork(it) }
            } catch (error: CancellationException) {
              throw error
            } catch (_: Throwable) {
              emptyList()
            }
          }
        }
      }.awaitAll()
      val selected = linkedMapOf<Long, Movie>()
      val maxRelatedIndex = relatedBySeed.maxOfOrNull { it.size } ?: 0
      for (index in 0 until maxRelatedIndex) {
        for (seedResults in relatedBySeed) {
          val related = seedResults.getOrNull(index) ?: continue
          if (related.traktId !in selected) selected[related.traktId] = related
          if (selected.size >= MAX_RELATED_CANDIDATES) break
        }
        if (selected.size >= MAX_RELATED_CANDIDATES) break
      }
      selected.values.toList()
    }

  private suspend fun coldStart(
    candidates: List<Movie>,
    excludedIds: List<Long>,
  ): List<Movie> {
    val creditIds = candidates.take(MAX_CANDIDATE_CREDIT_MOVIES).mapTo(HashSet()) { it.traktId }
    val metadata = enrich(candidates, creditIds)
    val recommendations = adapter.recommend(
      candidates = metadata,
      ratings = emptyList(),
      excludedMovieIds = excludedIds.toSet(),
      limit = candidates.size,
      diversity = DEFAULT_DIVERSITY,
    )
    val byId = candidates.associateBy { it.traktId }
    return recommendations.mapNotNull { byId[it.movie.id] }
  }

  private suspend fun enrich(
    movies: List<Movie>,
    creditIds: Set<Long>,
  ): List<ShowlyTitleMetadata> =
    coroutineScope {
      val semaphore = Semaphore(MAX_PARALLEL_REQUESTS)
      movies.map { movie ->
        async {
          semaphore.withPermit {
            val credits = if (movie.traktId in creditIds && movie.ids.tmdb.id > 0) {
              try {
                peopleRepository.loadAllForMovie(movie.ids)
              } catch (error: CancellationException) {
                throw error
              } catch (_: Throwable) {
                emptyMap()
              }
            } else {
              emptyMap()
            }

            ShowlyTitleMetadata(
              idTrakt = movie.traktId,
              title = movie.title,
              year = movie.year.takeIf { it > 0 },
              genres = movie.genres.filter { it.isNotBlank() },
              language = movie.language.takeIf { it.isNotBlank() },
              country = movie.country.takeIf { it.isNotBlank() },
              communityRating = movie.rating.takeIf { it in 0f..10f }?.toDouble(),
              communityVotes = movie.votes.takeIf { it > 0 }
                ?.coerceAtMost(Int.MAX_VALUE.toLong())?.toInt() ?: 0,
              popularity = 0.0,
              directors = credits[Department.DIRECTING].orEmpty().map { it.name },
              writers = credits[Department.WRITING].orEmpty().map { it.name },
              cast = credits[Department.ACTING].orEmpty().map { it.name }.take(30),
            )
          }
        }
      }.awaitAll()
    }

  private companion object {
    const val MAX_HISTORY_RATINGS = 100
    const val MAX_MISSING_DETAILS = 20
    const val MAX_RATED_CREDIT_MOVIES = 40
    const val MAX_CANDIDATE_CREDIT_MOVIES = 24
    const val MAX_PARALLEL_REQUESTS = 4
    const val MIN_RELATED_SEED_SIGNAL = 0.10
    const val MAX_RELATED_SEEDS = 4
    const val RELATED_LIMIT_ADJUSTMENT = 0
    const val MAX_RELATED_CANDIDATES = 40
    const val MAX_RELATED_REQUESTS = 2
    const val DEFAULT_DIVERSITY = 0.35
  }
}
'''

PERSONALIZED_SHOWS_CASE = r'''package com.michaldrabik.ui_discover.cases

import com.michaldrabik.common.dispatchers.CoroutineDispatchers
import com.michaldrabik.data_local.LocalDataSource
import com.michaldrabik.data_remote.RemoteDataSource
import com.michaldrabik.repository.PeopleRepository
import com.michaldrabik.repository.mappers.Mappers
import com.michaldrabik.repository.shows.ShowDetailsRepository
import com.michaldrabik.repository.shows.ratings.ShowsRatingsRepository
import com.michaldrabik.ui_model.IdTrakt
import com.michaldrabik.ui_model.Person.Department
import com.michaldrabik.ui_model.Show
import com.michaldrabik.ui_model.TraktRating
import com.elfast.prisma.recommendation.ratingSignal
import com.elfast.prisma.recommendation.showly.ShowlyTitleMetadata
import com.elfast.prisma.recommendation.showly.ShowlyTitleRatingRecord
import com.elfast.prisma.recommendation.showly.ShowlyRecommendationAdapter
import dagger.hilt.android.scopes.ViewModelScoped
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import javax.inject.Inject

/** Learns from the ratings the person already gives to series in Showly. */
@ViewModelScoped
internal class PersonalizedShowsCase @Inject constructor(
  private val dispatchers: CoroutineDispatchers,
  private val ratingsRepository: ShowsRatingsRepository,
  private val localSource: LocalDataSource,
  private val remoteSource: RemoteDataSource,
  private val showDetailsRepository: ShowDetailsRepository,
  private val peopleRepository: PeopleRepository,
  private val mappers: Mappers,
) {
  private val adapter = ShowlyRecommendationAdapter()

  suspend fun rank(
    candidates: List<Show>,
    excludedIds: List<Long>,
  ): List<Show> =
    withContext(dispatchers.IO) {
      if (candidates.isEmpty()) return@withContext emptyList()

      val allRatings = ratingsRepository.loadShowsRatings()
        .filter { it.rating in 1..10 }
      val allRatedIds = allRatings.mapTo(HashSet()) { it.idTrakt.id }
      val ratings = allRatings
        .sortedByDescending { it.ratedAt }
        .take(MAX_HISTORY_RATINGS)

      if (ratings.isEmpty()) return@withContext coldStart(candidates, excludedIds)
      val personalRatingMean = ratings.map { it.rating.toDouble() }.average()

      val ratingIds = ratings.map { it.idTrakt.id }.distinct()
      val localRows = localSource.shows.getAllChunked(ratingIds)
      val historyById = localRows
        .map { mappers.show.fromDatabase(it) }
        .associateBy { it.traktId }
        .toMutableMap()

      val missingRatings = ratings
        .filter { it.idTrakt.id !in historyById }
        .take(MAX_MISSING_DETAILS)
      if (missingRatings.isNotEmpty()) {
        val semaphore = Semaphore(MAX_PARALLEL_REQUESTS)
        val resolved = coroutineScope {
          missingRatings.map { rating ->
            async {
              semaphore.withPermit {
                try {
                  rating.idTrakt.id to showDetailsRepository.load(IdTrakt(rating.idTrakt.id))
                } catch (error: CancellationException) {
                  throw error
                } catch (_: Throwable) {
                  null
                }
              }
            }
          }.awaitAll()
        }
        resolved.filterNotNull().forEach { (id, show) -> historyById[id] = show }
      }

      val ratingPairs = ratings.mapNotNull { rating ->
        historyById[rating.idTrakt.id]?.let { rating to it }
      }
      if (ratingPairs.isEmpty()) {
        return@withContext coldStart(candidates, excludedIds + allRatedIds)
      }

      val ratedShows = ratingPairs.map { it.second }.distinctBy { it.traktId }
      val relatedCandidates = loadRelatedCandidates(ratingPairs, personalRatingMean)
      val recommendationCandidates = (relatedCandidates + candidates).distinctBy { it.traktId }
      val ratedCreditIds = ratedShows.take(MAX_RATED_CREDIT_SHOWS)
        .mapTo(HashSet()) { it.traktId }
      val candidateCreditIds = recommendationCandidates.take(MAX_CANDIDATE_CREDIT_SHOWS)
        .mapTo(HashSet()) { it.traktId }

      val ratedMetadata = enrich(ratedShows, ratedCreditIds).associateBy { it.idTrakt }
      val candidateMetadata = enrich(recommendationCandidates, candidateCreditIds)
      val ratingRecords = ratingPairs.mapNotNull { (rating, show) ->
        ratedMetadata[show.traktId]?.let { metadata ->
          ShowlyTitleRatingRecord(
            title = metadata,
            rating = rating.rating,
            ratedAtEpochMillis = rating.ratedAt.toInstant().toEpochMilli(),
          )
        }
      }

      val recommendations = adapter.recommend(
        candidates = candidateMetadata,
        ratings = ratingRecords,
        excludedMovieIds = (excludedIds + allRatedIds).toSet(),
        limit = recommendationCandidates.size,
        diversity = DEFAULT_DIVERSITY,
      )
      val candidatesById = recommendationCandidates.associateBy { it.traktId }
      recommendations.mapNotNull { candidatesById[it.movie.id] }
    }

  /** Expands the catalog with related titles from a few highly rated items. */
  private suspend fun loadRelatedCandidates(
    ratingPairs: List<Pair<TraktRating, Show>>,
    personalRatingMean: Double,
  ): List<Show> =
    coroutineScope {
      val seeds = ratingPairs
        .distinctBy { it.first.idTrakt.id }
        .filter { ratingSignal(it.first.rating, personalRatingMean) >= MIN_RELATED_SEED_SIGNAL }
        .sortedWith(
          compareByDescending<Pair<TraktRating, Show>> { ratingSignal(it.first.rating, personalRatingMean) }
            .thenByDescending { it.first.ratedAt },
        )
        .take(MAX_RELATED_SEEDS)
      val semaphore = Semaphore(MAX_RELATED_REQUESTS)
      val relatedBySeed = seeds.map { (_, ratedTitle) ->
        async {
          semaphore.withPermit {
            try {
              remoteSource.trakt.fetchRelatedShows(ratedTitle.traktId, RELATED_LIMIT_ADJUSTMENT)
                .map { mappers.show.fromNetwork(it) }
            } catch (error: CancellationException) {
              throw error
            } catch (_: Throwable) {
              emptyList()
            }
          }
        }
      }.awaitAll()
      val selected = linkedMapOf<Long, Show>()
      val maxRelatedIndex = relatedBySeed.maxOfOrNull { it.size } ?: 0
      for (index in 0 until maxRelatedIndex) {
        for (seedResults in relatedBySeed) {
          val related = seedResults.getOrNull(index) ?: continue
          if (related.traktId !in selected) selected[related.traktId] = related
          if (selected.size >= MAX_RELATED_CANDIDATES) break
        }
        if (selected.size >= MAX_RELATED_CANDIDATES) break
      }
      selected.values.toList()
    }

  private suspend fun coldStart(
    candidates: List<Show>,
    excludedIds: List<Long>,
  ): List<Show> {
    val creditIds = candidates.take(MAX_CANDIDATE_CREDIT_SHOWS).mapTo(HashSet()) { it.traktId }
    val metadata = enrich(candidates, creditIds)
    val recommendations = adapter.recommend(
      candidates = metadata,
      ratings = emptyList(),
      excludedMovieIds = excludedIds.toSet(),
      limit = candidates.size,
      diversity = DEFAULT_DIVERSITY,
    )
    val byId = candidates.associateBy { it.traktId }
    return recommendations.mapNotNull { byId[it.movie.id] }
  }

  private suspend fun enrich(
    shows: List<Show>,
    creditIds: Set<Long>,
  ): List<ShowlyTitleMetadata> =
    coroutineScope {
      val semaphore = Semaphore(MAX_PARALLEL_REQUESTS)
      shows.map { show ->
        async {
          semaphore.withPermit {
            val credits = if (show.traktId in creditIds && show.ids.tmdb.id > 0) {
              try {
                peopleRepository.loadAllForShow(show.ids)
              } catch (error: CancellationException) {
                throw error
              } catch (_: Throwable) {
                emptyMap()
              }
            } else {
              emptyMap()
            }

            ShowlyTitleMetadata(
              idTrakt = show.traktId,
              title = show.title,
              year = show.year.takeIf { it > 0 },
              genres = show.genres.filter { it.isNotBlank() },
              country = show.country.takeIf { it.isNotBlank() },
              communityRating = show.rating.takeIf { it in 0f..10f }?.toDouble(),
              communityVotes = show.votes.takeIf { it > 0 }
                ?.coerceAtMost(Int.MAX_VALUE.toLong())?.toInt() ?: 0,
              popularity = 0.0,
              directors = credits[Department.DIRECTING].orEmpty().map { it.name },
              writers = credits[Department.WRITING].orEmpty().map { it.name },
              cast = credits[Department.ACTING].orEmpty().map { it.name }.take(30),
              networks = show.network.takeIf { it.isNotBlank() }?.let(::listOf).orEmpty(),
            )
          }
        }
      }.awaitAll()
    }

  private companion object {
    const val MAX_HISTORY_RATINGS = 100
    const val MAX_MISSING_DETAILS = 20
    const val MAX_RATED_CREDIT_SHOWS = 40
    const val MAX_CANDIDATE_CREDIT_SHOWS = 24
    const val MAX_PARALLEL_REQUESTS = 4
    const val MIN_RELATED_SEED_SIGNAL = 0.10
    const val MAX_RELATED_SEEDS = 4
    const val RELATED_LIMIT_ADJUSTMENT = 0
    const val MAX_RELATED_CANDIDATES = 40
    const val MAX_RELATED_REQUESTS = 2
    const val DEFAULT_DIVERSITY = 0.35
  }
}
'''


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    showly = root / "showly-android"
    if not showly.is_dir():
        print(
            "No se encuentra showly-android. Ejecuta git submodule update --init --recursive.",
            file=sys.stderr,
        )
        return 2

    planned: dict[Path, str] = {}

    def patch(relative: str, old: str, new: str) -> None:
        path = showly / relative
        if not path.is_file():
            raise ValueError(f"Falta el archivo esperado: {relative}")
        content = planned.get(path, path.read_text(encoding="utf-8"))
        if new in content:
            planned[path] = content
            return
        if old not in content:
            raise ValueError(f"No se encontró el ancla en {relative}: {old[:100]!r}")
        planned[path] = content.replace(old, new, 1)

    try:
        # Shared enum and personalized ordering for both movie and series discovery.
        patch(
            "ui-model/src/main/java/com/michaldrabik/ui_model/DiscoverFeed.kt",
            "  RECENT,\n}",
            "  RECENT,\n  PERSONALIZED,\n}",
        )

        movies_repository = (
            "repository/src/main/java/com/michaldrabik/repository/movies/DiscoverMoviesRepository.kt"
        )
        shows_repository = (
            "repository/src/main/java/com/michaldrabik/repository/shows/DiscoverShowsRepository.kt"
        )
        for relative in (movies_repository, shows_repository):
            patch(
                relative,
                "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\n",
                "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\n"
                "import com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
            )
            patch(
                relative,
                "import kotlinx.coroutines.async\n",
                "import kotlinx.coroutines.CancellationException\n"
                "import kotlinx.coroutines.async\n",
            )

        patch(
            movies_repository,
            "      TRENDING, RECENT -> loadRemoteTrending(genres, showCollection, collectionSize)\n",
            "      TRENDING, RECENT -> loadRemoteTrending(genres, showCollection, collectionSize)\n"
            "      PERSONALIZED -> loadRemotePersonalized(genres, showCollection, collectionSize)\n",
        )
        patch(
            shows_repository,
            "      TRENDING, RECENT -> loadRemoteTrending(genres, networks, showCollection, collectionSize)\n",
            "      TRENDING, RECENT -> loadRemoteTrending(genres, networks, showCollection, collectionSize)\n"
            "      PERSONALIZED -> loadRemotePersonalized(genres, networks, showCollection, collectionSize)\n",
        )

        movies_personalized_method = '''  private suspend fun loadRemotePersonalized(
            genres: List<Genre>,
            showCollection: Boolean,
            collectionSize: Int,
        ): List<Movie> =
            coroutineScope {
                val trendingAsync = async {
                    try {
                        loadRemoteTrending(genres, showCollection, collectionSize)
                    } catch (error: CancellationException) {
                        throw error
                    } catch (_: Throwable) {
                        emptyList()
                    }
                }
                val popularAsync = async {
                    try {
                        loadRemotePopular(genres)
                    } catch (error: CancellationException) {
                        throw error
                    } catch (_: Throwable) {
                        emptyList()
                    }
                }
                val trending = trendingAsync.await()
                val popular = popularAsync.await()
                val combined = mutableListOf<Movie>()
                repeat(maxOf(trending.size, popular.size)) { index ->
                    trending.getOrNull(index)?.let { addIfMissing(combined, it) }
                    popular.getOrNull(index)?.let { addIfMissing(combined, it) }
                }
                combined
            }

'''
        patch(
            movies_repository,
            "  private suspend fun loadRemotePopular(genres: List<Genre>): List<Movie> {",
            movies_personalized_method + "  private suspend fun loadRemotePopular(genres: List<Genre>): List<Movie> {",
        )

        shows_personalized_method = '''  private suspend fun loadRemotePersonalized(
            genres: List<Genre>,
            networks: List<Network>,
            showCollection: Boolean,
            collectionSize: Int,
        ): List<Show> =
            coroutineScope {
                val trendingAsync = async {
                    try {
                        loadRemoteTrending(genres, networks, showCollection, collectionSize)
                    } catch (error: CancellationException) {
                        throw error
                    } catch (_: Throwable) {
                        emptyList()
                    }
                }
                val popularAsync = async {
                    try {
                        loadRemotePopular(genres, networks)
                    } catch (error: CancellationException) {
                        throw error
                    } catch (_: Throwable) {
                        emptyList()
                    }
                }
                val trending = trendingAsync.await()
                val popular = popularAsync.await()
                val combined = mutableListOf<Show>()
                repeat(maxOf(trending.size, popular.size)) { index ->
                    trending.getOrNull(index)?.let { addIfMissing(combined, it) }
                    popular.getOrNull(index)?.let { addIfMissing(combined, it) }
                }
                combined
            }

'''
        patch(
            shows_repository,
            "  private suspend fun loadRemotePopular(\n    genres: List<Genre>,",
            shows_personalized_method + "  private suspend fun loadRemotePopular(\n    genres: List<Genre>,",
        )

        # The Shows screen shares the enum and gets its own personalized selector.
        patch(
            "ui-discover/src/main/java/com/michaldrabik/ui_discover/filters/views/DiscoverFiltersView.kt",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\n"
            "import com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
        )
        patch(
            "ui-discover/src/main/java/com/michaldrabik/ui_discover/filters/views/DiscoverFiltersView.kt",
            "        RECENT -> context.getString(R.string.textSortNewest)\n",
            "        RECENT -> context.getString(R.string.textSortNewest)\n"
            "        PERSONALIZED -> context.getString(R.string.textFeedForYou)\n",
        )

        # Movie feed selection and label.
        movies_filters = (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/"
            "filters/views/DiscoverMoviesFiltersView.kt"
        )
        patch(
            movies_filters,
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\n"
            "import com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
        )
        patch(
            movies_filters,
            "        RECENT -> context.getString(R.string.textSortNewest)\n",
            "        RECENT -> context.getString(R.string.textSortNewest)\n"
            "        PERSONALIZED -> context.getString(R.string.textFeedForYou)\n",
        )

        movie_sheet = (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/"
            "filters/feed/DiscoverMoviesFiltersFeedBottomSheet.kt"
        )
        patch(
            movie_sheet,
            "import com.michaldrabik.ui_model.DiscoverFeed.POPULAR\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.POPULAR\n"
            "import com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
        )
        patch(
            movie_sheet,
            "        feedChipTrending.isChecked -> TRENDING\n",
            "        feedChipForYou.isChecked -> PERSONALIZED\n"
            "        feedChipTrending.isChecked -> TRENDING\n",
        )
        patch(
            movie_sheet,
            "      feedChipTrending.isChecked = feedOrder == TRENDING\n",
            "      feedChipForYou.isChecked = feedOrder == PERSONALIZED\n"
            "      feedChipTrending.isChecked = feedOrder == TRENDING\n",
        )

        show_sheet = (
            "ui-discover/src/main/java/com/michaldrabik/ui_discover/filters/"
            "feed/DiscoverFiltersFeedBottomSheet.kt"
        )
        patch(
            show_sheet,
            "import com.michaldrabik.ui_model.DiscoverFeed.RECENT\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.RECENT\n"
            "import com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
        )
        patch(
            show_sheet,
            "        feedChipHot.isChecked -> TRENDING\n",
            "        feedChipForYou.isChecked -> PERSONALIZED\n"
            "        feedChipHot.isChecked -> TRENDING\n",
        )
        patch(
            show_sheet,
            "      feedChipHot.isChecked = feedOrder == TRENDING\n",
            "      feedChipForYou.isChecked = feedOrder == PERSONALIZED\n"
            "      feedChipHot.isChecked = feedOrder == TRENDING\n",
        )

        feature_gradle = "ui-discover/build.gradle"
        patch(
            feature_gradle,
            "  implementation project(':repository')\n",
            "  implementation project(':repository')\n"
            "  implementation project(':prisma-recommendation-engine')\n",
        )
        patch(
            feature_gradle,
            "  implementation project(':data-local')\n",
            "  implementation project(':data-local')\n"
            "  implementation project(':data-remote')\n",
        )

        # Keep the recommender dependency in the feature that directly uses its classes.
        feature_gradle = "ui-discover-movies/build.gradle"
        patch(
            feature_gradle,
            "  implementation project(':repository')\n",
            "  implementation project(':repository')\n"
            "  implementation project(':prisma-recommendation-engine')\n",
        )
        patch(
            feature_gradle,
            "  implementation project(':data-local')\n",
            "  implementation project(':data-local')\n"
            "  implementation project(':data-remote')\n",
        )

        shows_case_path = "ui-discover/src/main/java/com/michaldrabik/ui_discover/cases/DiscoverShowsCase.kt"
        patch(
            shows_case_path,
            "import com.michaldrabik.ui_model.DiscoverFeed\n",
            "import com.michaldrabik.ui_model.DiscoverFeed\n"
            "import com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
        )
        patch(
            shows_case_path,
            "  private val settingsRepository: SettingsRepository,\n",
            "  private val settingsRepository: SettingsRepository,\n"
            "  private val personalizedShowsCase: PersonalizedShowsCase,\n",
        )
        patch(
            shows_case_path,
            """      prepareItems(
        shows = cachedShows.await(),
        myShowsIds = myShowsIds.await(),
        watchlistShowsIds = watchlistShowsIds.await(),
        hiddenShowsIds = archiveShowsIds.await(),
        filters = filters,
      )""",
            """      val myIds = myShowsIds.await()
      val watchlistIds = watchlistShowsIds.await()
      val hiddenIds = archiveShowsIds.await()
      val cached = cachedShows.await()
      val excludedIds = hiddenIds +
        if (filters.hideCollection) myIds + watchlistIds else emptyList()
      val ordered = if (filters.feedOrder == PERSONALIZED) {
        personalizedShowsCase.rank(cached, excludedIds)
      } else {
        cached
      }

      prepareItems(
        shows = ordered,
        myShowsIds = myIds,
        watchlistShowsIds = watchlistIds,
        hiddenShowsIds = hiddenIds,
        filters = filters,
      )""",
        )
        patch(
            shows_case_path,
            """      showsRepository.discoverShows.cacheDiscoverShows(remoteShows)

      prepareItems(
        shows = remoteShows,
        myShowsIds = myIds,
        watchlistShowsIds = watchlistIds,
        hiddenShowsIds = hiddenIds,
        filters = filters,
      )""",
            """      showsRepository.discoverShows.cacheDiscoverShows(remoteShows)
      val excludedIds = hiddenIds +
        if (filters.hideCollection) myIds + watchlistIds else emptyList()
      val ordered = if (filters.feedOrder == PERSONALIZED) {
        personalizedShowsCase.rank(remoteShows, excludedIds)
      } else {
        remoteShows
      }

      prepareItems(
        shows = ordered,
        myShowsIds = myIds,
        watchlistShowsIds = watchlistIds,
        hiddenShowsIds = hiddenIds,
        filters = filters,
      )""",
        )

        personalized_shows_case_path = (
            showly / "ui-discover/src/main/java/com/michaldrabik/ui_discover/"
            "cases/PersonalizedShowsCase.kt"
        )
        if personalized_shows_case_path.exists():
            existing = personalized_shows_case_path.read_text(encoding="utf-8")
            if existing != PERSONALIZED_SHOWS_CASE:
                raise ValueError(
                    "PersonalizedShowsCase.kt ya existe con contenido distinto; no se sobrescribió."
                )
        else:
            planned[personalized_shows_case_path] = PERSONALIZED_SHOWS_CASE

        # Connect both cache-first and remote discovery paths.
        case_path = "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/cases/DiscoverMoviesCase.kt"
        patch(
            case_path,
            "import com.michaldrabik.ui_model.DiscoverFeed\n",
            "import com.michaldrabik.ui_model.DiscoverFeed\n"
            "import com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
        )
        patch(
            case_path,
            "  private val translationsRepository: TranslationsRepository,\n",
            "  private val translationsRepository: TranslationsRepository,\n"
            "  private val personalizedMoviesCase: PersonalizedMoviesCase,\n",
        )
        patch(
            case_path,
            """      prepareItems(
        cachedMovies.await(),
        myIds.await(),
        watchlistIds.await(),
        hiddenIds.await(),
        filters,
        language,
      )""",
            """      val myMoviesIds = myIds.await()
      val watchlistMoviesIds = watchlistIds.await()
      val hiddenMoviesIds = hiddenIds.await()
      val cached = cachedMovies.await()
      val excludedIds = hiddenMoviesIds +
        if (filters.hideCollection) myMoviesIds + watchlistMoviesIds else emptyList()
      val ordered = if (filters.feedOrder == PERSONALIZED) {
        personalizedMoviesCase.rank(cached, excludedIds)
      } else {
        cached
      }

      prepareItems(
        ordered,
        myMoviesIds,
        watchlistMoviesIds,
        hiddenMoviesIds,
        filters,
        language,
      )""",
        )
        patch(
            case_path,
            """      moviesRepository.discoverMovies.cacheDiscoverMovies(remoteMovies)
      prepareItems(remoteMovies, myIds, watchlistIds, hiddenIds, filters, language)""",
            """      moviesRepository.discoverMovies.cacheDiscoverMovies(remoteMovies)
      val excludedIds = hiddenIds +
        if (filters.hideCollection) myIds + watchlistIds else emptyList()
      val ordered = if (filters.feedOrder == PERSONALIZED) {
        personalizedMoviesCase.rank(remoteMovies, excludedIds)
      } else {
        remoteMovies
      }
      prepareItems(ordered, myIds, watchlistIds, hiddenIds, filters, language)""",
        )

        patch(
            "ui-discover/src/main/res/values/strings.xml",
            "</resources>",
            '  <string name="textFeedForYou">For you</string>\n</resources>',
        )
        patch(
            "ui-discover/src/main/res/values-es/strings.xml",
            "</resources>",
            '  <string name="textFeedForYou">Para ti</string>\n</resources>',
        )
        show_layout_path = "ui-discover/src/main/res/layout/view_discover_filters_feed.xml"
        show_layout = planned.get(showly / show_layout_path, (showly / show_layout_path).read_text(encoding="utf-8"))
        show_chip_anchor = '''        <com.google.android.material.chip.Chip
          android:id="@+id/feedChipNewest"'''
        show_new_chip = '''        <com.google.android.material.chip.Chip
          android:id="@+id/feedChipForYou"
          style="@style/Widget.Material3.Chip.Suggestion"
          android:layout_width="wrap_content"
          android:layout_height="wrap_content"
          android:text="@string/textFeedForYou"
          android:textColor="@color/selector_discover_chip_text"
          app:checkedIconTint="@color/selector_discover_chip_text"
          app:chipBackgroundColor="@color/selector_discover_chip_background"
          app:chipCornerRadius="100dp"
          app:chipStrokeColor="@color/selector_discover_chip_text"
          app:chipStrokeWidth="1dp"
          />

        <com.google.android.material.chip.Chip
          android:id="@+id/feedChipNewest"'''
        if "android:id=\"@+id/feedChipForYou\"" not in show_layout:
            if show_chip_anchor not in show_layout:
                raise ValueError(f"No se encontró feedChipNewest en {show_layout_path}")
            show_layout = show_layout.replace(show_chip_anchor, show_new_chip, 1)
        planned[showly / show_layout_path] = show_layout

        patch(
            "ui-discover-movies/src/main/res/values/strings.xml",
            "</resources>",
            '  <string name="textFeedForYou">For you</string>\n</resources>',
        )
        patch(
            "ui-discover-movies/src/main/res/values-es/strings.xml",
            "</resources>",
            '  <string name="textFeedForYou">Para ti</string>\n</resources>',
        )
        layout_path = "ui-discover-movies/src/main/res/layout/view_discover_movies_filters_feed.xml"
        layout = planned.get(showly / layout_path, (showly / layout_path).read_text(encoding="utf-8"))
        chip_anchor = '''        <com.google.android.material.chip.Chip
          android:id="@+id/feedChipNewest"'''
        new_chip = '''        <com.google.android.material.chip.Chip
          android:id="@+id/feedChipForYou"
          style="@style/Widget.Material3.Chip.Suggestion"
          android:layout_width="wrap_content"
          android:layout_height="wrap_content"
          android:text="@string/textFeedForYou"
          android:textColor="@color/selector_discover_chip_text"
          app:checkedIconTint="@color/selector_discover_chip_text"
          app:chipBackgroundColor="@color/selector_discover_chip_background"
          app:chipCornerRadius="100dp"
          app:chipStrokeColor="@color/selector_discover_chip_text"
          app:chipStrokeWidth="1dp"
          />

        <com.google.android.material.chip.Chip
          android:id="@+id/feedChipNewest"'''
        if "android:id=\"@+id/feedChipForYou\"" not in layout:
            if chip_anchor not in layout:
                raise ValueError(f"No se encontró el chip feedChipNewest en {layout_path}")
            layout = layout.replace(chip_anchor, new_chip, 1)
        planned[showly / layout_path] = layout

        personalized_case_path = (
            showly / "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/"
            "cases/PersonalizedMoviesCase.kt"
        )
        if personalized_case_path.exists():
            existing = personalized_case_path.read_text(encoding="utf-8")
            if existing != PERSONALIZED_CASE:
                raise ValueError(
                    "PersonalizedMoviesCase.kt ya existe con contenido distinto; no se sobrescribió."
                )
        else:
            planned[personalized_case_path] = PERSONALIZED_CASE

    except ValueError as error:
        print(f"{error}. No se escribieron cambios.", file=sys.stderr)
        return 3

    for path, content in planned.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    print("Feeds 'Para ti' conectados a películas y series.")
    print("Aprende de las calificaciones Trakt existentes y los metadatos locales/cacheados de Showly.")
    print("Los cambios solo afectan al working tree local del submódulo; no se confirma nada en upstream.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
