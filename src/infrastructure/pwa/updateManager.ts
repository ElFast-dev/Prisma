export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

export interface PwaUpdateSnapshot {
  available: boolean;
  applying: boolean;
  dismissed: boolean;
  reloadRequired: boolean;
  error?: string;
}

export interface PwaUpdateManager {
  setUpdateService: (service: UpdateServiceWorker) => void;
  notifyUpdateAvailable: () => void;
  notifyReloadRequired: () => void;
  getSnapshot: () => PwaUpdateSnapshot;
  subscribe: (listener: () => void) => () => void;
  dismiss: () => void;
  apply: () => Promise<void>;
}

const INITIAL_SNAPSHOT: PwaUpdateSnapshot = {
  available: false,
  applying: false,
  dismissed: false,
  reloadRequired: false
};

/** Estado observable de actualización, independiente de la interfaz React. */
export function createPwaUpdateManager(): PwaUpdateManager {
  let updateService: UpdateServiceWorker | null = null;
  let snapshot = INITIAL_SNAPSHOT;
  const listeners = new Set<() => void>();

  const publish = (next: PwaUpdateSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  return {
    setUpdateService(service) {
      updateService = service;
    },
    notifyUpdateAvailable() {
      publish({ available: true, applying: false, dismissed: false, reloadRequired: false });
    },
    notifyReloadRequired() {
      // Workbox llama onNeedReload en cada pestaña controlada por el nuevo SW.
      // Nunca delegamos esta recarga a su comportamiento predeterminado.
      publish({ available: false, applying: false, dismissed: false, reloadRequired: true });
    },
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dismiss() {
      if (!snapshot.available || snapshot.applying) return;
      publish({ ...snapshot, dismissed: true });
    },
    async apply() {
      if (!snapshot.available || snapshot.applying) return;
      if (!updateService) {
        publish({
          ...snapshot,
          error: "No se pudo preparar la actualización. Puedes seguir usando Prisma."
        });
        return;
      }

      publish({ ...snapshot, applying: true, error: undefined });
      try {
        // vite-plugin-pwa envía el mensaje skipWaiting. onNeedReload notifica a cada pestaña;
        // la recarga real requiere confirmación de forma independiente.
        await updateService(true);
      } catch {
        publish({
          ...snapshot,
          applying: false,
          error: "No se pudo aplicar la actualización. Prisma seguirá funcionando con la versión actual."
        });
      }
    }
  };
}

export const pwaUpdateManager = createPwaUpdateManager();
