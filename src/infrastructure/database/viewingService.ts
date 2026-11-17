import { z } from "zod";
import type { LibraryEntry, LibraryStatus, Viewing } from "../../domain/types";
import { validateViewingDraft, type ViewingDraft } from "../../domain/viewingRules";
import { prismaDb } from "./database";
import { requestAutomaticEnrichment } from "./enrichmentService";
import { startSpectroMetadataEnrichment } from "./spectroMetadataService";

const viewingSchema = z.object({
  movieId: z.string().min(1),
  watchedOn: z.string(),
  rating: z.number().int().min(1).max(10).optional(),
  watchedAtLocalTime: z.string().optional(),
  timeZone: z.string().optional(),
  review: z.string().max(10000).optional()
});

export interface LibraryStatusUndoToken {
  movieId: string;
  hadEntry: boolean;
  previousStatus?: LibraryStatus;
  previousIsFavorite?: boolean;
  appliedAt: string;
}

export async function addViewing(
  input: ViewingDraft,
  operationId = crypto.randomUUID()
): Promise<Viewing> {
  const parsed = viewingSchema.parse(input);
  const draft = validateViewingDraft(parsed);

  const viewing = await prismaDb.transaction(
    "rw",
    prismaDb.movies,
    prismaDb.libraryEntries,
    prismaDb.viewings,
    async () => {
      const duplicate = await prismaDb.viewings.where("operationId").equals(operationId).first();
      if (duplicate) return duplicate;

      const movie = await prismaDb.movies.get(draft.movieId);
      if (!movie) throw new Error("La película no existe en la base de datos local.");

      const sequenceNumber = movie.lastViewingSequence + 1;
      const now = new Date().toISOString();

      const viewing: Viewing = {
        id: crypto.randomUUID(),
        movieId: draft.movieId,
        sequenceNumber,
        watchedOn: draft.watchedOn,
        watchedAtLocalTime: draft.watchedAtLocalTime,
        timeZone: draft.timeZone,
        rating: draft.rating,
        review: draft.review,
        createdAt: now,
        updatedAt: now,
        operationId
      };

      await prismaDb.viewings.add(viewing);
      await prismaDb.movies.update(movie.id, { lastViewingSequence: sequenceNumber, updatedAt: now });

      const entry = await prismaDb.libraryEntries.get(movie.id);
      if (entry) {
        await prismaDb.libraryEntries.update(movie.id, { status: "watched", updatedAt: now });
      } else {
        const newEntry: LibraryEntry = {
          movieId: movie.id,
          status: "watched",
          isFavorite: false,
          addedAt: now,
          updatedAt: now
        };
        await prismaDb.libraryEntries.add(newEntry);
      }

      return viewing;
    }
  );
  requestAutomaticEnrichment();
  void startSpectroMetadataEnrichment().catch(() => undefined);
  return viewing;
}

export async function moveMovieToPending(movieId: string): Promise<LibraryStatusUndoToken | null> {
  const result = await prismaDb.transaction("rw", prismaDb.movies, prismaDb.libraryEntries, async () => {
    const movie = await prismaDb.movies.get(movieId);
    if (!movie) throw new Error("La película no existe en la base de datos local.");

    const current = await prismaDb.libraryEntries.get(movieId);
    if (current?.status === "pending") return null;

    const appliedAt = new Date().toISOString();

    if (!current) {
      await prismaDb.libraryEntries.add({
        movieId,
        status: "pending",
        isFavorite: false,
        addedAt: appliedAt,
        updatedAt: appliedAt
      });
      return { movieId, hadEntry: false, appliedAt };
    }

    await prismaDb.libraryEntries.update(movieId, { status: "pending", updatedAt: appliedAt });
    return {
      movieId,
      hadEntry: true,
      previousStatus: current.status,
      previousIsFavorite: current.isFavorite,
      appliedAt
    };
  });
  if (result) {
    requestAutomaticEnrichment();
    void startSpectroMetadataEnrichment().catch(() => undefined);
  }
  return result;
}

export async function removeMovieFromPending(movieId: string): Promise<boolean> {
  return prismaDb.transaction("rw", prismaDb.libraryEntries, async () => {
    const current = await prismaDb.libraryEntries.get(movieId);
    if (!current || current.status !== "pending") return false;

    if (current.isFavorite) {
      await prismaDb.libraryEntries.update(movieId, {
        status: undefined,
        updatedAt: new Date().toISOString()
      });
    } else {
      await prismaDb.libraryEntries.delete(movieId);
    }
    return true;
  });
}

export async function undoMoveToPending(token: LibraryStatusUndoToken): Promise<void> {
  await prismaDb.transaction("rw", prismaDb.libraryEntries, async () => {
    const current = await prismaDb.libraryEntries.get(token.movieId);

    if (!current || current.updatedAt !== token.appliedAt || current.status !== "pending") {
      throw new Error("No se puede deshacer: la clasificación cambió después de esta acción.");
    }

    if (!token.hadEntry) {
      await prismaDb.libraryEntries.delete(token.movieId);
      return;
    }

    await prismaDb.libraryEntries.update(token.movieId, {
      status: token.previousStatus,
      isFavorite: token.previousIsFavorite ?? false,
      updatedAt: new Date().toISOString()
    });
  });
}

export async function updateViewing(
  viewingId: string,
  changes: Pick<ViewingDraft, "watchedOn"> & Partial<Omit<ViewingDraft, "movieId" | "watchedOn">>
): Promise<void> {
  await prismaDb.transaction("rw", prismaDb.viewings, async () => {
    const current = await prismaDb.viewings.get(viewingId);
    if (!current) throw new Error("No se encontró el visionado.");

    const validated = validateViewingDraft({
      movieId: current.movieId,
      watchedOn: changes.watchedOn,
      rating: Object.prototype.hasOwnProperty.call(changes, "rating") ? changes.rating : current.rating,
      watchedAtLocalTime: changes.watchedAtLocalTime !== undefined ? changes.watchedAtLocalTime : current.watchedAtLocalTime,
      timeZone: changes.timeZone ?? current.timeZone,
      review: changes.review !== undefined ? changes.review : current.review
    });

    await prismaDb.viewings.update(viewingId, {
      watchedOn: validated.watchedOn,
      rating: validated.rating,
      watchedAtLocalTime: validated.watchedAtLocalTime,
      timeZone: validated.timeZone,
      review: validated.review,
      updatedAt: new Date().toISOString()
    });
  });
}

export async function deleteViewing(viewingId: string): Promise<void> {
  await prismaDb.transaction("rw", prismaDb.viewings, prismaDb.libraryEntries, async () => {
    const viewing = await prismaDb.viewings.get(viewingId);
    if (!viewing) return;

    await prismaDb.viewings.delete(viewingId);
    const remaining = await prismaDb.viewings.where("movieId").equals(viewing.movieId).count();

    if (remaining === 0) {
      const entry = await prismaDb.libraryEntries.get(viewing.movieId);
      if (entry?.status === "watched") {
        if (entry.isFavorite) {
          await prismaDb.libraryEntries.update(viewing.movieId, {
            status: undefined,
            updatedAt: new Date().toISOString()
          });
        } else {
          await prismaDb.libraryEntries.delete(viewing.movieId);
        }
      }
    }
  });
}
