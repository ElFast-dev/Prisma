import { useEffect, useState } from "react";
import { CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { getLocalDataSummary, type LocalDataSummary } from "../../infrastructure/database/dataManagementService";
import {
  getBrowserStorageStatus,
  requestBrowserStoragePersistence,
  type BrowserStorageStatus
} from "../../infrastructure/database/storagePersistence";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "No disponible";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return value.toLocaleString("es-PA", { maximumFractionDigits: 1 }) + " " + units[unitIndex];
}

function hasLocalData(summary: LocalDataSummary): boolean {
  return summary.movies + summary.libraryEntries + summary.viewings + summary.collections + summary.profile > 0;
}

export function StorageProtectionPanel() {
  const [status, setStatus] = useState<BrowserStorageStatus | null>(null);
  const [summary, setSummary] = useState<LocalDataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([getBrowserStorageStatus(), getLocalDataSummary()])
      .then(([nextStatus, nextSummary]) => {
        if (!active) return;
        setStatus(nextStatus);
        setSummary(nextSummary);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo consultar el almacenamiento local.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function handleRequestPersistence() {
    if (!summary || !hasLocalData(summary) || requesting || status?.persisted === true) return;
    setRequesting(true);
    setMessage("");
    setError("");
    try {
      const granted = await requestBrowserStoragePersistence();
      const refreshed = await getBrowserStorageStatus();
      setStatus(refreshed);
      if (granted === true) {
        setMessage("El navegador concedió almacenamiento persistente. Esto reduce el riesgo de limpieza automática, pero no sustituye una copia de seguridad.");
      } else if (granted === false) {
        setMessage("El navegador no concedió almacenamiento persistente. Prisma seguirá funcionando; conserva una copia de seguridad para proteger tu Biblioteca.");
      } else {
        setMessage("Este navegador no permite solicitar almacenamiento persistente. Conserva una copia de seguridad para proteger tu Biblioteca.");
      }
    } catch {
      setError("No se pudo solicitar la protección del almacenamiento. Puedes seguir usando Prisma y crear una copia de seguridad.");
    } finally {
      setRequesting(false);
    }
  }

  const containsData = summary ? hasLocalData(summary) : false;
  const showEstimate = status && (status.usage !== null || status.quota !== null);

  return (
    <section className="settings-section card-surface storage-protection-card" aria-labelledby="storage-protection-title">
      <div className="settings-section-heading">
        <div className="settings-icon"><ShieldCheck size={21} /></div>
        <div>
          <h2 id="storage-protection-title">Protección de datos locales</h2>
          <p className="muted-copy">Reduce el riesgo de que el navegador elimine tu Biblioteca para liberar espacio.</p>
        </div>
      </div>
      {loading ? (
        <p className="muted-copy" role="status">Consultando el almacenamiento de este dispositivo…</p>
      ) : status?.supported ? (
        <>
          <div className="storage-protection-status">
            {status.persisted === true
              ? <CheckCircle2 size={18} className="storage-protection-icon is-protected" aria-hidden="true" />
              : <Database size={18} className="storage-protection-icon" aria-hidden="true" />}
            <p role="status">
              {status.persisted === true
                ? "El navegador ya protege el almacenamiento de Prisma frente a la limpieza automática."
                : containsData
                  ? "El almacenamiento todavía no tiene protección persistente. Puedes solicitarla al navegador."
                  : "Cuando guardes películas o visionados, podrás solicitar protección adicional para esos datos."}
            </p>
          </div>
          {showEstimate && (
            <p className="storage-estimate">
              Uso estimado: {status.usage === null ? "No disponible" : formatBytes(status.usage)}
              {status.quota === null ? "" : " de " + formatBytes(status.quota)}
            </p>
          )}
          {containsData && status.persisted !== true && status.canRequest && (
            <button className="button button-secondary button-full" type="button"
              onClick={() => void handleRequestPersistence()} disabled={requesting}>
              <ShieldCheck size={16} />
              {requesting ? "Solicitando protección…" : "Solicitar protección del almacenamiento"}
            </button>
          )}
          {containsData && status.persisted !== true && !status.canRequest && (
            <p className="muted-copy">Este navegador no ofrece la solicitud de almacenamiento persistente.</p>
          )}
        </>
      ) : (
        <p className="muted-copy" role="status">
          Este navegador no informa sobre almacenamiento persistente. Prisma seguirá guardando los datos localmente; realiza copias de seguridad periódicas.
        </p>
      )}
      {message && <p className="storage-protection-feedback" role="status">{message}</p>}
      {error && <p className="connection-message is-error" role="alert">{error}</p>}
      <p className="settings-security-note">
        La decisión depende del navegador. Incluso con persistencia concedida, una copia de seguridad descargada sigue siendo la protección más completa.
      </p>
    </section>
  );
}
