import { Workbox } from "@vite-pwa/workbox-window";
import { pwaUpdateManager } from "./updateManager";

let registrationStarted = false;

/**
 * Registra el Service Worker de producción y conecta su ciclo de vida con el
 * aviso de actualización. La primera instalación puede tomar control; una
 * versión posterior permanece en espera hasta que la persona la acepta.
 */
export async function registerPrismaServiceWorker(): Promise<void> {
  if (
    registrationStarted
    || import.meta.env.DEV
    || typeof window === "undefined"
    || !("serviceWorker" in navigator)
  ) {
    return;
  }

  registrationStarted = true;

  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const workerUrl = new URL("sw.js", baseUrl);
  const workbox = new Workbox(workerUrl.href, {
    scope: baseUrl.pathname,
    type: "classic"
  });

  workbox.addEventListener("waiting", (event) => {
    if (event.isUpdate) {
      pwaUpdateManager.notifyUpdateAvailable();
    }
  });

  workbox.addEventListener("controlling", (event) => {
    if (event.isUpdate) {
      pwaUpdateManager.notifyReloadRequired();
    }
  });

  pwaUpdateManager.setUpdateService(async () => {
    workbox.messageSkipWaiting();
  });

  try {
    await workbox.register({ immediate: true });
  } catch (error) {
    registrationStarted = false;
    console.warn("[Prisma] No se pudo registrar el Service Worker.", error);
  }
}
