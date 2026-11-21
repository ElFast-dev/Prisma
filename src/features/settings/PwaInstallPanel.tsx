import { useEffect, useState } from "react";
import { CheckCircle2, Download, Smartphone } from "lucide-react";
import {
  getPwaInstallState,
  promptPwaInstall,
  subscribeToPwaInstallState,
  type PwaInstallState
} from "../../infrastructure/pwa/installPrompt";

function isAppleMobileDevice(): boolean {
  const userAgent = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function PwaInstallPanel() {
  const [state, setState] = useState<PwaInstallState>(() => getPwaInstallState());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => subscribeToPwaInstallState(setState), []);

  async function handleInstall() {
    if (!state.canPrompt || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const outcome = await promptPwaInstall();
      if (outcome === "accepted") {
        setMessage("El navegador aceptó la instalación de Prisma.");
      } else if (outcome === "dismissed") {
        setMessage("No se instaló Prisma. Puedes seguir utilizándola en el navegador.");
      } else {
        setMessage("El navegador no tiene disponible el diálogo de instalación en este momento.");
      }
    } catch {
      setMessage("No se pudo abrir la instalación. Puedes añadir Prisma desde el menú del navegador.");
    } finally {
      setBusy(false);
    }
  }

  const instructions = isAppleMobileDevice()
    ? "En iPhone o iPad, abre Compartir y selecciona «Añadir a pantalla de inicio»."
    : "Abre el menú del navegador y busca «Instalar aplicación» o «Añadir a pantalla de inicio».";

  return (
    <section className="settings-section card-surface pwa-install-card" aria-label="Instalación de Prisma">
      <div className="settings-section-heading">
        <div className="settings-icon"><Smartphone size={21} /></div>
        <div>
          <h2>Instalar Prisma</h2>
          <p className="muted-copy">Añade Prisma a la pantalla de inicio para abrirla como una aplicación.</p>
        </div>
      </div>

      {state.installed ? (
        <div className="pwa-install-status" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>Prisma ya está instalada en este dispositivo.</span>
        </div>
      ) : (
        <>
          {state.canPrompt && (
            <button className="button button-primary button-full" type="button"
              onClick={() => void handleInstall()} disabled={busy}>
              <Download size={17} />
              {busy ? "Abriendo instalación…" : "Instalar Prisma"}
            </button>
          )}
          <p className="pwa-install-instructions">{instructions}</p>
        </>
      )}
      {message && <p className="pwa-install-feedback" role="status">{message}</p>}
    </section>
  );
}
