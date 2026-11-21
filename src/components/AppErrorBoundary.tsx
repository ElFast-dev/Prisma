import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="page app-error-state" role="alert">
          <div className="app-error-icon"><AlertTriangle size={24} /></div>
          <h1>Esta sección no pudo abrirse</h1>
          <p>
            Prisma encontró un problema al mostrar esta pantalla. Tus películas,
            valoraciones e historial guardados en este dispositivo no se han borrado.
          </p>
          <div className="app-error-actions">
            <button className="button button-primary" type="button" onClick={() => window.location.reload()}>
              <RefreshCw size={15} /> Volver a intentar
            </button>
            <a className="button button-quiet" href="#/discover">Ir a Descubrir</a>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
