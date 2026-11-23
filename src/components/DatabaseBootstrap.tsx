import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";
import {
  isDatabaseUpgradeBlocked,
  openPrismaDatabase,
  subscribeToDatabaseBlocked
} from "../infrastructure/database/databaseBootstrap";

type BootstrapState = "loading" | "ready" | "error";

export function DatabaseBootstrap({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootstrapState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [blocked, setBlocked] = useState(isDatabaseUpgradeBlocked());

  useEffect(() => subscribeToDatabaseBlocked(() => setBlocked(true)), []);

  useEffect(() => {
    let active = true;
    setState("loading");
    setBlocked(isDatabaseUpgradeBlocked());

    openPrismaDatabase()
      .then(() => {
        if (active) {
          setBlocked(false);
          setState("ready");
        }
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => { active = false; };
  }, [attempt]);

  if (state === "ready") return children;

  if (state === "loading") {
    return (
      <main className="page app-error-state" role="status" aria-live="polite" aria-busy="true">
        <div className="app-error-icon"><Database size={24} /></div>
        <h1>Preparando el almacenamiento local</h1>
        <p>
          Prisma está comprobando la base de datos de este dispositivo antes de abrir tus películas e historial.
        </p>
        {blocked && (
          <p>
            Otra pestaña está utilizando una versión anterior de Prisma. Cierra las otras pestañas para permitir la actualización del almacenamiento.
          </p>
        )}
      </main>
    );
  }

  return (
    <main className="page app-error-state" role="alert">
      <div className="app-error-icon"><AlertTriangle size={24} /></div>
      <h1>No se pudo abrir el almacenamiento local</h1>
      <p>
        Prisma no ha borrado ni reconstruido tu base de datos. Comprueba que el navegador permita el almacenamiento y que haya espacio disponible.
      </p>
      <p>
        Cierra otras pestañas de Prisma y vuelve a intentarlo. Si el problema continúa, conserva tu copia de seguridad y no borres los datos del navegador.
      </p>
      <div className="app-error-actions">
        <button className="button button-primary" type="button" onClick={() => setAttempt((value) => value + 1)}>
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    </main>
  );
}
