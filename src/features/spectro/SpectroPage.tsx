import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowUpRight, BrainCircuit, CalendarDays, ChartLine,
  CheckCircle2, ChevronRight, Clapperboard, Film, Fingerprint, Languages,
  Network, RefreshCw, Search, Sparkles, Star, Timer, TrendingUp, Users,
  WifiOff, X, ZoomIn, ZoomOut
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
import {
  answerSpectroRatingQuestion,
  dismissSpectroRatingQuestion,
  getNextSpectroRatingQuestion,
  type SpectroRatingQuestion
} from "../../infrastructure/database/spectroQuestionService";
import type {
  SpectroAffinity,
  SpectroAnalysis,
  SpectroNetworkGraph,
  SpectroNetworkNode
} from "../../domain/spectro";
import { navigateBack } from "../../navigation/routeHistory";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";

export type SpectroSection = "home" | "map" | "affinities" | "evolution" | "recommendations";
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

const spectroLinks = [
  {
    title: "Mapa cinematográfico",
    description: "Películas, géneros, directores, actores y temas conectados.",
    href: "#/spectro/map",
    icon: Network
  },
  {
    title: "Afinidades",
    description: "Qué rasgos te atraen y cuáles suelen alejarte.",
    href: "#/spectro/affinities",
    icon: Fingerprint
  },
  {
    title: "Evolución",
    description: "Cómo cambian tus valoraciones y tus afinidades.",
    href: "#/spectro/evolution",
    icon: TrendingUp
  },
  {
    title: "Recomendaciones",
    description: "Encaje estimado, nota prevista y motivos verificables.",
    href: "#/spectro/recommendations",
    icon: Sparkles
  }
];

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

function SpectroPageBack({ title }: { title: string }) {
  return (
    <header className="section-heading">
      <div className="heading-with-back">
        <button
          type="button"
          className="back-link"
          aria-label="Volver a Espectro"
          onClick={() => navigateBack("/spectro")}
        >
          <ArrowLeft size={19} />
        </button>
        <h1>{title}</h1>
      </div>
    </header>
  );
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
    .slice(0, 6);

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
              <small>{signed(item.adjustedDifference)} ajustado · {item.sampleSize} títulos · variación {item.dispersion.toFixed(1)}</small>
              <span className={"spectro-confidence is-" + item.confidence}>{confidenceLabel(item.confidence)}</span>
            </div>
          </div>
        );
      }) : (
        <p className="muted-copy spectro-panel-empty">Todavía no hay señales respaldadas en esta categoría.</p>
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

function SpectroTrends({ analysis }: { analysis: SpectroAnalysis }) {
  return (
    <section className="spectro-trends-section" aria-labelledby="spectro-trends-title">
      <div className="content-caption">
        <div><h2 id="spectro-trends-title">Cambios recientes</h2></div>
        <TrendingUp size={19} className="accent-icon" />
      </div>
      {analysis.affinityTrends.length ? (
        <div className="spectro-trends-list card-surface">
          {analysis.affinityTrends.slice(0, 8).map((item) => (
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
          Conecta tu credencial TMDB en Ajustes para completar automáticamente géneros, equipo y temas, sin abrir cada ficha.
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

  if (snapshot.status === "completed" && snapshot.failedMovies > 0) {
    return (
      <section className="spectro-metadata-status card-surface" role="status">
        <div className="spectro-metadata-heading">
          <Fingerprint size={17} className="accent-icon" />
          <strong>Quedaron {snapshot.failedMovies} películas con datos incompletos</strong>
        </div>
        <p className="muted-copy">
          {snapshot.lastError ?? "Prisma conserva los metadatos obtenidos y no modifica tus visionados ni calificaciones."}
        </p>
        <button className="button button-secondary" type="button" onClick={onRetry}>Reintentar metadatos</button>
      </section>
    );
  }

  if (snapshot.status === "completed" && snapshot.updatedMovies > 0) {
    return (
      <p className="spectro-metadata-complete" role="status">
        <CheckCircle2 size={15} /> Espectro incorporó metadatos de {snapshot.updatedMovies} películas.
        {snapshot.notFoundMovies > 0 ? " " + snapshot.notFoundMovies + " no aparecen en TMDB." : ""}
      </p>
    );
  }

  return null;
}

function formatQuestionDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "long" })
    .format(new Date(year, month - 1, day));
}

function SpectroRatingQuestionCard({
  question,
  busy,
  error,
  onAnswer,
  onDismiss
}: {
  question: SpectroRatingQuestion;
  busy: boolean;
  error: string;
  onAnswer: (rating: number) => void;
  onDismiss: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  useEffect(() => setRating(null), [question.viewingId]);

  return (
    <section className="spectro-question-card card-surface" aria-labelledby="spectro-question-title">
      <div className="spectro-question-heading">
        <span className="spectro-question-icon"><BrainCircuit size={19} /></span>
        <div>
          <p className="spectro-question-eyebrow">Una pregunta para afinar tu perfil</p>
          <h2 id="spectro-question-title">¿Qué nota le darías a {question.title}?</h2>
          <p className="muted-copy">Visionado del {formatQuestionDate(question.watchedOn)} · No necesitas abrir la ficha.</p>
        </div>
      </div>
      <div className="spectro-question-rating" role="group" aria-label="Calificación del 1 al 10">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
          <button
            className={rating === value ? "spectro-question-score is-selected" : "spectro-question-score"}
            key={value}
            type="button"
            aria-pressed={rating === value}
            aria-label={"Calificar con " + value + " de 10"}
            disabled={busy}
            onClick={() => setRating(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="spectro-question-actions">
        <button
          className="button button-primary"
          type="button"
          disabled={busy || rating === null}
          onClick={() => { if (rating !== null) onAnswer(rating); }}
        >
          {busy ? "Guardando…" : "Guardar nota"}
        </button>
        <button className="button button-quiet" type="button" disabled={busy} onClick={onDismiss}>
          Pregúntame mañana
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p className="spectro-question-footnote">
        Tu respuesta se guarda en este visionado. No se crea otra experiencia ni se modifica su fecha o comentario.
      </p>
    </section>
  );
}

function nodeRadius(node: SpectroNetworkNode): number {
  return node.kind === "movie"
    ? 7 + node.influence * 13
    : 4.5 + node.influence * 9;
}

function networkNodeTypeLabel(kind: SpectroNetworkNode["kind"]): string {
  if (kind === "movie") return "Película";
  if (kind === "genre") return "Género";
  if (kind === "director") return "Director";
  if (kind === "actor") return "Actor";
  return "Tema";
}

function SpectroNetworkMap({ graph }: { graph: SpectroNetworkGraph }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(() => Math.max(
    0.2,
    Math.min(1, (window.innerWidth - 48) / graph.width, (window.innerHeight * 0.66) / graph.height)
  ));
  const nodeById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes]
  );
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;
  const selectedEdges = useMemo(
    () => selectedNode
      ? graph.edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
      : [],
    [graph.edges, selectedNode]
  );
  const relatedNodes = useMemo(() => selectedEdges.flatMap((edge) => {
    const relatedId = edge.source === selectedNode?.id ? edge.target : edge.source;
    const related = nodeById.get(relatedId);
    return related ? [related] : [];
  }), [nodeById, selectedEdges, selectedNode]);

  const activeNodeIds = useMemo(() => {
    const active = new Set<string>();
    const matching = new Set<string>();
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (normalizedQuery) {
      for (const node of graph.nodes) {
        if (node.label.toLocaleLowerCase().includes(normalizedQuery)) {
          matching.add(node.id);
          active.add(node.id);
        }
      }
      for (const edge of graph.edges) {
        if (matching.has(edge.source) || matching.has(edge.target)) {
          active.add(edge.source);
          active.add(edge.target);
        }
      }
    }
    if (selectedNode) {
      active.add(selectedNode.id);
      for (const edge of selectedEdges) {
        active.add(edge.source);
        active.add(edge.target);
      }
    }
    return active;
  }, [graph.edges, graph.nodes, query, selectedEdges, selectedNode]);

  const openMovie = (node: SpectroNetworkNode) => {
    if (!node.tmdbId) return;
    saveCurrentRouteScrollPosition();
    window.location.hash = "#/movie/" + node.tmdbId;
  };

  if (!graph.stats.movies) {
    return (
      <section className="spectro-network-empty card-surface">
        <Network size={28} className="accent-icon" />
        <h2>Tu mapa está esperando películas</h2>
        <p className="muted-copy">Añade películas a Prisma desde Descubrir. Cada título aparecerá como un nodo y se conectará con sus rasgos cuando haya metadatos.</p>
        <a className="button button-primary" href="#/discover">Descubrir películas</a>
      </section>
    );
  }

  return (
    <section className="spectro-network-section" aria-labelledby="spectro-network-title">
      <div className="spectro-network-intro">
        <div>
          <h2 id="spectro-network-title">Cada película, una conexión</h2>
          <p className="muted-copy">
            Las películas y sus rasgos forman la red. Los vínculos se calculan con tus notas, favoritos y metadatos locales.
          </p>
        </div>
        <div className="spectro-network-counts">
          <span><strong>{graph.stats.movies}</strong> películas</span>
          <span><strong>{graph.stats.features}</strong> rasgos</span>
          <span><strong>{graph.stats.connections}</strong> vínculos</span>
        </div>
      </div>

      <div className="spectro-network-controls">
        <label className="spectro-network-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar película o rasgo…"
            aria-label="Buscar película o rasgo en el mapa"
          />
          {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery("")}><X size={14} /></button>}
        </label>
        <div className="spectro-network-zoom" aria-label="Zoom del mapa">
          <button type="button" aria-label="Alejar mapa" onClick={() => setZoom((value) => Math.max(0.2, Math.round((value - 0.15) * 100) / 100))} disabled={zoom <= 0.2}>
            <ZoomOut size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Acercar mapa" onClick={() => setZoom((value) => Math.min(1.75, Math.round((value + 0.15) * 100) / 100))} disabled={zoom >= 1.75}>
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      <div className="spectro-network-legend" aria-label="Leyenda del mapa">
        <span><i className="is-movie" /> Película</span>
        <span><i className="is-genre" /> Género</span>
        <span><i className="is-director" /> Director</span>
        <span><i className="is-actor" /> Actor</span>
        <span><i className="is-theme" /> Tema</span>
        <span className="spectro-network-legend-line">Grosor y brillo = fuerza del vínculo · Tamaño = influencia en recomendaciones</span>
      </div>

      <div className="spectro-network-viewport" aria-label="Mapa interactivo; desplázate para explorar y selecciona una bolita para ver sus conexiones">
        <svg
          className="spectro-network-svg"
          width={Math.round(graph.width * zoom)}
          height={Math.round(graph.height * zoom)}
          viewBox={"0 0 " + graph.width + " " + graph.height}
          role="group"
          aria-label={"Red de " + graph.stats.movies + " películas y " + graph.stats.features + " rasgos"}
        >
          <defs>
            <filter id="spectro-network-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {graph.clusters.map((cluster) => (
            <g key={cluster.id} className={cluster.exploredCount === 0 ? "spectro-network-cluster is-unexplored" : "spectro-network-cluster"}>
              <circle cx={cluster.x} cy={cluster.y} r={cluster.radius} />
              <text x={cluster.x} y={cluster.y - cluster.radius - 9} textAnchor="middle">{cluster.label}</text>
              <text className="spectro-network-cluster-count" x={cluster.x} y={cluster.y - cluster.radius + 8} textAnchor="middle">
                {cluster.exploredCount} vistas · {cluster.unexploredCount} por explorar
              </text>
            </g>
          ))}

          {graph.edges.map((edge) => {
            const source = nodeById.get(edge.source);
            const target = nodeById.get(edge.target);
            if (!source || !target) return null;
            const hasFocus = activeNodeIds.size > 0;
            const dim = hasFocus && (!activeNodeIds.has(edge.source) || !activeNodeIds.has(edge.target));
            return (
              <line
                key={edge.id}
                className={"spectro-network-edge is-" + edge.polarity}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                strokeWidth={0.75 + edge.strength * 4.2}
                opacity={dim ? 0.07 : 0.16 + edge.strength * 0.78}
                filter={edge.strength >= 0.78 && !dim ? "url(#spectro-network-glow)" : undefined}
              >
                <title>
                  {edge.category + " · vínculo " + Math.round(edge.strength * 100) + "% · " + edge.polarity}
                </title>
              </line>
            );
          })}

          {graph.nodes.map((node, index) => {
            const radius = nodeRadius(node);
            const selected = selectedNodeId === node.id;
            const hasFocus = activeNodeIds.size > 0;
            const dim = hasFocus && !activeNodeIds.has(node.id);
            const unexplored = node.kind === "movie"
              ? node.state === "unexplored"
              : node.exploredConnections === 0;
            const opacity = dim ? 0.12 : unexplored ? 0.38 : 1;
            const clipId = "spectro-movie-clip-" + index;
            const posterUrl = node.kind === "movie"
              ? getTmdbImageUrl("https://image.tmdb.org/t/p/", node.posterPath, "w185")
              : null;
            return (
              <g
                key={node.id}
                className={[
                  "spectro-network-node",
                  "is-" + node.kind,
                  unexplored ? "is-unexplored" : "",
                  selected ? "is-selected" : ""
                ].filter(Boolean).join(" ")}
                role="button"
                tabIndex={0}
                aria-label={node.label + ". " + node.detail + ". Influencia " + Math.round(node.influence * 100) + "%"}
                aria-pressed={selected}
                opacity={opacity}
                onClick={() => setSelectedNodeId(selected ? null : node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedNodeId(selected ? null : node.id);
                  }
                }}
              >
                {node.kind === "movie" ? (
                  <>
                    <defs>
                      <clipPath id={clipId}><circle cx={node.x} cy={node.y} r={radius} /></clipPath>
                    </defs>
                    {posterUrl ? (
                      <image
                        href={posterUrl}
                        x={node.x - radius}
                        y={node.y - radius}
                        width={radius * 2}
                        height={radius * 2}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={"url(#" + clipId + ")"}
                      />
                    ) : (
                      <circle className="spectro-network-movie-fallback" cx={node.x} cy={node.y} r={radius} />
                    )}
                    <circle className="spectro-network-node-outline" cx={node.x} cy={node.y} r={radius} />
                  </>
                ) : (
                  <>
                    <circle cx={node.x} cy={node.y} r={radius} />
                    {(node.influence >= 0.78 || node.connections >= 8 || selected) && (
                      <text x={node.x} y={node.y + radius + 10} textAnchor="middle">
                        {node.label.length > 20 ? node.label.slice(0, 18) + "…" : node.label}
                      </text>
                    )}
                  </>
                )}
                <title>
                  {node.label + " · " + node.detail + " · influencia " + Math.round(node.influence * 100) + "%"}
                </title>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="spectro-network-explainer">
        Las zonas apagadas representan películas de tu catálogo local que aún no tienen visionados registrados. No muestran todo TMDB, sino lo que Prisma conoce en este dispositivo.
      </p>

      {selectedNode && (
        <section className="spectro-network-selection card-surface" aria-live="polite">
          <div className="spectro-network-selection-heading">
            <div>
              <span>{networkNodeTypeLabel(selectedNode.kind)}</span>
              <h3>{selectedNode.label}</h3>
            </div>
            <button type="button" aria-label="Cerrar detalle" onClick={() => setSelectedNodeId(null)}><X size={16} /></button>
          </div>
          <p className="muted-copy">{selectedNode.detail}</p>
          <div className="spectro-network-selection-metrics">
            <span><strong>{Math.round(selectedNode.influence * 100)}%</strong> influencia</span>
            <span><strong>{selectedNode.connections}</strong> vínculos</span>
            <span><strong>{selectedNode.recommendationCount}</strong> recomendaciones relacionadas</span>
          </div>
          {selectedNode.kind === "movie" ? (
            <>
              <div className="spectro-network-selection-movie-stats">
                {selectedNode.rating !== undefined && (
                  <span><strong>{selectedNode.rating.toFixed(1)}/10</strong> tu nota</span>
                )}
                {selectedNode.fitPercentage !== undefined && (
                  <span><strong>{selectedNode.fitPercentage}%</strong> encaje calculado</span>
                )}
                {selectedNode.predictedRating !== undefined && (
                  <span><strong>{selectedNode.predictedRating.toFixed(1)}/10</strong> nota prevista</span>
                )}
              </div>
              <div className="spectro-network-related">
                <strong>Rasgos conectados</strong>
                {relatedNodes.filter((node) => node.kind !== "movie").length ? (
                  <div>
                    {[...selectedEdges].sort((a, b) => b.strength - a.strength).slice(0, 12).map((edge) => {
                      const node = nodeById.get(edge.source === selectedNode.id ? edge.target : edge.source);
                      if (!node || node.kind === "movie") return null;
                      return (
                        <button type="button" key={node.id} onClick={() => setSelectedNodeId(node.id)}>
                          <span>{networkNodeTypeLabel(node.kind)} · {node.label}</span>
                          <small>Vínculo {Math.round(edge.strength * 100)}%</small>
                        </button>
                      );
                    })}
                  </div>
                ) : <p className="muted-copy">Esta película todavía no tiene metadatos suficientes para dibujar sus conexiones.</p>}
              </div>
              <button className="button button-secondary" type="button" onClick={() => openMovie(selectedNode)}>
                Abrir ficha de la película
              </button>
            </>
          ) : (
            <div className="spectro-network-related">
              <strong>Películas conectadas</strong>
              {selectedEdges.length ? (
                <div>
                  {[...selectedEdges].sort((a, b) => b.strength - a.strength).slice(0, 12).map((edge) => {
                    const node = nodeById.get(edge.source === selectedNode.id ? edge.target : edge.source);
                    if (!node || node.kind !== "movie") return null;
                    return (
                      <button type="button" key={node.id} onClick={() => setSelectedNodeId(node.id)}>
                        <span>{node.label}</span>
                        <small>{node.state === "explored" ? "Vista" : "Por explorar"} · {Math.round(edge.strength * 100)}%</small>
                      </button>
                    );
                  })}
                </div>
              ) : <p className="muted-copy">No hay películas conectadas a este rasgo.</p>}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function SpectroHome({
  analysis,
  metadata,
  onRetryMetadata,
  question,
  questionBusy,
  questionError,
  onQuestionAnswer,
  onQuestionDismiss
}: {
  analysis: SpectroAnalysis;
  metadata: SpectroMetadataSnapshot;
  onRetryMetadata: () => void;
  question: SpectroRatingQuestion | null;
  questionBusy: boolean;
  questionError: string;
  onQuestionAnswer: (rating: number) => void;
  onQuestionDismiss: () => void;
}) {
  const graph = analysis.networkGraph;
  return (
    <div className="page">
      <h1 className="sr-only">Espectro</h1>
      {question && (
        <SpectroRatingQuestionCard
          question={question}
          busy={questionBusy}
          error={questionError}
          onAnswer={onQuestionAnswer}
          onDismiss={onQuestionDismiss}
        />
      )}
      <SpectroMetadataStatus snapshot={metadata} onRetry={onRetryMetadata} />
      <section className="profile-summary card-surface spectro-profile-summary">
        <div className="avatar-placeholder"><BrainCircuit size={27} /></div>
        <div className="profile-summary-copy">
          <span className="card-title">Espectro</span>
          <span className="muted-copy">Tu mapa personal de conexiones cinematográficas.</span>
        </div>
        <Sparkles size={20} className="subtle-icon" />
        <div className="profile-metrics">
          <div><strong>{graph.stats.movies}</strong><span>Películas en el mapa</span></div>
          <div><strong>{graph.stats.explored}</strong><span>Exploradas</span></div>
          <div><strong>{graph.stats.unexplored}</strong><span>Por explorar</span></div>
          <div><strong>{analysis.averageRating?.toFixed(1) ?? "—"}</strong><span>Promedio personal</span></div>
        </div>
      </section>
      <div className="navigation-cards spectro-navigation-cards">
        {spectroLinks.map((item) => {
          const Icon = item.icon;
          const description = item.title === "Mapa cinematográfico"
            ? graph.stats.movies + " películas · " + graph.stats.features + " rasgos · " + graph.stats.connections + " conexiones."
            : item.title === "Afinidades"
              ? (analysis.genreAffinities.length + analysis.directorAffinities.length + analysis.castAffinities.length + analysis.themeAffinities.length) + " señales cinematográficas respaldadas."
              : item.title === "Evolución"
                ? analysis.affinityTrends.length + " cambios de afinidad detectados."
                : analysis.recommendations.length + " películas con encaje calculado.";
          return (
            <a className="navigation-card card-surface" href={item.href} key={item.title}>
              <span className="navigation-card-icon"><Icon size={22} /></span>
              <span className="navigation-card-copy">
                <strong>{item.title}</strong>
                <span>{description || item.description}</span>
              </span>
              <ChevronRight size={19} className="subtle-icon" />
            </a>
          );
        })}
      </div>
      {analysis.movieCount < 3 && (
        <section className="spectro-insufficient card-surface" role="status">
          <Fingerprint size={23} className="accent-icon" />
          <div>
            <h2>Perfil en desarrollo</h2>
            <p>
              Necesitas tres películas distintas con calificación para estimar afinidades. Llevas {analysis.movieCount} de 3.
              Tus favoritos ya aparecen como señales explícitas, sin convertirse en notas.
            </p>
          </div>
        </section>
      )}
      <p className="spectro-version-note">
        Espectro {analysis.algorithmVersion} · Análisis local actualizado {new Date(analysis.computedAt).toLocaleString("es-PA")}
      </p>
    </div>
  );
}

function SpectroAffinitiesPage({ analysis }: { analysis: SpectroAnalysis }) {
  return (
    <div className="page">
      <SpectroPageBack title="Afinidades" />
      <section className="spectro-map card-surface" aria-labelledby="spectro-affinities-title">
        <div className="content-caption">
          <h2 id="spectro-affinities-title">Rasgos que definen tu gusto</h2>
          <span className="status-pill">Versión {analysis.algorithmVersion}</span>
        </div>
        <p className="muted-copy spectro-section-intro">
          Cada afinidad compara las notas de películas distintas con tu promedio. Las señales positivas y negativas participan en el encaje.
        </p>
        <div className="spectro-affinity-grid">
          <AffinityPanel title="Géneros" icon={<Film size={17} />} items={analysis.genreAffinities} />
          <AffinityPanel title="Directores" icon={<Clapperboard size={17} />} items={analysis.directorAffinities} />
          <AffinityPanel title="Actores" icon={<Users size={17} />} items={analysis.castAffinities} />
          <AffinityPanel title="Temas" icon={<Sparkles size={17} />} items={analysis.themeAffinities} />
          <AffinityPanel title="Países" icon={<Network size={17} />} items={analysis.countryAffinities} />
          <AffinityPanel title="Épocas" icon={<CalendarDays size={17} />} items={analysis.decadeAffinities} />
          <AffinityPanel title="Idioma original" icon={<Languages size={17} />} items={analysis.languageAffinities} />
          <AffinityPanel title="Duración" icon={<Timer size={17} />} items={analysis.durationAffinities} />
        </div>
        <p className="spectro-method-note">
          Una afinidad inicial es una pista, no una preferencia confirmada. Los revisionados se promedian dentro de cada título y no aumentan la muestra.
        </p>
      </section>
    </div>
  );
}

function SpectroEvolutionPage({ analysis }: { analysis: SpectroAnalysis }) {
  return (
    <div className="page">
      <SpectroPageBack title="Evolución" />
      <section className="spectro-evolution-section" aria-labelledby="spectro-evolution-title">
        <div className="content-caption">
          <h2 id="spectro-evolution-title">Evolución mensual</h2>
          <ChartLine size={19} className="accent-icon" />
        </div>
        <EvolutionChart analysis={analysis} />
      </section>
      <SpectroTrends analysis={analysis} />
    </div>
  );
}

function SpectroRecommendationsPage({ analysis }: { analysis: SpectroAnalysis }) {
  return (
    <div className="page">
      <SpectroPageBack title="Recomendaciones" />
      <section className="spectro-recommendations-section" aria-labelledby="spectro-recommendations-title">
        <div className="content-caption">
          <div><h2 id="spectro-recommendations-title">Podrían gustarte</h2></div>
          <Sparkles size={19} className="accent-icon" />
        </div>
        <p className="spectro-method-note">
          Encaje: 0–100, una comparación relativa de señales, no una probabilidad. Nota estimada: proyección basada en tus calificaciones; no es una garantía.
        </p>
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
                  <div className="spectro-recommendation-metrics">
                    <div><span>Encaje estimado</span><strong>{item.fitPercentage}%</strong></div>
                    <div><span>Nota estimada</span><strong>{item.predictedRating.toFixed(1)}<small>/10</small></strong></div>
                    <span className={"spectro-confidence is-" + item.confidence}>{confidenceLabel(item.confidence)}</span>
                  </div>
                  <ul className="spectro-recommendation-reasons">
                    {item.reasons.slice(0, 8).map((reason) => (
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
        ) : (
          <div className="spectro-no-recommendations card-surface">
            <Sparkles size={20} className="accent-icon" />
            <p>
              Aún no hay candidatas locales con señales positivas suficientes. El mapa muestra las preferencias respaldadas y las películas que todavía están por explorar.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export function SpectroPage({ section = "home" }: { section?: SpectroSection }) {
  const [analysis, setAnalysis] = useState<SpectroAnalysis | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<SpectroMetadataSnapshot>(EMPTY_METADATA);
  const [question, setQuestion] = useState<SpectroRatingQuestion | null>(null);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionError, setQuestionError] = useState("");
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

  const refreshQuestion = useCallback(async () => {
    try {
      setQuestion(await getNextSpectroRatingQuestion());
    } catch {
      setQuestion(null);
    }
  }, []);

  const handleQuestionAnswer = useCallback(async (rating: number) => {
    if (!question || questionBusy) return;
    setQuestionBusy(true);
    setQuestionError("");
    try {
      await answerSpectroRatingQuestion(question.viewingId, rating);
      setQuestion(null);
      await refreshAnalysis();
      await refreshQuestion();
    } catch (cause) {
      setQuestionError(cause instanceof Error ? cause.message : "No se pudo guardar la calificación.");
    } finally {
      setQuestionBusy(false);
    }
  }, [question, questionBusy, refreshAnalysis, refreshQuestion]);

  const handleQuestionDismiss = useCallback(async () => {
    if (questionBusy) return;
    setQuestionBusy(true);
    setQuestionError("");
    try {
      await dismissSpectroRatingQuestion();
      setQuestion(null);
    } catch (cause) {
      setQuestionError(cause instanceof Error ? cause.message : "No se pudo posponer la pregunta.");
    } finally {
      setQuestionBusy(false);
    }
  }, [questionBusy]);

  useEffect(() => {
    if (section === "home") void refreshQuestion();
    else setQuestion(null);
  }, [refreshQuestion, section]);

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
    const shouldRefresh = metadata.status !== "running" || metadata.processedMovies % 5 === 0;
    if (!shouldRefresh || metadata.processedMovies === lastRefreshAt.current) return;
    lastRefreshAt.current = metadata.processedMovies;
    void refreshAnalysis();
  }, [metadata.processedMovies, metadata.status, refreshAnalysis]);

  if (state === "loading") {
    return <div className="page"><div className="detail-loading"><span>Analizando…</span></div></div>;
  }
  if (state === "error" || !analysis) {
    return (
      <div className="page">
        {section !== "home" && <SpectroPageBack title="Espectro" />}
        <EmptyState
          icon={<BrainCircuit size={26} />}
          title="No se pudo calcular Espectro"
          description={error}
          action={<button className="button button-secondary" type="button" onClick={() => void refreshAnalysis()}>Reintentar</button>}
        />
      </div>
    );
  }

  if (section === "map") {
    return (
      <div className="page">
        <SpectroPageBack title="Mapa cinematográfico" />
        <SpectroMetadataStatus snapshot={metadata} onRetry={() => void startSpectroMetadataEnrichment(true)} />
        <SpectroNetworkMap graph={analysis.networkGraph} />
      </div>
    );
  }
  if (section === "affinities") return <SpectroAffinitiesPage analysis={analysis} />;
  if (section === "evolution") return <SpectroEvolutionPage analysis={analysis} />;
  if (section === "recommendations") return <SpectroRecommendationsPage analysis={analysis} />;

  return (
    <SpectroHome
      analysis={analysis}
      metadata={metadata}
      onRetryMetadata={() => void startSpectroMetadataEnrichment(true)}
      question={question}
      questionBusy={questionBusy}
      questionError={questionError}
      onQuestionAnswer={(rating) => void handleQuestionAnswer(rating)}
      onQuestionDismiss={() => void handleQuestionDismiss()}
    />
  );
}
