import { useState, useSyncExternalStore } from "react";
import { Download, X } from "lucide-react";
import { pwaUpdateManager } from "../infrastructure/pwa/updateManager";

export function PwaUpdateNotice() {
  const snapshot = useSyncExternalStore(
    pwaUpdateManager.subscribe,
    pwaUpdateManager.getSnapshot,
    pwaUpdateManager.getSnapshot
  );
  const [dialogWarning, setDialogWarning] = useState(false);

  if (!snapshot.available || snapshot.dismissed) return null;

  async function handleApply() {
    // No se permite recargar mientras haya una hoja o diálogo abierto:
    // algunos formularios mantienen cambios sin guardar en memoria.
    if (document.querySelector('[role="dialog"][aria-modal="true"], form[data-prisma-unsaved="true"]')) {
      setDialogWarning(true);
      return;
    }

    setDialogWarning(false);
    await pwaUpdateManager.apply();
  }

  return (
    <aside className="pwa-update-notice" aria-label="Actualización de Prisma" role="status" aria-live="polite">
      <div className="pwa-update-copy">
        <strong>Hay una actualización disponible</strong>
        <span>Guarda los cambios pendientes antes de actualizar Prisma.</span>
        {dialogWarning && (
          <span className="pwa-update-warning" role="alert">
            Guarda y cierra primero el formulario abierto o guarda los cambios de conexión.
          </span>
        )}
        {snapshot.error && <span className="pwa-update-warning" role="alert">{snapshot.error}</span>}
      </div>
      <div className="pwa-update-actions">
        <button className="button button-primary" type="button"
          onClick={() => void handleApply()} disabled={snapshot.applying}>
          <Download size={15} />
          {snapshot.applying ? "Actualizando…" : "Actualizar Prisma"}
        </button>
        <button className="button button-secondary" type="button"
          onClick={pwaUpdateManager.dismiss} disabled={snapshot.applying}>
          <X size={15} /> Más tarde
        </button>
      </div>
    </aside>
  );
}
