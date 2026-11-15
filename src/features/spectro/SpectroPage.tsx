import { BrainCircuit, Fingerprint, Network, Sparkles, ChartLine } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";

export function SpectroPage() {
  return (
    <div className="page">
      <header className="section-heading">
        <div>
          <p className="eyebrow">INTELIGENCIA CINEMATOGRÁFICA</p>
          <h1 className="spectro-wordmark">Espectro</h1>
        </div>
        <BrainCircuit size={26} className="accent-icon" />
      </header>
      <p className="page-lead">Tu universo cinematográfico, interpretado a través de tus experiencias.</p>

      <section className="spectro-map card-surface">
        <div className="content-caption">
          <h2>Mapa de afinidades</h2>
          <span className="status-pill">En preparación</span>
        </div>
        <div className="spectro-map-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-node node-top">Géneros</div>
          <div className="orbit-node node-left">Países</div>
          <div className="orbit-node node-right">Autores</div>
          <div className="orbit-node node-bottom">Épocas</div>
          <div className="orbit-center"><BrainCircuit size={28} /></div>
        </div>
        <p className="muted-copy">El mapa solo mostrará conexiones calculadas cuando existan suficientes películas y valoraciones.</p>
      </section>

      <div className="spectro-feature-grid">
        <article className="feature-card card-surface">
          <Fingerprint size={22} className="accent-icon" />
          <h3>Huella cinematográfica</h3>
          <p>Las preferencias que se desprenden de tu biblioteca.</p>
        </article>
        <article className="feature-card card-surface">
          <ChartLine size={22} className="accent-icon" />
          <h3>Evolución</h3>
          <p>Cómo cambian tus gustos con el paso del tiempo.</p>
        </article>
        <article className="feature-card card-surface">
          <Network size={22} className="accent-icon" />
          <h3>Afinidades</h3>
          <p>Conexiones entre películas, autores y estilos.</p>
        </article>
        <article className="feature-card card-surface">
          <Sparkles size={22} className="accent-icon" />
          <h3>Descubrimientos</h3>
          <p>Películas compatibles con tus preferencias.</p>
        </article>
      </div>

      <EmptyState
        icon={<BrainCircuit size={26} />}
        title="Espectro todavía no tiene datos suficientes"
        description="Primero construye tu biblioteca y registra tus visionados. Espectro analizará tus experiencias localmente."
        action={<a href="#/personal/library" className="text-link">Ir a mi biblioteca</a>}
      />
    </div>
  );
}
