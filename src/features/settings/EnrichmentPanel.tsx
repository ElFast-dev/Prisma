import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  LoaderCircle,
  Pause,
  Play,
  RefreshCw,
  Wifi
} from "lucide-react";
import { getTmdbAccessToken } from "../../infrastructure/tmdb/settings";
import {
  getEnrichmentSnapshot,
  pauseEnrichmentQueue,
  startEnrichmentQueue,
  subscribeEnrichmentQueue,
  type EnrichmentSnapshot
} from "../../infrastructure/database/enrichmentService";

const EMPTY_SNAPSHOT: EnrichmentSnapshot = {
  status: "idle",
  totalMovies: 0,
  completedMovies: 0,
  pendingMovies: 0,
  errorMovies: 0,
  notFoundMovies: 0,
  progressPercent: 100,
  isOnline: typeof navigator === "undefined" || navigator.onLine
};

interface EnrichmentPanelProps {
  configured: boolean;
}

function statusLabel(snapshot: EnrichmentSnapshot): string {
  switch (snapshot.status) {
    case "running":
      return snapshot.currentTitle
        ? "Actualizando: " + snapshot.currentTitle
        : "Enriqueciendo la Biblioteca";
    case "waiting-connection":
      return "En pausa hasta recuperar la conexión";
    case "paused":
      return "Proceso pausado";
    case "completed":
      return snapshot.errorMovies
        ? "Proceso finalizado; quedan películas con errores"
        : "Biblioteca actualizada";
    default:
      return snapshot.pendingMovies
        ? "Hay películas listas para completar"
        : "No hay películas pendientes de actualización";
  }
}

export function EnrichmentPanel({ configured }: EnrichmentPanelProps) {
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [actionError, setActionError] = useState("");
  const snapshotRef = useRef(snapshot);
  const resumeAfterConnection = useRef(false);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    let mounted = true;
    const update = (value: EnrichmentSnapshot) => {
      if (!mounted) return;
      snapshotRef.current = value;
      setSnapshot(value);
    };
    const unsubscribe = subscribeEnrichmentQueue(update);

    const onOffline = () => {
      if (snapshotRef.current.status === "running") {
        resumeAfterConnection.current = true;
        void pauseEnrichmentQueue(true);
      }
      void getEnrichmentSnapshot().then(update);
    };

    const onOnline = () => {
      void getEnrichmentSnapshot().then((value) => {
        update(value);
        if (resumeAfterConnection.current && getTmdbAccessToken()) {
          resumeAfterConnection.current = false;
          void startEnrichmentQueue(getTmdbAccessToken());
        }
      });
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    void getEnrichmentSnapshot().then((value) => {
      update(value);
      if (
        (value.status === "running" || value.status === "waiting-connection")
        && getTmdbAccessToken()
      ) {
        resumeAfterConnection.current = true;
        if (navigator.onLine) {
          resumeAfterConnection.current = false;
          void startEnrichmentQueue(getTmdbAccessToken());
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  async function handleStart() {
    setActionError("");
    const token = getTmdbAccessToken();
    if (!token) {
      setActionError("Primero configura y prueba tu credencial TMDB arriba.");
      return;
    }
    if (!navigator.onLine) {
      setActionError("Necesitas conexión para consultar TMDB. El progreso guardado no se perderá.");
      return;
    }
    resumeAfterConnection.current = true;
    try {
      await startEnrichmentQueue(token);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo iniciar el enriquecimiento.");
    }
  }

  async function handlePause() {
    resumeAfterConnection.current = false;
    await pauseEnrichmentQueue(false);
  }

  const isRunning = snapshot.status === "running";
  const hasWork = snapshot.pendingMovies > 0 || snapshot.errorMovies > 0;
  const buttonLabel = snapshot.status === "paused"
    ? "Continuar"
    : snapshot.status === "completed" && snapshot.errorMovies > 0
      ? "Reintentar errores"
      : "Iniciar enriquecimiento";

  return (
    <section className="settings-section card-surface enrichment-panel" aria-labelledby="enrichment-heading">
      <div className="settings-section-heading">
        <div className="settings-icon"><RefreshCw size={21} /></div>
        <div>
          <h2 id="enrichment-heading">Enriquecer Biblioteca</h2>
          <p className="muted-copy">Completa la información cinematográfica guardada en este dispositivo.</p>
        </div>
      </div>

      <div className="enrichment-connection" role="status">
        {snapshot.isOnline ? <Wifi size={16} /> : <CloudOff size={16} />}
        <span>{snapshot.isOnline ? "Con conexión" : "Sin conexión"}</span>
        <span className="enrichment-connection-separator">·</span>
        <span>{statusLabel(snapshot)}</span>
      </div>

      <div className="enrichment-progress-heading">
        <span>{snapshot.pendingMovies + snapshot.errorMovies} por actualizar · Progreso del catálogo</span>
        <strong>{snapshot.progressPercent}%</strong>
      </div>
      <div
        className="enrichment-progress"
        role="progressbar"
        aria-label="Progreso de enriquecimiento de la Biblioteca"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={snapshot.progressPercent}
      >
        <span style={{ width: snapshot.progressPercent + "%" }} />
      </div>

      <div className="enrichment-metrics">
        <div><strong>{snapshot.totalMovies}</strong><span>En Biblioteca</span></div>
        <div><strong>{snapshot.completedMovies}</strong><span>Actualizadas</span></div>
        <div><strong>{snapshot.pendingMovies}</strong><span>Pendientes</span></div>
        <div><strong>{snapshot.errorMovies}</strong><span>Errores</span></div>
      </div>

      {snapshot.notFoundMovies > 0 && (
        <p className="enrichment-note">
          {snapshot.notFoundMovies} película(s) no aparecen en TMDB (404) y no se volverán a consultar automáticamente.
        </p>
      )}
      {snapshot.lastError && <p className="enrichment-error" role="alert">{snapshot.lastError}</p>}
      {actionError && <p className="enrichment-error" role="alert">{actionError}</p>}

      {isRunning ? (
        <button className="button button-secondary button-full" type="button" onClick={() => void handlePause()}>
          <Pause size={17} /> Pausar proceso
        </button>
      ) : (
        <button
          className="button button-primary button-full"
          type="button"
          onClick={() => void handleStart()}
          disabled={!configured || !snapshot.isOnline || !hasWork}
        >
          {snapshot.status === "waiting-connection" && !snapshot.isOnline
            ? <CloudOff size={17} />
            : snapshot.status === "paused" || (snapshot.status === "completed" && snapshot.errorMovies > 0)
              ? <Play size={17} />
              : <RefreshCw size={17} />}
          {buttonLabel}
        </button>
      )}

      {snapshot.status === "running" && (
        <p className="enrichment-note"><LoaderCircle className="enrichment-spinner" size={14} /> Se procesa una película a la vez. Puedes pausar y continuar más tarde.</p>
      )}
      {snapshot.status === "completed" && !snapshot.pendingMovies && !snapshot.errorMovies && (
        <p className="enrichment-success"><CheckCircle2 size={15} /> No quedan películas pendientes de enriquecimiento.</p>
      )}
      {!configured && <p className="enrichment-note"><AlertCircle size={15} /> Configura tu credencial TMDB para iniciar este proceso.</p>}
      <p className="enrichment-footnote">Solo se actualizan metadatos de películas. Tus estados, favoritos, visionados, fechas, calificaciones, comentarios y colecciones permanecen intactos.</p>
    </section>
  );
}
