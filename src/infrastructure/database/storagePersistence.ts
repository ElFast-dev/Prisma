export interface BrowserStorageStatus {
  supported: boolean;
  canRequest: boolean;
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
}

/** Lee el almacenamiento web sin modificarlo ni solicitar permisos. */
export async function getBrowserStorageStatus(): Promise<BrowserStorageStatus> {
  if (typeof navigator === "undefined" || !navigator.storage) {
    return { supported: false, canRequest: false, persisted: null, usage: null, quota: null };
  }
  const storage = navigator.storage;
  const [persisted, estimate] = await Promise.all([
    typeof storage.persisted === "function" ? storage.persisted().catch(() => null) : Promise.resolve(null),
    typeof storage.estimate === "function" ? storage.estimate().catch(() => null) : Promise.resolve(null)
  ]);
  return {
    supported: true,
    canRequest: typeof storage.persist === "function",
    persisted,
    usage: typeof estimate?.usage === "number" ? estimate.usage : null,
    quota: typeof estimate?.quota === "number" ? estimate.quota : null
  };
}

/** Solo solicita persistencia cuando la persona activa esta acción desde Ajustes. */
export async function requestBrowserStoragePersistence(): Promise<boolean | null> {
  if (typeof navigator === "undefined" || !navigator.storage
    || typeof navigator.storage.persist !== "function") return null;
  return navigator.storage.persist();
}
