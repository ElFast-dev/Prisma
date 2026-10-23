/** Synthetic-only fixture for reproducible browser regression tests; it never reads personal files. */
export function makeLabSyntheticFixture() {
  const rated = [];
  const catalog = [];
  const genreNames = ["Drama", "Ciencia ficción", "Misterio", "Suspenso", "Fantasía", "Comedia", "Aventura"];
  for (let index = 0; index < 351; index += 1) {
    const id = String(700000 + index);
    const year = 1975 + (index % 49);
    const genres = [genreNames[index % genreNames.length], genreNames[(index * 3 + 2) % genreNames.length]];
    const tags = ["concepto " + (index % 19), "estructura " + (index % 13), "secreto " + (index % 11)];
    const common = {
      id: id,
      tmdbId: id,
      tmId: id,
      title: "Synthetic Film " + String(index).padStart(3, "0"),
      year: year,
      releaseDate: year + "-02-14",
      genres: genres,
      tags: tags,
      overview: "Una investigadora descubre una idea oculta tras varias pistas. " +
        "El misterio cambia de sentido cuando aparecen nuevas pruebas. ".repeat(3),
      cast: ["Actor Sintético " + (index % 37), "Actor Secundario " + (index % 23)],
      directors: ["Directora Sintética " + (index % 17)],
      writers: ["Guionista Sintético " + (index % 15)],
      composers: ["Compositor Sintético " + (index % 9)],
      productionCompanies: ["Estudio Sintético " + (index % 8)],
      productionCountries: ["United States"],
      spokenLanguages: ["English"],
      originalLanguage: "en",
      runtime: 85 + (index % 8) * 7,
      source: "synthetic-test"
    };
    const rating = 1 + ((index * 7 + Math.floor(index / 7)) % 10);
    rated.push({
      id: "rating-" + id,
      tmdbId: id,
      tmId: id,
      title: common.title,
      year: year,
      rating: rating,
      genres: genres.slice(),
      tags: tags.slice(),
      overview: common.overview,
      cast: common.cast.slice(),
      directors: common.directors.slice(),
      writers: common.writers.slice(),
      composers: common.composers.slice(),
      productionCompanies: common.productionCompanies.slice(),
      productionCountries: common.productionCountries.slice(),
      spokenLanguages: common.spokenLanguages.slice(),
      originalLanguage: common.originalLanguage,
      runtime: common.runtime,
      source: "synthetic-test"
    });
    catalog.push(common);
  }
  for (let index = 0; index < 40; index += 1) {
    const id = String(800000 + index);
    const year = 1990 + index % 30;
    const genres = [genreNames[(index * 2 + 1) % genreNames.length], genreNames[(index * 5 + 3) % genreNames.length]];
    catalog.push({
      id: id,
      tmdbId: id,
      tmId: id,
      title: "Synthetic Discovery Candidate " + String(index).padStart(2, "0"),
      year: year,
      releaseDate: year + "-06-20",
      genres: genres,
      tags: ["candidata " + (index % 12), "paradoja " + (index % 10)],
      overview: "Una premisa original presenta pistas verificables y una revelación inesperada.",
      cast: ["Reparto Candidato " + (index % 20)],
      directors: ["Dirección Candidata " + (index % 10)],
      writers: ["Guion Candidato " + (index % 8)],
      productionCompanies: ["Estudio Candidato " + (index % 5)],
      productionCountries: ["United Kingdom"],
      spokenLanguages: ["English"],
      originalLanguage: "en",
      runtime: 91 + index % 50,
      source: "synthetic-test"
    });
  }
  return {
    state: {
      version: 2,
      rated,
      watched: [],
      watchlist: [],
      hidden: [],
      events: [],
      updatedAt: "2026-10-23T18:00:00.000Z",
      importedAt: "2026-10-23T18:00:00.000Z",
      confirmedWatchStreak: null
    },
    catalog
  };
}

export async function seedLabSyntheticProfile(page, fixture) {
  await page.evaluate(({ state, catalog }) => new Promise((resolve, reject) => {
    const request = indexedDB.open("prisma-local-v1", 1);
    request.onerror = () => reject(request.error || new Error("synthetic fixture database open failed"));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv", { keyPath: "key" });
    };
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("kv")) {
        database.close();
        reject(new Error("Prisma storage schema was not initialized"));
        return;
      }
      const transaction = database.transaction("kv", "readwrite");
      const store = transaction.objectStore("kv");
      store.put({ key: "state", value: state });
      store.put({ key: "catalogCustom", value: catalog });
      transaction.oncomplete = () => { database.close(); resolve(true); };
      transaction.onerror = () => { database.close(); reject(transaction.error || new Error("synthetic fixture write failed")); };
      transaction.onabort = () => { database.close(); reject(transaction.error || new Error("synthetic fixture write aborted")); };
    };
  }), fixture);
}
