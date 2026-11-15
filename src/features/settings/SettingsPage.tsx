import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, CheckCircle2, CircleAlert, LoaderCircle, Trash2 } from "lucide-react";
import {
  clearTmdbAccessToken,
  getCatalogRegion,
  getTmdbAccessToken,
  saveCatalogRegion,
  saveTmdbAccessToken
} from "../../infrastructure/tmdb/settings";
import { testTmdbConnection } from "../../infrastructure/tmdb/TmdbService";

type ConnectionState = "idle" | "testing" | "success" | "error";

export function SettingsPage() {
  const [token, setToken] = useState("");
  const [configured, setConfigured] = useState(false);
  const [visible, setVisible] = useState(false);
  const [region, setRegion] = useState("PA");
  const [state, setState] = useState<ConnectionState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = getTmdbAccessToken();
    setToken(stored);
    setConfigured(Boolean(stored));
    setRegion(getCatalogRegion());
  }, []);

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

  return (
    <div className="page">
      <header className="section-heading">
        <div className="heading-with-back">
          <a href="#/discover" className="back-link" aria-label="Volver a Descubrir"><ArrowLeft size={19} /></a>
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
        <p className="muted-copy">Almacenamiento, copias de seguridad, privacidad detallada y preferencias de interfaz se incorporarán por etapas.</p>
      </section>
      <footer className="page-footer"><span>PRISMA</span><span>Versión 0.1.1</span></footer>
    </div>
  );
}
