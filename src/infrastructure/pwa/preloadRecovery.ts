const RECOVERY_KEY = "prisma:vite-preload-recovery-at";
const RECOVERY_COOLDOWN_MS = 60_000;
const RELOAD_BLOCKERS_SELECTOR =
  '[role="dialog"][aria-modal="true"], form[data-prisma-unsaved="true"], [data-prisma-update-blocked="true"]';

export function hasPendingUserWork(documentLike: Pick<Document, "querySelector"> = document): boolean {
  return Boolean(documentLike.querySelector(RELOAD_BLOCKERS_SELECTOR));
}

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Autoriza una sola recarga ante un fallo de importación dinámica.
 * Si el almacenamiento de sesión no está disponible o ya hubo un intento
 * reciente, deja que React muestre su estado de error en vez de crear un bucle.
 */
export function shouldReloadAfterPreloadError(
  storage: Pick<SessionStorageLike, "getItem" | "setItem">,
  now = Date.now()
): boolean {
  try {
    const previousAttempt = Number(storage.getItem(RECOVERY_KEY));
    if (
      Number.isFinite(previousAttempt)
      && previousAttempt > 0
      && now - previousAttempt < RECOVERY_COOLDOWN_MS
    ) {
      return false;
    }

    storage.setItem(RECOVERY_KEY, String(now));
    return true;
  } catch {
    // Sin sessionStorage no es posible garantizar que una recarga no se repita.
    return false;
  }
}

/** Limpia el límite después de que una pantalla diferida se haya cargado bien. */
export function clearPreloadRecoveryFlag(
  storage?: Pick<SessionStorageLike, "removeItem">
): void {
  try {
    (storage ?? window.sessionStorage).removeItem(RECOVERY_KEY);
  } catch {
    // La recuperación nunca debe impedir que se abra una pantalla.
  }
}

export function installVitePreloadRecovery(target: Window = window): () => void {
  const handlePreloadError = (event: Event) => {
    let storage: Storage;
    try {
      storage = target.sessionStorage;
    } catch {
      return;
    }

    // Una pestaña con cambios no guardados debe mostrar el error de la ruta,
    // no perder su formulario por una recarga de recuperación automática.
    if (hasPendingUserWork(target.document)) return;
    if (!shouldReloadAfterPreloadError(storage)) return;

    event.preventDefault();
    target.location.reload();
  };

  target.addEventListener("vite:preloadError", handlePreloadError);
  return () => target.removeEventListener("vite:preloadError", handlePreloadError);
}
