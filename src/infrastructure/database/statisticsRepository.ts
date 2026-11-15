import { calculatePersonalStats, type PersonalStats } from "../../domain/statistics";
import { toLocalDateString } from "../../domain/viewingRules";
import { prismaDb } from "./database";

export async function getPersonalStats(today = toLocalDateString(new Date())): Promise<PersonalStats> {
  const viewings = await prismaDb.viewings.toArray();
  const movieIds = [...new Set(viewings.map((viewing) => viewing.movieId))];
  const movies = await prismaDb.movies.bulkGet(movieIds);

  return calculatePersonalStats(
    viewings,
    movies.filter((movie) => movie !== undefined),
    today
  );
}
