import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, CircleAlert, LoaderCircle, Trash2, Download, Upload, ShieldCheck, Grid2X2, List } from "lucide-react";
import {
  clearTmdbAccessToken,
  getCatalogRegion,
  getTmdbAccessToken,
  saveCatalogRegion,
  saveTmdbAccessToken
} from "../../infrastructure/tmdb/settings";
import { testTmdbConnection } from "../../infrastructure/tmdb/TmdbService";
import { createLocalBackup, restoreLocalBackup } from "../../infrastructure/database/backupService";
import { importExternalMovies } from "../../infrastructure/database/externalMovieImportService";
import { parsePrismaBackup } from "../../domain/backup";
import { parseExternalMovieImport } from "../../domain/externalMovieImport";
import { EnrichmentPanel } from "./EnrichmentPanel";
import { navigateBack } from "../../navigation/routeHistory";
import { getUserPreferences, saveLibraryView } from "../../infrastructure/database/preferencesService";

type ConnectionState = "idle" | "testing" | "success" | "error";

export function SettingsPage() {
  const [token, setToken] = useState("");
  const [configured, setConfigured] = useState(false);
  const [visible, setVisible] = useState(false);
  const [region, setRegion] = useState("PA");
  const [state, setState] = useState<ConnectionState>("idle");
  const [message, setMessage] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");
  const [libraryView, setLibraryView] = useState<"list" | "grid">("list");
  const [libraryPreferencesReady, setLibraryPreferencesReady] = useState(false);
  const [libraryPreferencesError, setLibraryPreferencesError] = useState("");

  useEffect(() => {
    const stored = getTmdbAccessToken();
    setToken(stored);
    setConfigured(Boolean(stored));
    setRegion(getCatalogRegion());
  }, []);

  useEffect(() => {
    let active = true;
    void getUserPreferences()
      .then((preferences) => {
        if (!active) return;
        setLibraryView(preferences.libraryView);
      })
      .catch(() => {
        if (active) setLibraryPreferencesError("No se pudieron leer las preferencias locales de Biblioteca.");
      })
      .finally(() => {
        if (active) setLibraryPreferencesReady(true);
      });
    return () => { active = false; };
  }, []);

  function handleLibraryViewChange(nextView: "list" | "grid") {
    setLibraryView(nextView);
    setLibraryPreferencesError("");
    void saveLibraryView(nextView).catch(() => {
      setLibraryPreferencesError("No se pudo guardar esta preferencia en el dispositivo.");
    });
  }

  async function handleTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) {
      setState("error");
      setMessage("Introduce tu API Read Access Token.");
      return;
    }

    setState("testing");
    setMessage("Comprobando conexión con TMDB...");
    try {
      await testTmdbConnection(token.trim());
      saveTmdbAccessToken(token.trim());
      saveCatalogRegion(region);
      setConfigured(true);
      setState("success");
      setMessage("Conexión correcta. Tu credencial quedó guardada en este navegador.");
    } catch (cause) {
      setState("error");
      setMessage(cause instanceof Error ? cause.message : "No se pudo conectar con TMDB.");
    }
  }

  function handleRemove() {
    if (!window.confirm("¿Eliminar la credencial TMDB guardada en este navegador?")) return;
    clearTmdbAccessToken();
    setToken("");
    setConfigured(false);
    setState("idle");
    setMessage("Credencial eliminada de este navegador.");
  }

  function handleRegionChange(value: string) {
    setRegion(value);
    saveCatalogRegion(value);
  }

  async function handleCreateBackup() {
    setBackupBusy(true);
    setBackupMessage("");
    setBackupError("");
    try {
      const content = await createLocalBackup();
      const file = new Blob([content], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "prisma-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMessage("Copia Prisma creada. Guárdala en un lugar seguro; Prisma no la sube a ningún servidor.");
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : "No se pudo crear la copia de seguridad.");
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleRestoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(".json")) {
      setBackupError("Selecciona un archivo de copia Prisma con extensión .json.");
      setBackupMessage("");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setBackupError("El archivo supera el tamaño máximo permitido de 50 MB.");
      setBackupMessage("");
      return;
    }

    setBackupBusy(true);
    setBackupError("");
    setBackupMessage("");
    try {
      const backup = parsePrismaBackup(await file.text());
      const { data } = backup;
      const confirmed = window.confirm(
        "Se restaurarán " + data.movies.length + " películas, "
        + data.viewings.length + " visionados y " + data.collections.length
        + " colecciones. Esto reemplazará la biblioteca y los datos personales actuales de este dispositivo. "
        + "La credencial TMDB no está en el archivo y no se modificará. ¿Continuar?"
      );
      if (!confirmed) {
        setBackupMessage("Restauración cancelada. No se modificaron tus datos.");
        return;
      }
      await restoreLocalBackup(backup);
      setRegion(backup.catalogRegion);
      setBackupMessage("Restauración Prisma completada. Tus datos locales se recuperaron y la credencial TMDB se conservó.");
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : "No se pudo restaurar la copia Prisma.");
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleImportExternalMovies(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith(".json")) {
      setBackupError("Selecciona el respaldo Android en formato .json.");
      setBackupMessage("");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setBackupError("El archivo supera el tamaño máximo permitido de 50 MB.");
      setBackupMessage("");
      return;
    }

    setBackupBusy(true);
    setBackupError("");
    setBackupMessage("");
    try {
      const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Panama";
      const plan = parseExternalMovieImport(await file.text(), deviceTimeZone);
      if (plan.movies.length === 0) {
        throw new Error("El archivo no contiene películas con un identificador TMDB válido.");
      }
      const confirmed = window.confirm(
        "Se combinarán " + plan.summary.watchedMovies + " películas de Vistas y "
        + plan.summary.pendingMovies + " de Pendientes. Se importarán "
        + plan.summary.matchedRatings + " calificaciones. "
        + "Las series, episodios y listas externas se ignorarán. "
        + "La fecha de cada visionado se obtendrá convirtiendo el instante UTC del campo a a la fecha local (" + deviceTimeZone + "). El campo rA no se usa para la racha. "
        + "Se conservarán tu perfil, colecciones, preferencias y datos existentes; no se reemplazarán. "
        + (plan.summary.orphanRatings
          ? plan.summary.orphanRatings + " calificación(es) sin película importable se omitirán. "
          : "")
        + (plan.summary.skippedWithoutTmdb
          ? plan.summary.skippedWithoutTmdb + " película(s) sin ID TMDB válido se omitirán. "
          : "")
        + "¿Continuar?"
      );
      if (!confirmed) {
        setBackupMessage("Importación cancelada. No se modificaron tus datos.");
        return;
      }

      const result = await importExternalMovies(plan);
      setBackupMessage(
        "Importación completada: " + plan.movies.length + " películas procesadas; "
        + result.newCatalogMovies + " agregadas al catálogo; "
        + result.newLibraryEntries + " agregadas a la Biblioteca; "
        + result.viewingsAdded + " calificaciones convertidas en visionados. "
        + result.alreadyHadViewings + " película(s) ya tenían visionados y no se duplicaron. "
        + result.correctedImportedDates + " fecha(s) de importaciones anteriores se corrigieron a la hora local. "
        + "Tu perfil, colecciones, preferencias y credencial TMDB se conservaron."
      );
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : "No se pudo importar el respaldo externo.");
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="section-heading">
        <div className="heading-with-back">
          <button type="button" className="back-link" aria-label="Volver a la pantalla anterior" onClick={() => navigateBack("/discover")}><ArrowLeft size={19} /></button>
          <div>
            <p className="eyebrow">PRISMA</p>
            <h1>Ajustes</h1>
          </div>
        </div>
      </header>

      <section className="settings-section card-surface">
        <div className="settings-section-heading">
          <div className="settings-icon"><span className="tmdb-mark">TMDB</span></div>
          <div>
            <h2>Catálogo cinematográfico</h2>
            <p className="muted-copy">Conecta tu propia cuenta de desarrollador de TMDB.</p>
          </div>
        </div>
        <div className="settings-connection-row">
          <span className={configured ? "connection-dot is-connected" : "connection-dot"} />
          <span>{configured ? "Credencial guardada en este navegador" : "Sin configurar"}</span>
        </div>

        <form className="settings-form" onSubmit={handleTest}>
          <label className="field-label" htmlFor="tmdb-token">API Read Access Token</label>
          <div className="secret-field">
            <input
              id="tmdb-token"
              className="text-field"
              type={visible ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(event) => { setToken(event.target.value); setState("idle"); setMessage(""); }}
              placeholder="Pega aquí tu token de acceso"
            />
            <button className="secret-toggle" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ocultar credencial" : "Mostrar credencial"}>
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label className="field-label" htmlFor="catalog-region">Región de disponibilidad</label>
          <select id="catalog-region" className="text-field" value={region} onChange={(event) => handleRegionChange(event.target.value)}>
            <option value="PA">Panamá</option>
            <option value="US">Estados Unidos</option>
            <option value="MX">México</option>
            <option value="CO">Colombia</option>
            <option value="ES">España</option>
            <option value="CA">Canadá</option>
            <option value="GB">Reino Unido</option>
          </select>

          {message && (
            <div className={state === "error" ? "connection-message is-error" : state === "success" ? "connection-message is-success" : "connection-message"}>
              {state === "testing" ? <LoaderCircle className="spin" size={17} /> : state === "success" ? <CheckCircle2 size={17} /> : state === "error" ? <CircleAlert size={17} /> : null}
              <span>{message}</span>
            </div>
          )}

          <button className="button button-primary button-full" type="submit" disabled={state === "testing"}>
            {state === "testing" ? "Comprobando..." : "Probar y guardar conexión"}
          </button>
        </form>

        {configured && (
          <button className="button button-danger button-full" type="button" onClick={handleRemove}>
            <Trash2 size={16} /> Eliminar credencial
          </button>
        )}
      </section>

      <EnrichmentPanel configured={configured} />

      <section className="settings-section card-surface">
        <div className="settings-section-heading">
          <div className="settings-icon"><Grid2X2 size={21} /></div>
          <div>
            <h2>Presentación de Biblioteca</h2>
            <p className="muted-copy">Elige cómo quieres ver tu colección. Esta preferencia solo afecta a Biblioteca.</p>
          </div>
        </div>
        {libraryPreferencesError && <p className="form-error" role="alert">{libraryPreferencesError}</p>}
        <div className="library-view-options" role="group" aria-label="Modo de presentación de Biblioteca">
          <button
            className={libraryView === "list" ? "library-view-option is-selected" : "library-view-option"}
            type="button"
            disabled={!libraryPreferencesReady}
            onClick={() => handleLibraryViewChange("list")}
            aria-pressed={libraryView === "list"}
          >
            <List size={21} />
            <span><strong>Lista</strong><small>Más información de cada película</small></span>
            {libraryView === "list" && <span className="library-view-check" aria-hidden="true">✓</span>}
          </button>
          <button
            className={libraryView === "grid" ? "library-view-option is-selected" : "library-view-option"}
            type="button"
            disabled={!libraryPreferencesReady}
            onClick={() => handleLibraryViewChange("grid")}
            aria-pressed={libraryView === "grid"}
          >
            <Grid2X2 size={21} />
            <span><strong>Cuadrícula</strong><small>Enfoque visual en los pósteres</small></span>
            {libraryView === "grid" && <span className="library-view-check" aria-hidden="true">✓</span>}
          </button>
        </div>
      </section>

      <section className="settings-section card-surface">
        <div className="settings-section-heading">
          <div className="settings-icon"><ShieldCheck size={21} /></div>
          <div>
            <h2>Copias de seguridad y migración</h2>
            <p className="muted-copy">Respalda Prisma o trae solo tus películas desde otra aplicación.</p>
          </div>
        </div>
        <p className="muted-copy">La copia Prisma incluye películas, Biblioteca, visionados, colecciones, perfil, preferencias y región del catálogo.</p>
        <button className="button button-primary button-full" type="button" onClick={() => void handleCreateBackup()} disabled={backupBusy}>
          <Download size={17} /> {backupBusy ? "Procesando..." : "Crear copia de seguridad Prisma"}
        </button>

        <input
          className="sr-only"
          id="prisma-backup-file"
          type="file"
          accept=".json,application/json"
          onChange={(event) => void handleRestoreBackup(event)}
          disabled={backupBusy}
        />
        <label className="button button-secondary button-full" htmlFor="prisma-backup-file" aria-disabled={backupBusy}>
          <Upload size={17} /> Restaurar copia Prisma
        </label>

        <div className="settings-subsection">
          <h3>Importar desde otra aplicación</h3>
          <p className="muted-copy">Compatible con el respaldo Android versión 2. Solo se importan películas de Vistas, Pendientes y sus calificaciones. Las series y los episodios se ignoran.</p>
          <input
            className="sr-only"
            id="external-movie-backup-file"
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleImportExternalMovies(event)}
            disabled={backupBusy}
          />
          <label className="button button-secondary button-full" htmlFor="external-movie-backup-file" aria-disabled={backupBusy}>
            <Upload size={17} /> Importar películas de otra app
          </label>
          <ul className="settings-bullet-list">
            <li>La importación combina los datos: no borra películas ni datos personales existentes en Prisma.</li>
            <li>Los identificadores TMDB permiten reconocer las películas; las que ya existen no se duplican.</li>
            <li>La fecha del visionado se obtiene de a, convertida desde UTC al día local del dispositivo; rA no se usa para la racha.</li>
          </ul>
        </div>

        {backupMessage && <div className="connection-message is-success" role="status"><CheckCircle2 size={17} /><span>{backupMessage}</span></div>}
        {backupError && <div className="connection-message is-error" role="alert"><CircleAlert size={17} /><span>{backupError}</span></div>}
        <ul className="settings-bullet-list">
          <li>Los archivos se procesan en este dispositivo; Prisma no los sube a ningún servidor.</li>
          <li>Restaurar una copia Prisma reemplaza los datos respaldados. Importar desde otra app, en cambio, los combina.</li>
          <li>La credencial TMDB se excluye de las copias y no se modifica al importar o restaurar.</li>
        </ul>
      </section>

      <section className="settings-section card-surface">
        <h2>Privacidad de la credencial</h2>
        <ul className="settings-bullet-list">
          <li>Se guarda únicamente en el almacenamiento local de este navegador.</li>
          <li>No se incluye en GitHub ni en las copias de seguridad de Prisma.</li>
          <li>No se envía a ningún servidor propio porque Prisma no tiene backend.</li>
        </ul>
        <p className="settings-security-note">Importante: al ser una aplicación web, una persona que tenga acceso a este navegador puede inspeccionar el almacenamiento y las solicitudes. Usa una credencial propia de TMDB y no la reutilices en otros servicios.</p>
        <a className="text-link" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">Gestionar credenciales de TMDB ↗</a>
      </section>

      <section className="settings-section card-surface">
        <h2>Próximamente</h2>
        <p className="muted-copy">Preferencias adicionales de interfaz y controles avanzados de privacidad se incorporarán en próximas etapas.</p>
      </section>
      <footer className="page-footer"><span>PRISMA</span><span>Versión 0.1.1</span></footer>
    </div>
  );
}
