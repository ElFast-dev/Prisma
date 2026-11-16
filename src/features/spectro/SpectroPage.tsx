import { useEffect, useState, type ReactNode } from "react";
import {
  BrainCircuit, CalendarDays, ChartLine, Clapperboard, Film,
  Fingerprint, Network, Sparkles, Users
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { getSpectroAnalysis } from "../../infrastructure/database/spectroRepository";
import { getTmdbImageUrl } from "../../infrastructure/tmdb/TmdbService";
import type { SpectroAffinity, SpectroAnalysis } from "../../domain/spectro";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";

type LoadState = "loading" | "ready" | "error";

function AffinityPanel({ title, icon, items }: { title: string; icon: ReactNode; items: SpectroAffinity[] }) {
  const strongest = items.filter((item) => item.difference > 0).slice(0, 5);
  return (
    <section className="spectro-affinity-panel card-surface">
      <div className="spectro-panel-title"><span>{icon}</span><h2>{title}</h2></div>
      {strongest.length ? strongest.map((item) => (
        <div className="spectro-affinity-row" key={item.key}>
          <div className="spectro-affinity-heading"><strong>{item.label}</strong><span>{item.averageRating.toFixed(1)}/10</span></div>
          <div className="spectro-affinity-track"><span style={{ width: Math.max(3, Math.min(100, item.averageRating * 10)) + "%" }} /></div>
          <small>+{item.difference.toFixed(1)} frente a tu promedio · {item.sampleSize} {item.sampleSize === 1 ? "película" : "películas"}</small>
        </div>
      )) : <p className="muted-copy spectro-panel-empty">Todavía no hay una afinidad positiva consistente en esta categoría.</p>}
    </section>
  );
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PA", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function SpectroContent({ analysis }: { analysis: SpectroAnalysis }) {
  if (analysis.totalViewings === 0) {
    return (
      <EmptyState
        icon={<BrainCircuit size={26} />}
        title="Sin datos suficientes"
        description="Registra al menos tres películas vistas con calificación."
        action={<a href="#/discover" className="button button-primary">Descubrir películas</a>}
      />
    );
  }

  return (
    <>
      <section className="spectro-summary-grid">
        <div className="spectro-summary-card"><span>Películas analizadas</span><strong>{analysis.movieCount}</strong></div>
        <div className="spectro-summary-card"><span>Visionados</span><strong>{analysis.totalViewings}</strong></div>
        <div className="spectro-summary-card"><span>Promedio personal</span><strong>{analysis.averageRating?.toFixed(1) ?? "—"}<small>/10</small></strong></div>
      </section>

      {!analysis.hasEnoughData ? (
        <section className="spectro-insufficient card-surface">
          <Fingerprint size={23} className="accent-icon" />
          <div>
            <h2>Datos insuficientes</h2>
            <p>Necesitas tres películas distintas con calificación. Llevas {analysis.movieCount} de 3.</p>
          </div>
        </section>
      ) : (
        <>
          <section className="spectro-map card-surface">
            <div className="content-caption"><h2>Afinidades</h2><span className="status-pill">Versión 1.0</span></div>
            <p className="muted-copy spectro-section-intro">Compara tus valoraciones por rasgo con tu promedio general.</p>
            <div className="spectro-affinity-grid">
              <AffinityPanel title="Géneros" icon={<Film size={17} />} items={analysis.genreAffinities} />
              <AffinityPanel title="Directores" icon={<Clapperboard size={17} />} items={analysis.directorAffinities} />
              <AffinityPanel title="Reparto" icon={<Users size={17} />} items={analysis.castAffinities} />
              <AffinityPanel title="Países" icon={<Network size={17} />} items={analysis.countryAffinities} />
              <AffinityPanel title="Épocas" icon={<CalendarDays size={17} />} items={analysis.decadeAffinities} />
            </div>
          </section>

          <section className="spectro-evolution-section">
            <div className="content-caption"><div><h2>Evolución</h2></div><ChartLine size={19} className="accent-icon" /></div>
            {analysis.evolution.length ? (
              <div className="spectro-evolution-list card-surface">
                {analysis.evolution.map((item) => (
                  <div className="spectro-evolution-row" key={item.month}>
                    <span>{formatMonth(item.month)}</span>
                    <div className="spectro-evolution-track"><span style={{ width: item.averageRating * 10 + "%" }} /></div>
                    <strong>{item.averageRating.toFixed(1)}</strong>
                    <small>{item.viewingCount} {item.viewingCount === 1 ? "visionado" : "visionados"}</small>
                  </div>
                ))}
              </div>
            ) : <p className="muted-copy">Aún no hay registros mensuales suficientes para mostrar la evolución.</p>}
          </section>

          <section className="spectro-recommendations-section">
            <div className="content-caption"><div><h2>Podrían gustarte</h2></div><Sparkles size={19} className="accent-icon" /></div>
            {analysis.recommendations.length ? (
              <div className="spectro-recommendation-grid">
                {analysis.recommendations.map((item) => (
                  <article className="spectro-recommendation-card" key={item.movie.id}>
                    <MoviePosterCard
                      title={item.movie.title}
                      imageUrl={getTmdbImageUrl("https://image.tmdb.org/t/p/", item.movie.posterPath, "w342")}
                      onClick={() => {
                        saveCurrentRouteScrollPosition();
                        window.location.hash = "#/movie/" + item.movie.tmdbId;
                      }}
                    />
                    <div className="spectro-recommendation-copy">
                      <strong>{item.movie.title}</strong>
                      <small>Afinidad +{item.score.toFixed(1)} puntos</small>
                      <p>{item.reasons.join(" · ")}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="spectro-no-recommendations card-surface">
                <Sparkles size={20} className="accent-icon" />
                <p>No hay candidatas locales que coincidan con tus afinidades positivas todavía. Al abrir fichas desde Descubrir, Prisma guardará recomendaciones relacionadas para analizarlas aquí.</p>
              </div>
            )}
          </section>
        </>
      )}

      <p className="spectro-version-note">Espectro {analysis.algorithmVersion} · Análisis local actualizado {new Date(analysis.computedAt).toLocaleString("es-PA")}</p>
    </>
  );
}

export function SpectroPage() {
  const [analysis, setAnalysis] = useState<SpectroAnalysis | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getSpectroAnalysis()
      .then((result) => {
        if (!active) return;
        setAnalysis(result);
        setState("ready");
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No se pudo calcular Espectro.");
        setState("error");
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="page">
      <header className="section-heading">
        <h1 className="spectro-wordmark">Espectro</h1>
        <BrainCircuit size={26} className="accent-icon" />
      </header>
      {state === "loading" ? (
        <div className="detail-loading"><span>Analizando…</span></div>
      ) : state === "error" ? (
        <EmptyState
          icon={<BrainCircuit size={26} />}
          title="No se pudo calcular Espectro"
          description={error}
          action={<button className="button button-secondary" type="button" onClick={() => window.location.reload()}>Reintentar</button>}
        />
      ) : analysis ? (
        <SpectroContent analysis={analysis} />
      ) : null}
    </div>
  );
}
