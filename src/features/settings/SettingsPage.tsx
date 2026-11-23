import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ChevronRight, Clapperboard, Database, Eye, EyeOff, CheckCircle2, CircleAlert, LoaderCircle, Trash2, Download, Upload, ShieldCheck, Grid2X2, List } from "lucide-react";
import {
  clearTmdbAccessToken,
  getCatalogRegion,
  getTmdbAccessToken,
  saveCatalogRegion,
  saveTmdbAccessToken
} from "../../infrastructure/tmdb/settings";
import { testTmdbConnection } from "../../infrastructure/tmdb/TmdbService";
import { createLocalBackup, restoreLocalBackup } from "../../infrastructure/database/backupService";
import { getLocalDataSummary, resetLocalData, type LocalDataSummary } from "../../infrastructure/database/dataManagementService";
import { importExternalMovies, type ExternalMovieImportPriority } from "../../infrastructure/database/externalMovieImportService";
import { parsePrismaBackup } from "../../domain/backup";
import { parseExternalMovieImport, type ExternalMovieImportPlan } from "../../domain/externalMovieImport";
import { EnrichmentPanel } from "./EnrichmentPanel";
import { StorageProtectionPanel } from "./StorageProtectionPanel";
import { PwaInstallPanel } from "./PwaInstallPanel";
import { useAccessibleDialog } from "../../components/useAccessibleDialog";
import { navigateBack } from "../../navigation/routeHistory";
import { getUserPreferences, saveLibraryView } from "../../infrastructure/database/preferencesService";

type ConnectionState = "idle" | "testing" | "success" | "error";

const settingsSections = [
  { id: "catalog", title: "Catálogo", description: "Conexión con TMDB y actualización de películas.", icon: Clapperboard },
  { id: "library", title: "Biblioteca", description: "Vista de lista o cuadrícula.", icon: Grid2X2 },
  { id: "data", title: "Datos", description: "Copias de seguridad e importación.", icon: Database },
  { id: "privacy", title: "Privacidad", description: "Almacenamiento local y credencial TMDB.", icon: ShieldCheck }
] as const;

export function SettingsPage() {
  const pathParts = window.location.hash.replace(/^#\/?/, "").split("/");
  const requestedSection = pathParts[0] === "settings" ? pathParts[1] : undefined;
  const activeSection = settingsSections.find((section) => section.id === requestedSection);

  const [token, setToken] = useState("");
  const [configured, setConfigured] = useState(false);
  const [visible, setVisible] = useState(false);
  const [region, setRegion] = useState("PA");
  const [state, setState] = useState<ConnectionState>("idle");
  const [message, setMessage] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");
  const [externalImportPlan, setExternalImportPlan] = useState<ExternalMovieImportPlan | null>(null);
  const [externalImportFileName, setExternalImportFileName] = useState("");
  const [libraryView, setLibraryView] = useState<"list" | "grid">("list");
  const [libraryPreferencesReady, setLibraryPreferencesReady] = useState(false);
  const [libraryPreferencesError, setLibraryPreferencesError] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetSummary, setResetSummary] = useState<LocalDataSummary | null>(null);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetAlsoDeleteTmdb, setResetAlsoDeleteTmdb] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const externalImportDialogRef = useAccessibleDialog(Boolean(externalImportPlan), () => {
    if (!backupBusy) cancelExternalImport();
  });
  const resetDialogRef = useAccessibleDialog(resetDialogOpen, () => {
    if (!backupBusy && !resetBusy) setResetDialogOpen(false);
  });

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
      setExternalImportFileName(file.name);
      setExternalImportPlan(plan);
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : "No se pudo leer el respaldo externo.");
    } finally {
      setBackupBusy(false);
    }
  }

  async function confirmExternalImport(priority: ExternalMovieImportPriority) {
    if (!externalImportPlan) return;
    setBackupBusy(true);
    setBackupError("");
    setBackupMessage("");
    try {
      const plan = externalImportPlan;
      const result = await importExternalMovies(plan, priority);
      setBackupMessage(
        "Importación completada: " + plan.movies.length + " películas procesadas; "
        + result.newCatalogMovies + " agregadas al catálogo; "
        + result.viewingsAdded + " experiencias nuevas; "
        + result.matchedExistingViewings + " experiencias locales vinculadas; "
        + result.updatedImportedViewings + " experiencias importadas actualizadas. "
        + (priority === "external"
          ? "El archivo tuvo prioridad en los conflictos de estado y calificación. "
          : "Se conservaron los estados y calificaciones locales en los conflictos. ")
        + "No se eliminaron tus visionados manuales, perfil, colecciones ni preferencias."
      );
      setExternalImportPlan(null);
      setExternalImportFileName("");
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : "No se pudo importar el respaldo externo.");
    } finally {
      setBackupBusy(false);
    }
  }

  function cancelExternalImport() {
    setExternalImportPlan(null);
    setExternalImportFileName("");
    setBackupMessage("Importación cancelada. No se modificaron tus datos.");
  }

  async function handleOpenResetDialog() {
    setBackupMessage("");
    setBackupError("");
    setResetConfirmation("");
    setResetAlsoDeleteTmdb(false);
    setResetSummary(null);
    setResetDialogOpen(true);
    setResetBusy(true);
    try {
      setResetSummary(await getLocalDataSummary());
    } catch (cause) {
      setResetDialogOpen(false);
      setBackupError(cause instanceof Error
        ? cause.message
        : "No se pudieron consultar los datos locales de Prisma.");
    } finally {
      setResetBusy(false);
    }
  }

  async function handleResetLocalData() {
    if (resetConfirmation !== "BORRAR" || resetBusy || backupBusy) return;

    setResetBusy(true);
    setBackupError("");
    try {
      await resetLocalData();
      if (resetAlsoDeleteTmdb) {
        clearTmdbAccessToken();
        setToken("");
        setConfigured(false);
        setState("idle");
        setMessage("");
      }
      setLibraryView("list");
      setLibraryPreferencesError("");
      setLibraryPreferencesReady(true);
      setExternalImportPlan(null);
      setExternalImportFileName("");
      setResetDialogOpen(false);
      setResetConfirmation("");
      setResetSummary(null);
      setBackupMessage(
        "Prisma está limpio. Se borraron los datos de Biblioteca e Historial, las colecciones, el perfil, las preferencias y el catálogo local. "
        + (resetAlsoDeleteTmdb
          ? "También se eliminó la credencial TMDB."
          : "Tu credencial TMDB y la región se conservaron.")
      );
    } catch (cause) {
      setBackupError(cause instanceof Error ? cause.message : "No se pudieron eliminar los datos locales.");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="page" data-prisma-update-blocked={backupBusy || resetBusy ? "true" : undefined}>
      <header className="section-heading">
        <div className="heading-with-back">
          <button type="button" className="back-link"
            aria-label={activeSection ? "Volver a Ajustes" : "Volver a la pantalla anterior"}
            onClick={() => navigateBack(activeSection ? "/settings" : "/discover")}>
            <ArrowLeft size={19} />
          </button>
          <h1>{activeSection?.title ?? "Ajustes"}</h1>
        </div>
      </header>
      {!activeSection && <PwaInstallPanel />}
      {!activeSection && (
        <nav className="navigation-cards settings-navigation-cards" aria-label="Secciones de Ajustes">
          {settingsSections.map((item) => {
            const Icon = item.icon;
            return (
              <a className="navigation-card card-surface" href={"#/settings/" + item.id} key={item.id}>
                <span className="navigation-card-icon"><Icon size={22} /></span>
                <span className="navigation-card-copy">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </span>
                <ChevronRight size={19} className="subtle-icon" />
              </a>
            );
          })}
        </nav>
      )}
      {activeSection?.id === "catalog" && (
        <>
      <section className="settings-section card-surface">
        <div className="settings-section-heading">
          <div className="settings-icon"><span className="tmdb-mark">TMDB</span></div>
          <div>
            <h2>TMDB</h2>
            <p className="muted-copy">Conecta tu credencial para consultar y completar películas.</p>
          </div>
        </div>
        <div className="settings-connection-row">
          <span className={configured ? "connection-dot is-connected" : "connection-dot"} />
          <span>{configured ? "Credencial guardada en este navegador" : "Sin configurar"}</span>
        </div>

        <form
          className="settings-form"
          onSubmit={handleTest}
          data-prisma-unsaved={token.trim() !== getTmdbAccessToken() ? "true" : undefined}
        >
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
        </>
      )}

      {activeSection?.id === "library" && (
      <section className="settings-section card-surface">
        <div className="settings-section-heading">
          <div className="settings-icon"><Grid2X2 size={21} /></div>
          <div>
            <h2>Vista</h2>
            
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
      )}

      {activeSection?.id === "data" && (
      <>
      <section className="settings-section card-surface">
        <div className="settings-section-heading">
          <div className="settings-icon"><ShieldCheck size={21} /></div>
          <div>
            <h2>Copias de seguridad</h2>
            <p className="muted-copy">Exporta, restaura o importa tus datos.</p>
          </div>
        </div>
        <p className="muted-copy">Incluye películas, estados de Biblioteca, visionados, colecciones, perfil y preferencias.</p>
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
            <li>Antes de importar puedes elegir si prevalecen los estados y calificaciones de Prisma o los del archivo.</li>
            <li>Las experiencias se reconocen por su identificador externo y fecha; reimportar el mismo archivo no crea duplicados.</li>
            <li>Las películas vistas sin calificación también se registran en Historial. La fecha se convierte desde UTC al día local; rA no determina el día.</li>
          </ul>
        </div>

        {externalImportPlan && (
          <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !backupBusy) cancelExternalImport();
          }}>
            <section ref={externalImportDialogRef} tabIndex={-1} className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="external-import-title">
              <div className="sheet-handle" />
              <div className="sheet-header">
                <div>
                  <h2 id="external-import-title">Prioridad de importación</h2>
                  <p className="muted-copy">{externalImportFileName}</p>
                </div>
              </div>
              <div className="external-import-summary">
                <div><strong>{externalImportPlan.summary.watchedMovies}</strong><span>Vistas</span></div>
                <div><strong>{externalImportPlan.summary.pendingMovies}</strong><span>Pendientes</span></div>
                <div><strong>{externalImportPlan.summary.matchedRatings}</strong><span>Con nota</span></div>
                <div><strong>{externalImportPlan.summary.watchedWithoutRating}</strong><span>Sin nota</span></div>
              </div>
              <p className="muted-copy">
                Elige qué datos prevalecen cuando el archivo y Prisma contienen información distinta.
                Las experiencias manuales de otras fechas se conservan en ambos modos.
              </p>
              <div className="external-import-priority">
                <button className="button button-secondary button-full" type="button" disabled={backupBusy} onClick={() => void confirmExternalImport("local")}>
                  Conservar Prisma
                </button>
                <p className="muted-copy">Mantiene los estados y las calificaciones locales cuando coinciden con una experiencia importada.</p>
                <button className="button button-primary button-full" type="button" disabled={backupBusy} onClick={() => void confirmExternalImport("external")}>
                  {backupBusy ? "Importando..." : "Priorizar archivo JSON"}
                </button>
                <p className="muted-copy">El archivo decide Vistas/Pendientes y su calificación prevalece cuando coincide la misma fecha. No borra otras experiencias manuales.</p>
                <button className="button button-quiet button-full" type="button" disabled={backupBusy} onClick={cancelExternalImport}>Cancelar</button>
              </div>
            </section>
          </div>
        )}
        {backupMessage && <div className="connection-message is-success" role="status"><CheckCircle2 size={17} /><span>{backupMessage}</span></div>}
        {backupError && <div className="connection-message is-error" role="alert"><CircleAlert size={17} /><span>{backupError}</span></div>}
        <ul className="settings-bullet-list">
          <li>Los archivos se procesan en este dispositivo; Prisma no los sube a ningún servidor.</li>
          <li>Restaurar una copia Prisma reemplaza los datos respaldados. Importar desde otra app, en cambio, los combina.</li>
          <li>La credencial TMDB se excluye de las copias y no se modifica al importar o restaurar.</li>
        </ul>
      </section>

      <section className="settings-section card-surface reset-data-section">
        <div className="settings-section-heading">
          <div className="settings-icon reset-data-icon"><Trash2 size={21} /></div>
          <div>
            <h2>Empezar de cero</h2>
            <p className="muted-copy">Elimina los datos de este dispositivo para comenzar con una Prisma limpia.</p>
          </div>
        </div>
        <p className="muted-copy">
          Se borrarán películas guardadas, estados de Biblioteca, favoritos, visionados, comentarios,
          colecciones, perfil, filtros, preferencias y cachés locales. Esta acción no se puede deshacer.
        </p>
        <p className="muted-copy">
          Tu credencial TMDB y la región elegida se conservarán, salvo que marques expresamente lo contrario para la credencial.
        </p>
        <button className="button button-danger button-full" type="button"
          onClick={() => void handleOpenResetDialog()} disabled={backupBusy || resetBusy}>
          <Trash2 size={16} /> Empezar de cero
        </button>
      </section>

      {resetDialogOpen && (
        <div className="sheet-backdrop reset-data-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !backupBusy && !resetBusy) setResetDialogOpen(false);
        }}>
          <section ref={resetDialogRef} tabIndex={-1} className="bottom-sheet reset-data-sheet" role="dialog" aria-modal="true" aria-labelledby="reset-data-title">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div>
                <h2 id="reset-data-title">Restablecer Prisma</h2>
                <p className="muted-copy">Revisa el alcance antes de borrar.</p>
              </div>
            </div>

            {resetSummary ? (
              <div className="external-import-summary reset-data-summary">
                <div><strong>{resetSummary.movies}</strong><span>Películas</span></div>
                <div><strong>{resetSummary.libraryEntries}</strong><span>En Biblioteca</span></div>
                <div><strong>{resetSummary.viewings}</strong><span>Visionados</span></div>
                <div><strong>{resetSummary.collections}</strong><span>Colecciones</span></div>
              </div>
            ) : (
              <p className="muted-copy">Consultando los datos guardados en este dispositivo…</p>
            )}

            <p className="reset-data-warning">
              Se borrarán también el perfil, las notas, los filtros, las preferencias y las cachés locales.
              No se borrará la aplicación ni los datos almacenados en otros dispositivos.
            </p>

            <button className="button button-secondary button-full" type="button"
              onClick={() => void handleCreateBackup()} disabled={backupBusy || resetBusy}>
              <Download size={16} /> Descargar copia Prisma antes de borrar
            </button>

            {backupMessage && (
              <div className="connection-message is-success" role="status">
                <CheckCircle2 size={17} /><span>{backupMessage}</span>
              </div>
            )}
            {backupError && (
              <div className="connection-message is-error" role="alert">
                <CircleAlert size={17} /><span>{backupError}</span>
              </div>
            )}

            {configured && (
              <label className="reset-data-option">
                <input type="checkbox" checked={resetAlsoDeleteTmdb} disabled={backupBusy || resetBusy}
                  onChange={(event) => setResetAlsoDeleteTmdb(event.target.checked)} />
                <span>Eliminar también la credencial TMDB guardada en este navegador.</span>
              </label>
            )}

            <label className="field-label" htmlFor="reset-data-confirmation">Escribe BORRAR para confirmar</label>
            <input id="reset-data-confirmation" className="text-field"
              value={resetConfirmation} onChange={(event) => setResetConfirmation(event.target.value)}
              autoComplete="off" spellCheck={false} placeholder="BORRAR" />

            <p className="muted-copy reset-data-footnote">
              No hay papelera ni botón de deshacer. Solo podrás recuperar estos datos mediante una copia de seguridad Prisma guardada previamente.
            </p>

            <button className="button button-danger button-full" type="button"
              disabled={!resetSummary || resetConfirmation !== "BORRAR" || backupBusy || resetBusy}
              onClick={() => void handleResetLocalData()}>
              <Trash2 size={16} /> {resetBusy ? "Restableciendo…" : "Borrar definitivamente"}
            </button>
            <button className="button button-quiet button-full" type="button"
              disabled={backupBusy || resetBusy} onClick={() => setResetDialogOpen(false)}>
              Cancelar
            </button>
          </section>
        </div>
      )}
      </>
      )}

      {activeSection?.id === "privacy" && (
        <>
      <section className="settings-section card-surface">
        <h2>Credencial TMDB</h2>
        <ul className="settings-bullet-list">
          <li>Se guarda únicamente en el almacenamiento local de este navegador.</li>
          <li>No se incluye en GitHub ni en las copias de seguridad de Prisma.</li>
          <li>No se envía a ningún servidor propio porque Prisma no tiene backend.</li>
        </ul>
        <p className="settings-security-note">Importante: al ser una aplicación web, una persona que tenga acceso a este navegador puede inspeccionar el almacenamiento y las solicitudes. Usa una credencial propia de TMDB y no la reutilices en otros servicios.</p>
        <a className="text-link" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">Gestionar credenciales de TMDB ↗</a>
      </section>
      <StorageProtectionPanel />
      <section className="settings-section card-surface settings-about-card">
        <div>
          <h2>Datos locales</h2>
          <p className="muted-copy">Tu Biblioteca, Historial, calificaciones y comentarios se guardan en este dispositivo. Prisma no requiere cuenta.</p>
        </div>
        <span className="settings-app-version">Versión 0.1.1</span>
      </section>
        </>
      )}
    </div>
  );
}