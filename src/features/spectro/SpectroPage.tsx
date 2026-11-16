import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownRight, ArrowUpRight, BrainCircuit, CalendarDays, ChartLine,
  Clapperboard, Film, Fingerprint, Languages, Network, Sparkles,
  Star, Timer, TrendingUp, Users, RefreshCw, WifiOff, CheckCircle2
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { getSpectroAnalysis } from "../../infrastructure/database/spectroRepository";
import {
  getSpectroMetadataSnapshot,
  startSpectroMetadataEnrichment,
  subscribeSpectroMetadata,
  type SpectroMetadataSnapshot
} from "../../infrastructure/database/spectroMetadataService";
import { getTmdbImageUrl } from "../../infrastructure/tmdb/TmdbService";
import type {
  SpectroAffinity,
  SpectroAnalysis,
  SpectroGraphNode
} from "../../domain/spectro";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";

type LoadState = "loading" | "ready" | "error";

const EMPTY_METADATA: SpectroMetadataSnapshot = {
  status: "idle",
  totalMovies: 0,
  processedMovies: 0,
  updatedMovies: 0,
  pendingMovies: 0,
  failedMovies: 0,
  notFoundMovies: 0,
  progressPercent: 100
};

function confidenceLabel(value: SpectroAffinity["confidence"] | "declarada"): string {
  if (value === "sólida") return "Consistente";
  if (value === "moderada") return "En desarrollo";
  if (value === "variable") return "Variable";
  if (value === "declarada") return "Explícita";
  return "Inicial";
}

function signed(value: number): string {
  return (value > 0 ? "+" : "") + value.toFixed(2);
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
  const strongest = [...items]
    .filter((item) => Math.abs(item.adjustedDifference) >= 0.05)
    .sort((a, b) => Math.abs(b.adjustedDifference) - Math.abs(a.adjustedDifference))
    .slice(0, 5);

  return (
    <section className="spectro-affinity-panel card-surface">
      <div className="spectro-panel-title"><span>{icon}</span><h3>{title}</h3></div>
      {strongest.length ? strongest.map((item) => {
        const position = 140 + (Math.max(-4, Math.min(4, item.adjustedDifference)) / 4) * 116;
        const positive = item.adjustedDifference >= 0;
        return (
          <div className="spectro-affinity-row" key={item.key}>
            <div className="spectro-affinity-heading">
              <strong>{item.label}</strong>
              <span>{item.averageRating.toFixed(1)}/10</span>
            </div>
            <svg
              className="spectro-diverging-chart"
              viewBox="0 0 280 32"
              role="img"
              aria-label={item.label + ": " + signed(item.adjustedDifference) + " ajustado frente a tu promedio"}
            >
              <line className="spectro-diverging-track" x1="24" y1="16" x2="256" y2="16" />
              <line className="spectro-diverging-axis" x1="140" y1="3" x2="140" y2="29" />
              <line
                className={positive ? "spectro-diverging-value is-positive" : "spectro-diverging-value is-negative"}
                x1="140" y1="16" x2={position} y2="16"
              />
              <circle
                className={positive ? "spectro-diverging-dot is-positive" : "spectro-diverging-dot is-negative"}
                cx={position} cy="16" r="5.5"
              />
            </svg>
            <div className="spectro-affinity-evidence">
              <small>
                {signed(item.adjustedDifference)} ajustado · {item.sampleSize} títulos · variación {item.dispersion.toFixed(1)}
              </small>
              <span className={"spectro-confidence is-" + item.confidence}>{confidenceLabel(item.confidence)}</span>
            </div>
          </div>
        );
      }) : (
        <p className="muted-copy spectro-panel-empty">
          Todavía no hay señales respaldadas en esta categoría.
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

function EvolutionChart({ analysis }: { analysis: SpectroAnalysis }) {
  const items = analysis.evolution;
  if (!items.length) {
    return <p className="muted-copy">Aún no hay calificaciones mensuales para mostrar la evolución.</p>;
  }

  const width = 820;
  const height = 240;
  const left = 42;
  const right = 24;
  const top = 18;
  const bottom = 48;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = items.map((item, index) => {
    const x = items.length === 1
      ? left + plotWidth / 2
      : left + (index / (items.length - 1)) * plotWidth;
    const y = top + ((10 - item.averageRating) / 10) * plotHeight;
    return { ...item, x, y };
  });
  const polyline = points.map((point) => point.x + "," + point.y).join(" ");
  const visibleLabels = points.filter((_, index) => (
    items.length <= 7 || index === 0 || index === points.length - 1 || index % 2 === 0
  ));

  return (
    <div className="spectro-evolution-chart card-surface">
      <svg
        viewBox={"0 0 " + width + " " + height}
        role="img"
        aria-label="Gráfico de línea de la calificación media mensual de tus visionados"
      >
        {[0, 2.5, 5, 7.5, 10].map((value) => {
          const y = top + ((10 - value) / 10) * plotHeight;
          return (
            <g key={value}>
              <line className="spectro-chart-grid" x1={left} y1={y} x2={width - right} y2={y} />
              <text className="spectro-chart-axis-label" x={left - 11} y={y + 4} textAnchor="end">{value}</text>
            </g>
          );
        })}
        <polyline className="spectro-evolution-line" points={polyline} />
        {points.map((point) => (
          <g key={point.month}>
            <circle className="spectro-evolution-point" cx={point.x} cy={point.y} r="5" />
            <title>{formatMonth(point.month) + ": " + point.averageRating.toFixed(1) + "/10 · " + point.viewingCount + " calificaciones"}</title>
          </g>
        ))}
        {visibleLabels.map((point) => (
          <text
            className="spectro-chart-month-label"
            key={point.month}
            x={point.x}
            y={height - 15}
            textAnchor="middle"
          >
            {formatMonth(point.month)}
          </text>
        ))}
      </svg>
      <div className="spectro-chart-caption">
        <span>Promedio mensual</span>
        <span>{items.reduce((sum, item) => sum + item.viewingCount, 0)} calificaciones</span>
      </div>
    </div>
  );
}

function graphNodeShortLabel(node: SpectroGraphNode): string {
  const label = node.kind === "signal" && node.source === "favoritos"
    ? "★ " + node.label
    : node.label;
  return label.length > 29 ? label.slice(0, 27) + "…" : label;
}

function SpectroDecisionGraph({ analysis }: { analysis: SpectroAnalysis }) {
  const graph = analysis.decisionGraph;
  const signals = graph.nodes.filter((node) => node.kind === "signal");
  const candidates = graph.nodes.filter((node) => node.kind === "candidate");
  const profile = graph.nodes.find((node) => node.kind === "profile");
  if (!profile) return null;

  const width = 1080;
  const signalGap = 82;
  const graphHeight = Math.max(360, 100 + signals.length * signalGap, 120 + candidates.length * 112);
  const profileHeight = 88;
  const signalHeight = 64;
  const candidateHeight = 76;
  const profileY = graphHeight / 2 - profileHeight / 2;
  const signalPositions = new Map(signals.map((node, index) => [
    node.id,
    45 + index * signalGap
  ]));
  const candidatePositions = new Map(candidates.map((node, index) => [
    node.id,
    candidates.length === 1
      ? graphHeight / 2 - candidateHeight / 2
      : 48 + index * ((graphHeight - 96 - candidateHeight) / (candidates.length - 1))
  ]));
  const positions = new Map<string, { x: number; y: number; width: number; height: number }>();
  positions.set(profile.id, { x: 22, y: profileY, width: 190, height: profileHeight });
  for (const node of signals) {
    positions.set(node.id, { x: 360, y: signalPositions.get(node.id) ?? 0, width: 264, height: signalHeight });
  }
  for (const node of candidates) {
    positions.set(node.id, { x: 804, y: candidatePositions.get(node.id) ?? 0, width: 254, height: candidateHeight });
  }

  return (
    <section className="spectro-graph-section card-surface" aria-labelledby="spectro-graph-title">
      <div className="content-caption">
        <div>
          <h2 id="spectro-graph-title">Cómo piensa Espectro</h2>
          <p className="muted-copy">Las conexiones muestran las señales reales que explican cada encaje.</p>
        </div>
        <Network size={19} className="accent-icon" />
      </div>
      <div className="spectro-graph-legend" aria-label="Leyenda del grafo">
        <span><i className="is-positive" /> Favorece</span>
        <span><i className="is-negative" /> Reduce el encaje</span>
        <span><i className="is-explicit" /> Favorito declarado</span>
      </div>
      <div className="spectro-graph-scroll">
        <svg
          className="spectro-decision-graph"
          viewBox={"0 0 " + width + " " + graphHeight}
          role="img"
          aria-label={"Grafo de decisiones de Espectro con " + graph.signalCount + " señales y " + graph.candidateCount + " películas candidatas"}
        >
          <defs>
            <marker id="spectro-arrow-positive" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="spectro-arrow-positive" />
            </marker>
            <marker id="spectro-arrow-negative" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" className="spectro-arrow-negative" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const source = positions.get(edge.source);
            const target = positions.get(edge.target);
            if (!source || !target) return null;
            const startX = source.x + source.width;
            const startY = source.y + source.height / 2;
            const endX = target.x;
            const endY = target.y + target.height / 2;
            const bend = Math.max(36, (endX - startX) * 0.42);
            const positive = edge.polarity === "positive";
            return (
              <g key={edge.id}>
                <path
                  className={positive ? "spectro-graph-edge is-positive" : "spectro-graph-edge is-negative"}
                  d={"M " + startX + " " + startY + " C " + (startX + bend) + " " + startY + ", " + (endX - bend) + " " + endY + ", " + endX + " " + endY}
                  markerEnd={positive ? "url(#spectro-arrow-positive)" : "url(#spectro-arrow-negative)"}
                  strokeWidth={Math.max(1.4, Math.min(4.5, 1.4 + Math.abs(edge.value) * 1.3))}
                />
                <title>{edge.kind === "preference" ? "Preferencia del perfil" : "Contribución al encaje"}: {signed(edge.value)}</title>
              </g>
            );
          })}
          {graph.nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            const isSignal = node.kind === "signal";
            const isCandidate = node.kind === "candidate";
            const nodeClass = isSignal
              ? node.source === "favoritos" ? "is-signal is-explicit" : "is-signal"
              : isCandidate ? "is-candidate" : "is-profile";
            const secondary = isCandidate
              ? "Encaje " + node.fitPercentage + "% · Nota " + node.predictedRating?.toFixed(1) + "/10"
              : node.detail;
            const evidenceText = node.evidence?.map((item) => (
              item.title + (item.rating === null ? " (favorita)" : " (" + item.rating.toFixed(1) + "/10)")
            )).join(", ");
            return (
              <g
                key={node.id}
                className={"spectro-graph-node " + nodeClass}
                aria-label={node.label + ". " + node.detail + (evidenceText ? ". Evidencia: " + evidenceText : "")}
              >
                <title>{node.label + " · " + node.detail + (evidenceText ? " · " + evidenceText : "")}</title>
                <rect
                  x={position.x}
                  y={position.y}
                  width={position.width}
                  height={position.height}
                  rx="12"
                />
                <text
                  className="spectro-graph-node-label"
                  x={position.x + 14}
                  y={position.y + 27}
                >
                  {graphNodeShortLabel(node)}
                </text>
                <text
                  className="spectro-graph-node-detail"
                  x={position.x + 14}
                  y={position.y + 48}
                >
                  {secondary.length > 37 ? secondary.slice(0, 35) + "…" : secondary}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="spectro-graph-note">
        Las líneas verdes muestran señales que elevan el encaje; las rojas, rasgos que lo reducen. Los favoritos son señales explícitas y no se transforman en notas.
      </p>
      {signals.some((node) => node.evidence?.length) && (
        <details className="spectro-graph-evidence">
          <summary>Ver las películas que respaldan las conexiones</summary>
          <div className="spectro-graph-evidence-list">
            {signals.map((node) => (
              <article className="spectro-graph-evidence-item" key={node.id}>
                <strong>{node.label}</strong>
                <small>{node.detail}</small>
                <p>
                  {(node.evidence ?? []).map((item) => (
                    item.title + (item.rating === null ? " · Favorita" : " · " + item.rating.toFixed(1) + "/10")
                  )).join("  ·  ")}
                </p>
              </article>
            ))}
          </div>
        </details>
      )}
      {!candidates.length && (
        <p className="muted-copy spectro-graph-empty">
          El grafo muestra tus señales respaldadas. Aún no hay candidatas locales con coincidencias suficientes.
        </p>
      )}
    </section>
  );
}

function SpectroMetadataStatus({ snapshot, onRetry }: {
  snapshot: SpectroMetadataSnapshot;
  onRetry: () => void;
}) {
  if (snapshot.status === "running") {
    return (
      <section className="spectro-metadata-status card-surface" role="status">
        <div className="spectro-metadata-heading">
          <RefreshCw size={17} className="accent-icon spectro-metadata-spin" />
          <strong>Espectro está completando información</strong>
          <span>{snapshot.progressPercent}%</span>
        </div>
        <div
          className="spectro-metadata-progress"
          role="progressbar"
          aria-label="Progreso de metadatos de Espectro"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={snapshot.progressPercent}
        >
          <span style={{ width: snapshot.progressPercent + "%" }} />
        </div>
        <p className="muted-copy">
          {snapshot.currentTitle ? "Consultando " + snapshot.currentTitle + ". " : ""}
          {snapshot.processedMovies} de {snapshot.totalMovies} películas revisadas. El análisis se actualizará con los datos que falten.
        </p>
      </section>
    );
  }

  if (snapshot.status === "unconfigured" && snapshot.pendingMovies > 0) {
    return (
      <section className="spectro-metadata-status card-surface" role="status">
        <div className="spectro-metadata-heading">
          <Fingerprint size={17} className="accent-icon" />
          <strong>Hay metadatos que pueden completarse</strong>
        </div>
        <p className="muted-copy">
          Conecta tu credencial TMDB en Ajustes para que Espectro complete automáticamente las señales que faltan, sin abrir cada ficha.
        </p>
        <a className="text-link" href="#/settings/catalog">Configurar TMDB ↗</a>
      </section>
    );
  }

  if (snapshot.status === "waiting-connection" && snapshot.pendingMovies > 0) {
    return (
      <section className="spectro-metadata-status card-surface" role="status">
        <div className="spectro-metadata-heading"><WifiOff size={17} /><strong>Espectro espera conexión</strong></div>
        <p className="muted-copy">Los datos locales siguen disponibles. La consulta a TMDB continuará cuando vuelva la conexión.</p>
      </section>
    );
  }

  if (snapshot.status === "error") {
    return (
      <section className="spectro-metadata-status card-surface" role="status">
        <div className="spectro-metadata-heading"><WifiOff size={17} /><strong>No se pudieron completar todos los metadatos</strong></div>
        <p className="muted-copy">{snapshot.lastError ?? "Revisa la credencial TMDB o tu conexión."}</p>
        <button className="button button-secondary" type="button" onClick={onRetry}>Reintentar</button>
      </section>
    );
  }

  if (snapshot.status === "completed" && snapshot.updatedMovies > 0) {
    return (
      <p className="spectro-metadata-complete" role="status">
        <CheckCircle2 size={15} /> Espectro incorporó metadatos de {snapshot.updatedMovies} películas.
      </p>
    );
  }

  return null;
}

function SpectroContent({
  analysis,
  metadata,
  onRetryMetadata
}: {
  analysis: SpectroAnalysis;
  metadata: SpectroMetadataSnapshot;
  onRetryMetadata: () => void;
}) {
  if (analysis.totalViewings === 0 && analysis.favoriteSignals.length === 0) {
    return (
      <>
        <SpectroMetadataStatus snapshot={metadata} onRetry={onRetryMetadata} />
        <EmptyState
          icon={<BrainCircuit size={26} />}
          title="Sin datos suficientes"
          description="Registra películas vistas y calificaciones. Espectro también reconocerá tus favoritos como señales explícitas."
          action={<a href="#/discover" className="button button-primary">Descubrir películas</a>}
        />
      </>
    );
  }

  return (
    <>
      <SpectroMetadataStatus snapshot={metadata} onRetry={onRetryMetadata} />
      <section className="spectro-summary-grid" aria-label="Resumen del análisis">
        <div className="spectro-summary-card"><span>Películas analizadas</span><strong>{analysis.movieCount}</strong></div>
        <div className="spectro-summary-card"><span>Visionados</span><strong>{analysis.totalViewings}</strong></div>
        <div className="spectro-summary-card"><span>Promedio por película</span><strong>{analysis.averageRating?.toFixed(1) ?? "—"}<small>/10</small></strong></div>
      </section>

      {!analysis.hasEnoughData && (
        <section className="spectro-insufficient card-surface" role="status">
          <Fingerprint size={23} className="accent-icon" />
          <div>
            <h2>Perfil en desarrollo</h2>
            <p>
              Necesitas tres películas distintas con calificación para calcular afinidades. Llevas {analysis.movieCount} de 3.
              Los favoritos ya cuentan como señales explícitas separadas.
            </p>
          </div>
        </section>
      )}

      <SpectroDecisionGraph analysis={analysis} />

      {analysis.hasEnoughData && (
        <section className="spectro-map card-surface" aria-labelledby="spectro-affinities-title">
          <div className="content-caption">
            <h2 id="spectro-affinities-title">Afinidades</h2>
            <span className="status-pill">Versión {analysis.algorithmVersion}</span>
          </div>
          <p className="muted-copy spectro-section-intro">
            La posición de cada punto muestra cuánto se aleja el rasgo de tu promedio por película: a favor o por debajo.
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
            Las señales iniciales son pistas, no preferencias confirmadas. Los revisionados se agregan dentro de cada título y no aumentan el soporte de películas distintas.
          </p>
        </section>
      )}

      <section className="spectro-evolution-section" aria-labelledby="spectro-evolution-title">
        <div className="content-caption">
          <h2 id="spectro-evolution-title">Evolución mensual</h2>
          <ChartLine size={19} className="accent-icon" />
        </div>
        <EvolutionChart analysis={analysis} />
      </section>

      {analysis.hasEnoughData && (
        <>
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
                  Compara los últimos 12 meses disponibles con los 12 anteriores. Cada título cuenta una vez por periodo.
                </p>
              </div>
            ) : (
              <p className="muted-copy spectro-trends-empty">
                Aún no hay dos periodos comparables. Se necesitan al menos tres películas distintas en cada periodo y rasgo.
              </p>
            )}
          </section>

          <section className="spectro-recommendations-section" aria-labelledby="spectro-recommendations-title">
            <div className="content-caption">
              <div><h2 id="spectro-recommendations-title">Podrían gustarte</h2></div>
              <Sparkles size={19} className="accent-icon" />
            </div>
            {analysis.recommendations.length ? (
              <>
                <p className="spectro-method-note">
                  Encaje: 0–100, una comparación relativa de señales, no una probabilidad. Nota estimada: proyección basada en tus calificaciones; no es una garantía.
                </p>
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
                        <div className="spectro-recommendation-metrics">
                          <div>
                            <span>Encaje estimado</span>
                            <strong>{item.fitPercentage}%</strong>
                          </div>
                          <div>
                            <span>Nota estimada</span>
                            <strong>{item.predictedRating.toFixed(1)}<small>/10</small></strong>
                          </div>
                          <span className={"spectro-confidence is-" + item.confidence}>{confidenceLabel(item.confidence)}</span>
                        </div>
                        <ul className="spectro-recommendation-reasons">
                          {item.reasons.slice(0, 7).map((reason) => (
                            <li key={reason.source + ":" + reason.key}>
                              <span>
                                {reason.source === "favoritos" ? <Star size={11} /> : null}
                                {reason.category}: {reason.label}
                              </span>
                              <small className={reason.contribution >= 0 ? "is-positive" : "is-negative"}>
                                {reason.contribution > 0 ? "+" : ""}{reason.contribution.toFixed(2)} · {reason.sampleSize} títulos
                              </small>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="spectro-no-recommendations card-surface">
                <Sparkles size={20} className="accent-icon" />
                <p>
                  Aún no hay candidatas locales con señales positivas suficientes. El grafo muestra las preferencias que sí tienen respaldo, incluidas las declaradas mediante favoritos.
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
  const [metadata, setMetadata] = useState<SpectroMetadataSnapshot>(EMPTY_METADATA);
  const lastRefreshAt = useRef(0);

  const refreshAnalysis = useCallback(async () => {
    try {
      const result = await getSpectroAnalysis();
      setAnalysis(result);
      setState("ready");
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo calcular Espectro.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSpectroMetadata((value) => {
      if (active) setMetadata(value);
    });
    const onOnline = () => { void startSpectroMetadataEnrichment(); };
    window.addEventListener("online", onOnline);

    void refreshAnalysis().then(async () => {
      if (!active) return;
      const current = await getSpectroMetadataSnapshot();
      if (!active) return;
      setMetadata(current);
      void startSpectroMetadataEnrichment();
    });

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("online", onOnline);
    };
  }, [refreshAnalysis]);

  useEffect(() => {
    if (metadata.processedMovies === 0) return;
    const shouldRefresh = (
      metadata.status !== "running"
      || metadata.processedMovies % 5 === 0
    );
    if (!shouldRefresh || metadata.processedMovies === lastRefreshAt.current) return;
    lastRefreshAt.current = metadata.processedMovies;
    void refreshAnalysis();
  }, [metadata.processedMovies, metadata.status, refreshAnalysis]);

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
          action={<button className="button button-secondary" type="button" onClick={() => void refreshAnalysis()}>Reintentar</button>}
        />
      ) : analysis ? (
        <SpectroContent
          analysis={analysis}
          metadata={metadata}
          onRetryMetadata={() => void startSpectroMetadataEnrichment()}
        />
      ) : null}
    </div>
  );
}
