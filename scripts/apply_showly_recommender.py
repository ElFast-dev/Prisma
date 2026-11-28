#!/usr/bin/env python3
"""Patch the pinned Showly checkout with Prisma's personalized movie feed.

All changes stay in the local showly-android submodule working tree. The upstream repository
is never committed to or pushed to by this script.
"""

from __future__ import annotations

from pathlib import Path
import sys


PERSONALIZED_CASE = r'''package com.michaldrabik.ui_discover_movies.cases

import com.michaldrabik.common.dispatchers.CoroutineDispatchers
import com.michaldrabik.data_local.LocalDataSource
import com.michaldrabik.repository.PeopleRepository
import com.michaldrabik.repository.mappers.Mappers
import com.michaldrabik.repository.movies.MovieDetailsRepository
import com.michaldrabik.repository.movies.ratings.MoviesRatingsRepository
import com.michaldrabik.ui_model.IdTrakt
import com.michaldrabik.ui_model.Movie
import com.michaldrabik.ui_model.Person.Department
import com.elfast.prisma.recommendation.showly.ShowlyMovieMetadata
import com.elfast.prisma.recommendation.showly.ShowlyRatingRecord
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

/**
 * Ranks the existing Showly candidate pool using the user's Trakt rating history.
 *
 * Trakt rating records contain only the movie IDs, score and timestamp, so this use case joins
 * them with Room movie rows and resolves a small bounded set of missing details. TMDB credits
 * are fetched through Showly's existing PeopleRepository, which already caches credits.
 */
@ViewModelScoped
internal class PersonalizedMoviesCase @Inject constructor(
  private val dispatchers: CoroutineDispatchers,
  private val ratingsRepository: MoviesRatingsRepository,
  private val localSource: LocalDataSource,
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

      val ratings = ratingsRepository.loadMoviesRatings()
        .filter { it.rating in 1..10 }
        .sortedByDescending { it.ratedAt }
        .take(MAX_HISTORY_RATINGS)

      if (ratings.isEmpty()) return@withContext coldStart(candidates, excludedIds)

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
      if (ratingPairs.isEmpty()) return@withContext coldStart(candidates, excludedIds)

      val ratedMovies = ratingPairs.map { it.second }.distinctBy { it.traktId }
      val ratedCreditIds = ratedMovies.take(MAX_RATED_CREDIT_MOVIES).mapTo(HashSet()) { it.traktId }
      val ratedMetadata = enrich(ratedMovies, ratedCreditIds).associateBy { it.idTrakt }
      val candidateMetadata = enrich(candidates, candidates.mapTo(HashSet()) { it.traktId })

      val ratingRecords = ratingPairs.mapNotNull { (rating, movie) ->
        ratedMetadata[movie.traktId]?.let { metadata ->
          ShowlyRatingRecord(
            movie = metadata,
            rating = rating.rating,
            ratedAtEpochMillis = rating.ratedAt.toInstant().toEpochMilli(),
          )
        }
      }

      val recommendations = adapter.recommend(
        candidates = candidateMetadata,
        ratings = ratingRecords,
        excludedMovieIds = excludedIds.toSet(),
        limit = candidates.size,
        diversity = DEFAULT_DIVERSITY,
      )
      val candidatesById = candidates.associateBy { it.traktId }
      recommendations.mapNotNull { candidatesById[it.movie.id] }
    }

  private suspend fun coldStart(
    candidates: List<Movie>,
    excludedIds: List<Long>,
  ): List<Movie> {
    val metadata = enrich(candidates, emptySet())
    val recommended = adapter.recommend(
      candidates = metadata,
      ratings = emptyList(),
      excludedMovieIds = excludedIds.toSet(),
      limit = candidates.size,
      diversity = DEFAULT_DIVERSITY,
    )
    val byId = candidates.associateBy { it.traktId }
    return recommended.mapNotNull { byId[it.movie.id] }
  }

  private suspend fun enrich(
    movies: List<Movie>,
    creditIds: Set<Long>,
  ): List<ShowlyMovieMetadata> =
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

            ShowlyMovieMetadata(
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
    const val MAX_PARALLEL_REQUESTS = 4
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

    replacements = [
        (
            "ui-model/src/main/java/com/michaldrabik/ui_model/DiscoverFeed.kt",
            "  RECENT,\n}",
            "  RECENT,\n  PERSONALIZED,\n}",
        ),
        (
            "repository/src/main/java/com/michaldrabik/repository/movies/DiscoverMoviesRepository.kt",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\nimport com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\\n",
        ),
        (
            "repository/src/main/java/com/michaldrabik/repository/movies/DiscoverMoviesRepository.kt",
            "TRENDING, RECENT",
            "TRENDING, RECENT, PERSONALIZED",
            "      TRENDING, RECENT, PERSONALIZED -> loadRemoteTrending(genres, showCollection, collectionSize)",
        ),
        (
            "repository/src/main/java/com/michaldrabik/repository/shows/DiscoverShowsRepository.kt",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\nimport com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\\n",
        ),
        (
            "repository/src/main/java/com/michaldrabik/repository/shows/DiscoverShowsRepository.kt",
            "TRENDING, RECENT",
            "TRENDING, RECENT, PERSONALIZED",
            "      TRENDING, RECENT, PERSONALIZED -> loadRemoteTrending(genres, networks, showCollection, collectionSize)",
        ),
        (
            "ui-discover/src/main/java/com/michaldrabik/ui_discover/filters/views/DiscoverFiltersView.kt",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\nimport com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\\n",
        ),
        (
            "ui-discover/src/main/java/com/michaldrabik/ui_discover/filters/views/DiscoverFiltersView.kt",
            "        RECENT -> context.getString(R.string.textSortNewest)\n",
            "        RECENT -> context.getString(R.string.textSortNewest)\n        PERSONALIZED -> context.getString(R.string.textFeedTrending)\n",
        ),
        (
            "ui-discover/src/main/java/com/michaldrabik/ui_discover/filters/feed/DiscoverFiltersFeedBottomSheet.kt",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\nimport com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\\n",
        ),
        (
            "ui-discover/src/main/java/com/michaldrabik/ui_discover/filters/feed/DiscoverFiltersFeedBottomSheet.kt",
            "      feedChipHot.isChecked = feedOrder == TRENDING",
            "      feedChipHot.isChecked = feedOrder == TRENDING || feedOrder == PERSONALIZED",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/filters/views/DiscoverMoviesFiltersView.kt",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.TRENDING\\nimport com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\\n",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/filters/views/DiscoverMoviesFiltersView.kt",
            "        RECENT -> context.getString(R.string.textSortNewest)\n",
            "        RECENT -> context.getString(R.string.textSortNewest)\n        PERSONALIZED -> context.getString(R.string.textFeedForYou)\n",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/filters/feed/DiscoverMoviesFiltersFeedBottomSheet.kt",
            "import com.michaldrabik.ui_model.DiscoverFeed.POPULAR\n",
            "import com.michaldrabik.ui_model.DiscoverFeed.POPULAR\nimport com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/filters/feed/DiscoverMoviesFiltersFeedBottomSheet.kt",
            "        feedChipTrending.isChecked -> TRENDING\n",
            "        feedChipForYou.isChecked -> PERSONALIZED\n        feedChipTrending.isChecked -> TRENDING\n",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/filters/feed/DiscoverMoviesFiltersFeedBottomSheet.kt",
            "      feedChipTrending.isChecked = feedOrder == TRENDING\n",
            "      feedChipForYou.isChecked = feedOrder == PERSONALIZED\n      feedChipTrending.isChecked = feedOrder == TRENDING\n",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/cases/DiscoverMoviesCase.kt",
            "import com.michaldrabik.ui_model.DiscoverFeed\n",
            "import com.michaldrabik.ui_model.DiscoverFeed\nimport com.michaldrabik.ui_model.DiscoverFeed.PERSONALIZED\n",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/cases/DiscoverMoviesCase.kt",
            "  private val translationsRepository: TranslationsRepository,\n",
            "  private val translationsRepository: TranslationsRepository,\n  private val personalizedMoviesCase: PersonalizedMoviesCase,\n",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/cases/DiscoverMoviesCase.kt",
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
      val ordered = if (filters.feedOrder == PERSONALIZED) {
        personalizedMoviesCase.rank(cached, myMoviesIds + watchlistMoviesIds + hiddenMoviesIds)
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
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/cases/DiscoverMoviesCase.kt",
            """      moviesRepository.discoverMovies.cacheDiscoverMovies(remoteMovies)
      prepareItems(remoteMovies, myIds, watchlistIds, hiddenIds, filters, language)""",
            """      moviesRepository.discoverMovies.cacheDiscoverMovies(remoteMovies)
      val ordered = if (filters.feedOrder == PERSONALIZED) {
        personalizedMoviesCase.rank(remoteMovies, myIds + watchlistIds + hiddenIds)
      } else {
        remoteMovies
      }
      prepareItems(ordered, myIds, watchlistIds, hiddenIds, filters, language)""",
        ),
        (
            "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/filters/feed/DiscoverMoviesFiltersFeedBottomSheet.kt",
            "        feedChipNewest.isChecked -> RECENT\n",
            "        feedChipNewest.isChecked -> RECENT\n",
        ),
        (
            "ui-discover-movies/src/main/res/values/strings.xml",
            "</resources>",
            '  <string name="textFeedForYou">For you</string>\n</resources>',
        ),
        (
            "ui-discover-movies/src/main/res/layout/view_discover_movies_filters_feed.xml",
            '        <com.google.android.material.chip.Chip\\n          android:id="@+id/feedChipNewest"',
            '        <com.google.android.material.chip.Chip\\n          android:id="@+id/feedChipForYou"\\n          style="@style/Widget.Material3.Chip.Suggestion"\\n          android:layout_width="wrap_content"\\n          android:layout_height="wrap_content"\\n          android:text="@string/textFeedForYou"\\n          android:textColor="@color/selector_discover_chip_text"\\n          app:checkedIconTint="@color/selector_discover_chip_text"\\n          app:chipBackgroundColor="@color/selector_discover_chip_background"\\n          app:chipCornerRadius="100dp"\\n          app:chipStrokeColor="@color/selector_discover_chip_text"\\n          app:chipStrokeWidth="1dp"\\n          />\\n\\n        <com.google.android.material.chip.Chip\\n          android:id="@+id/feedChipNewest"',
        ),    ]

    # Ensure the same recommendation module can be used by the discovery feature module.
    module_gradle_path = showly / "ui-discover-movies" / "build.gradle"
    if not module_gradle_path.is_file():
        print(f"Falta {module_gradle_path}", file=sys.stderr)
        return 3
    module_gradle = module_gradle_path.read_text(encoding="utf-8")
    module_dependency = "  implementation project(':prisma-recommendation-engine')"
    if module_dependency not in module_gradle:
        anchor = "  implementation project(':repository')"
        if anchor not in module_gradle:
            print("No se encontró el ancla de repository en ui-discover-movies/build.gradle", file=sys.stderr)
            return 4
        module_gradle = module_gradle.replace(anchor, anchor + "\n" + module_dependency, 1)

    # Plan all source edits before writing anything, so an upstream layout change cannot leave a
    # partially patched checkout.
    planned: dict[Path, str] = {module_gradle_path: module_gradle}
    for relative, old, new in replacements:
        path = showly / relative
        if not path.is_file():
            print(f"Falta el archivo esperado: {relative}", file=sys.stderr)
            return 5
        text = planned.get(path, path.read_text(encoding="utf-8"))
        if new in text:
            planned[path] = text
            continue
        if old not in text:
            print(f"No se encontró el ancla esperada en {relative}. No se escribieron cambios.", file=sys.stderr)
            return 6
        planned[path] = text.replace(old, new, 1)

    personalized_case_path = (
        showly / "ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/cases/PersonalizedMoviesCase.kt"
    )
    if personalized_case_path.exists():
        existing = personalized_case_path.read_text(encoding="utf-8")
        if existing != PERSONALIZED_CASE:
            print(
                "PersonalizedMoviesCase.kt ya existe con contenido distinto; "
                "no se sobrescribió.",
                file=sys.stderr,
            )
            return 7
    else:
        planned[personalized_case_path] = PERSONALIZED_CASE

    for path, content in planned.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    print("Feed 'Para ti' conectado a DiscoverMoviesCase.")
    print("El ranking utiliza valoraciones Trakt, películas Room y créditos TMDB cacheados por Showly.")
    print("Los cambios se aplicaron solo al working tree local del submódulo; no se confirmaron en upstream.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
