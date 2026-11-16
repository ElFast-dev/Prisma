import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownRight, ArrowUpRight, BrainCircuit, CalendarDays, ChartLine,
  Clapperboard, Film, Fingerprint, Languages, Network, Sparkles,
  Timer, TrendingUp, Users
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { getSpectroAnalysis } from "../../infrastructure/database/spectroRepository";
import { getTmdbImageUrl } from "../../infrastructure/tmdb/TmdbService";
import type { SpectroAffinity, SpectroAnalysis } from "../../domain/spectro";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";

type LoadState = "loading" | "ready" | "error";

function confidenceLabel(value: SpectroAffinity["confidence"]): string {
  if (value === "sólida") return "Consistente";
  if (value === "moderada") return "En desarrollo";
  if (value === "variable") return "Variable";
  return "Inicial";
}

function AffinityPanel({
  title,
  icon,
  items
}: {
  title: string;
  icon: ReactNode;
  items: SpectroAffinity[];
}) {
  const strongest = items.filter((item) => item.adjustedDifference > 0).slice(0, 5);

  return (
    <section className="spectro-affinity-panel card-surface">
      <div className="spectro-panel-title"><span>{icon}</span><h3>{title}</h3></div>
      {strongest.length ? strongest.map((item) => (
        <div className="spectro-affinity-row" key={item.key}>
          <div className="spectro-affinity-heading">
            <strong>{item.label}</strong>
            <span>{item.averageRating.toFixed(1)}/10</span>
          </div>
          <div
            className="spectro-affinity-track"
            role="img"
            aria-label={item.label + ": " + item.averageRating.toFixed(1) + " de 10"}
          >
            <span style={{ width: Math.max(3, Math.min(100, item.averageRating * 10)) + "%" }} />
          </div>
          <div className="spectro-affinity-evidence">
            <small>
              +{item.difference.toFixed(1)} observado · +{item.adjustedDifference.toFixed(1)} ajustado · variación {item.dispersion.toFixed(1)} · {item.sampleSize} títulos
            </small>
            <span className={"spectro-confidence is-" + item.confidence}>{confidenceLabel(item.confidence)}</span>
          </div>
        </div>
      )) : (
        <p className="muted-copy spectro-panel-empty">
          Todavía no hay una señal positiva respaldada en esta categoría.
        </p>
      )}
    </section>
  );
}

function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PA", { month: "short", year: "numeric" })
    .format(new Date(year, month - 1, 1));
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
      <section className="spectro-summary-grid" aria-label="Resumen del análisis">
        <div className="spectro-summary-card"><span>Películas analizadas</span><strong>{analysis.movieCount}</strong></div>
        <div className="spectro-summary-card"><span>Visionados</span><strong>{analysis.totalViewings}</strong></div>
        <div className="spectro-summary-card"><span>Promedio por película</span><strong>{analysis.averageRating?.toFixed(1) ?? "—"}<small>/10</small></strong></div>
      </section>

      {!analysis.hasEnoughData ? (
        <section className="spectro-insufficient card-surface" role="status">
          <Fingerprint size={23} className="accent-icon" />
          <div>
            <h2>Datos insuficientes</h2>
            <p>Necesitas tres películas distintas con calificación. Llevas {analysis.movieCount} de 3.</p>
          </div>
        </section>
      ) : (
        <>
          <section className="spectro-map card-surface" aria-labelledby="spectro-affinities-title">
            <div className="content-caption">
              <h2 id="spectro-affinities-title">Afinidades</h2>
              <span className="status-pill">Versión {analysis.algorithmVersion}</span>
            </div>
            <p className="muted-copy spectro-section-intro">
              Diferencia ajustada frente a tu promedio por película. El respaldo depende de títulos distintos y de la variación entre sus notas.
            </p>
            <div className="spectro-affinity-grid">
              <AffinityPanel title="Géneros" icon={<Film size={17} />} items={analysis.genreAffinities} />
              <AffinityPanel title="Directores" icon={<Clapperboard size={17} />} items={analysis.directorAffinities} />
              <AffinityPanel title="Reparto" icon={<Users size={17} />} items={analysis.castAffinities} />
              <AffinityPanel title="Países" icon={<Network size={17} />} items={analysis.countryAffinities} />
              <AffinityPanel title="Épocas" icon={<CalendarDays size={17} />} items={analysis.decadeAffinities} />
              <AffinityPanel title="Idioma original" icon={<Languages size={17} />} items={analysis.languageAffinities} />
              <AffinityPanel title="Duración" icon={<Timer size={17} />} items={analysis.durationAffinities} />
            </div>
            <p className="spectro-method-note">
              Una afinidad inicial es una pista, no una preferencia confirmada. Los revisionados no aumentan el número de títulos que respaldan una señal.
            </p>
          </section>

          <section className="spectro-evolution-section" aria-labelledby="spectro-evolution-title">
            <div className="content-caption">
              <h2 id="spectro-evolution-title">Evolución mensual</h2>
              <ChartLine size={19} className="accent-icon" />
            </div>
            {analysis.evolution.length ? (
              <div className="spectro-evolution-list card-surface">
                {analysis.evolution.map((item) => (
                  <div className="spectro-evolution-row" key={item.month}>
                    <span>{formatMonth(item.month)}</span>
                    <div
                      className="spectro-evolution-track"
                      role="img"
                      aria-label={"Promedio mensual " + item.averageRating.toFixed(1) + " de 10"}
                    >
                      <span style={{ width: item.averageRating * 10 + "%" }} />
                    </div>
                    <strong>{item.averageRating.toFixed(1)}</strong>
                    <small>{item.viewingCount} {item.viewingCount === 1 ? "calificación" : "calificaciones"}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-copy">Aún no hay calificaciones mensuales para mostrar la evolución.</p>
            )}
          </section>

          <section className="spectro-trends-section" aria-labelledby="spectro-trends-title">
            <div className="content-caption">
              <div><h2 id="spectro-trends-title">Cambios recientes</h2></div>
              <TrendingUp size={19} className="accent-icon" />
            </div>
            {analysis.affinityTrends.length ? (
              <div className="spectro-trends-list card-surface">
                {analysis.affinityTrends.slice(0, 5).map((item) => (
                  <article className="spectro-trend-row" key={item.key}>
                    <div className="spectro-trend-copy">
                      <strong>{item.label}</strong>
                      <small>{item.category} · {item.previousSampleSize} antes · {item.recentSampleSize} recientes</small>
                    </div>
                    <div className={"spectro-trend-change is-" + item.direction}>
                      {item.direction === "sube" ? <ArrowUpRight size={16} />
                        : item.direction === "baja" ? <ArrowDownRight size={16} /> : <span>—</span>}
                      <strong>{item.change > 0 ? "+" : ""}{item.change.toFixed(1)}</strong>
                    </div>
                  </article>
                ))}
                <p className="spectro-method-note">
                  Compara los últimos 12 meses disponibles con los 12 anteriores. Cada título cuenta una vez por periodo; no se extrapolan meses sin actividad.
                </p>
              </div>
            ) : (
              <p className="muted-copy spectro-trends-empty">
                Aún no hay dos periodos comparables. Se necesitan al menos tres películas calificadas en cada periodo y rasgo.
              </p>
            )}
          </section>

          <section className="spectro-recommendations-section" aria-labelledby="spectro-recommendations-title">
            <div className="content-caption">
              <div><h2 id="spectro-recommendations-title">Podrían gustarte</h2></div>
              <Sparkles size={19} className="accent-icon" />
            </div>
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
                      <div className="spectro-recommendation-meta">
                        <small>Encaje estimado +{item.score.toFixed(1)}</small>
                        <span className={"spectro-confidence is-" + item.confidence}>{confidenceLabel(item.confidence)}</span>
                      </div>
                      <ul className="spectro-recommendation-reasons">
                        {item.reasons.map((reason) => (
                          <li key={reason.category}>
                            <span>{reason.category}: {reason.label}</span>
                            <small>+{reason.difference.toFixed(1)} · {reason.sampleSize} títulos</small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="spectro-no-recommendations card-surface">
                <Sparkles size={20} className="accent-icon" />
                <p>
                  Aún no hay candidatas locales con coincidencias respaldadas. Prisma necesita al menos tres títulos por señal antes de utilizarla en una recomendación.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      <p className="spectro-version-note">
        Espectro {analysis.algorithmVersion} · Análisis local actualizado {new Date(analysis.computedAt).toLocaleString("es-PA")}
      </p>
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
      <h1 className="sr-only">Espectro</h1>
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
