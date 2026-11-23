import { prismaDb } from "./database";

export type DatabaseBlockedListener = () => void;

const blockedListeners = new Set<DatabaseBlockedListener>();
let upgradeBlocked = false;

// Dexie emite este evento si otra pestaña mantiene abierta una versión anterior
// de la base y bloquea una actualización de esquema.
prismaDb.on("blocked", () => {
  upgradeBlocked = true;
  blockedListeners.forEach((listener) => listener());
});

/** Permite probar la coordinación de apertura sin tocar IndexedDB real. */
export function createDatabaseOpener(
  openDatabase: () => Promise<unknown>,
  isOpen: () => boolean
): () => Promise<void> {
  let opening: Promise<void> | null = null;

  return () => {
    if (isOpen()) return Promise.resolve();
    if (opening) return opening;

    let openResult: Promise<unknown>;
    try {
      openResult = openDatabase();
    } catch (error) {
      openResult = Promise.reject(error);
    }
    const operation = openResult.then(() => undefined);

    opening = operation;
    const clearPending = () => {
      if (opening === operation) opening = null;
    };
    void operation.then(clearPending, clearPending);
    return operation;
  };
}

const openDatabase = createDatabaseOpener(
  () => prismaDb.open(),
  () => prismaDb.isOpen()
);

/** Abre una sola vez, comparte intentos simultáneos y permite reintentar si falla. */
export function openPrismaDatabase(): Promise<void> {
  upgradeBlocked = false;
  return openDatabase();
}

export function isDatabaseUpgradeBlocked(): boolean {
  return upgradeBlocked;
}

export function subscribeToDatabaseBlocked(listener: DatabaseBlockedListener): () => void {
  blockedListeners.add(listener);
  return () => blockedListeners.delete(listener);
}
