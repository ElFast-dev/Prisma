import { useState, useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";
import { pwaUpdateManager } from "../infrastructure/pwa/updateManager";
import { hasPendingUserWork } from "../infrastructure/pwa/preloadRecovery";

export function PwaUpdateNotice() {
  const snapshot = useSyncExternalStore(
    pwaUpdateManager.subscribe,
    pwaUpdateManager.getSnapshot,
    pwaUpdateManager.getSnapshot
  );
  const [dialogWarning, setDialogWarning] = useState(false);

  if ((!snapshot.available && !snapshot.reloadRequired) || snapshot.dismissed) return null;

  function canSafelyReload(): boolean {
    if (hasPendingUserWork(document)) {
      setDialogWarning(true);
      return false;
    }
    setDialogWarning(false);
    return true;
  }

  async function handleApply() {
    // No se permite recargar mientras haya una hoja o diálogo abierto:
    // algunos formularios mantienen cambios sin guardar en memoria.
    if (!canSafelyReload()) return;
    await pwaUpdateManager.apply();
  }

  function handleReloadThisTab() {
    if (!canSafelyReload()) return;
    window.location.reload();
  }

  return (
    <aside className="pwa-update-notice" aria-label="Actualización de Prisma" role="status" aria-live="polite">
      <div className="pwa-update-copy">
        <strong>{snapshot.reloadRequired ? "Actualización instalada" : "Hay una actualización disponible"}</strong>
        <span>{snapshot.reloadRequired
          ? "Esta pestaña necesita recargarse para utilizar la nueva versión."
          : "Guarda los cambios pendientes antes de instalar la actualización."}</span>
        {dialogWarning && (
          <span className="pwa-update-warning" role="alert">
            Termina o cancela primero el formulario o la operación local que está en curso.
          </span>
        )}
        {snapshot.error && <span className="pwa-update-warning" role="alert">{snapshot.error}</span>}
      </div>
      <div className="pwa-update-actions">
        {snapshot.reloadRequired ? (
          <button className="button button-primary" type="button" onClick={handleReloadThisTab}>
            <Download size={15} /> Recargar esta pestaña
          </button>
        ) : (
          <>
            <button className="button button-primary" type="button"
              onClick={() => void handleApply()} disabled={snapshot.applying}>
              <Download size={15} />
              {snapshot.applying ? "Instalando actualización…" : "Actualizar Prisma"}
            </button>
            <button className="button button-secondary" type="button"
              onClick={pwaUpdateManager.dismiss} disabled={snapshot.applying}>
              <X size={15} /> Más tarde
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
