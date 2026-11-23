import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { SpectroAnalysis } from "../../domain/spectro";
import type {
  SpectroAnalytics,
  SpectroCategoryPoint,
  SpectroMonthlyPoint,
  SpectroRatingPoint
} from "../../domain/spectroAnalytics";

type SectionKey = "resumen" | "actividad" | "calificaciones" | "cine" | "perfil" | "biblioteca";

const SECTIONS: Array<{ id: SectionKey; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "actividad", label: "Actividad" },
  { id: "calificaciones", label: "Calificaciones" },
  { id: "cine", label: "Universo" },
  { id: "perfil", label: "Perfil" },
  { id: "biblioteca", label: "Biblioteca" }
];

function number(value: number): string {
  return value.toLocaleString("es-PA");
}

function rating(value: number | null): string {
  return value === null ? "—" : value.toFixed(1) + "/10";
}

function ChartCard({
  title,
  description,
  tag,
  children
}: {
  title: string;
  description?: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <article className="spectro-chart-card">
      <header className="spectro-chart-heading">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {tag && <span className="spectro-chart-tag">{tag}</span>}
      </header>
      <div className="spectro-chart-content">{children}</div>
    </article>
  );
}

type ChartDataRow = { label: string; value: string; detail?: string };

/** Alternativa estructurada para que los datos de cada gráfica se puedan explorar sin depender del SVG. */
function ChartDataTable({ caption, rows }: { caption: string; rows: ChartDataRow[] }) {
  if (!rows.length) return null;
  return (
    <details className="spectro-chart-data">
      <summary>Ver datos de la gráfica en tabla</summary>
      <div className="spectro-chart-data-table-wrap">
        <table className="spectro-chart-data-table">
          <caption>{caption}</caption>
          <thead>
            <tr><th scope="col">Categoría</th><th scope="col">Valor</th><th scope="col">Detalle</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
                <td>{row.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function EmptyChart({ children = "No hay datos suficientes para esta gráfica." }: { children?: string }) {
  return <p className="spectro-chart-empty">{children}</p>;
}

function HorizontalBars({
  items,
  suffix = "películas",
  showPercentage = true
}: {
  items: SpectroCategoryPoint[];
  suffix?: string;
  showPercentage?: boolean;
}) {
  if (!items.length) return <EmptyChart />;
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <>
      <div className="spectro-horizontal-bars">
      {items.map((item, index) => (
        <div className="spectro-horizontal-bar-row" key={item.label}>
          <div className="spectro-horizontal-bar-heading">
            <span title={item.label}>{item.label}</span>
            <strong>{number(item.count)} <small>{suffix}</small></strong>
          </div>
          <div className="spectro-horizontal-bar-track" role="img" aria-label={item.label + ": " + item.count + " " + suffix}>
            <span
              className={"spectro-horizontal-bar-fill spectro-chart-color-" + (index % 6)}
              style={{ width: Math.max(2, (item.count / maximum) * 100) + "%" }}
            />
          </div>
          {showPercentage && <small className="spectro-horizontal-bar-meta">{item.percentage.toLocaleString("es-PA", { maximumFractionDigits: 1 })}% del total</small>}
        </div>
      ))}
    </div>
      <ChartDataTable caption="Distribución por categoría" rows={items.map((item) => ({ label: item.label, value: number(item.count) + " " + suffix, detail: showPercentage ? item.percentage.toLocaleString("es-PA", { maximumFractionDigits: 1 }) + "% del total" : undefined }))} />
    </>
  );
}

function analyticsRatingShare(count: number, items: SpectroRatingPoint[]): string {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return total ? (count / total * 100).toLocaleString("es-PA", { maximumFractionDigits: 1 }) + "% del total" : "Sin visionados";
}

function RatingColumns({ items }: { items: SpectroRatingPoint[] }) {
  if (!items.some((item) => item.count > 0)) return <EmptyChart />;
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <>
      <div className="spectro-rating-columns" role="img" aria-label="Distribución de calificaciones de uno a diez por visionado">
      {items.map((item) => (
        <div className="spectro-rating-column" key={item.rating} title={item.rating + "/10: " + item.count + " visionados"}>
          <span className="spectro-rating-column-count">{item.count || ""}</span>
          <div className="spectro-rating-column-track">
            <span style={{ height: (item.count / maximum) * 100 + "%" }} />
          </div>
          <strong>{item.rating}</strong>
        </div>
      ))}
    </div>
      <ChartDataTable caption="Cantidad de visionados por calificación" rows={items.map((item) => ({ label: item.rating + "/10", value: number(item.count) + " visionados", detail: analyticsRatingShare(item.count, items) }))} />
    </>
  );
}

function MonthlyActivityChart({ points }: { points: SpectroMonthlyPoint[] }) {
  if (!points.length) return <EmptyChart />;
  const width = Math.max(620, points.length * 34);
  const height = 220;
  const left = 30;
  const right = 12;
  const top = 22;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(1, ...points.map((item) => item.viewings));
  const coordinates = points.map((item, index) => ({
    x: left + (points.length === 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: top + plotHeight - (item.viewings / maximum) * plotHeight
  }));
  const line = coordinates.map((point) => point.x + "," + point.y).join(" ");
  const area = left + "," + (top + plotHeight) + " " + line + " " + (left + plotWidth) + "," + (top + plotHeight);
  const labelStep = Math.max(1, Math.ceil(points.length / 12));

  return (
    <>
      <div className="spectro-svg-scroll">
      <svg className="spectro-line-chart" viewBox={"0 0 " + width + " " + height} role="img" aria-label="Visionados por mes a lo largo del historial">
        <line className="spectro-chart-axis" x1={left} y1={top + plotHeight} x2={width - right} y2={top + plotHeight} />
        <polygon className="spectro-chart-area" points={area} />
        <polyline className="spectro-chart-line" points={line} />
        {coordinates.map((point, index) => (
          <circle className="spectro-chart-point" key={points[index].key} cx={point.x} cy={point.y} r="3">
            <title>{points[index].label}: {points[index].viewings} visionados · {points[index].uniqueMovies} películas distintas</title>
          </circle>
        ))}
        {points.map((item, index) => (
          index % labelStep === 0 || index === points.length - 1 ? (
            <text className="spectro-chart-label" key={item.key} x={coordinates[index].x} y={height - 12} textAnchor="middle">{item.label}</text>
          ) : null
        ))}
        <text className="spectro-chart-label" x="4" y={top + 4}>{maximum}</text>
        <text className="spectro-chart-label" x="13" y={top + plotHeight}>{0}</text>
      </svg>
    </div>
      <ChartDataTable caption="Visionados y películas únicas por mes" rows={points.map((item) => ({ label: item.label, value: number(item.viewings) + " visionados", detail: number(item.uniqueMovies) + " películas distintas" }))} />
    </>
  );
}

function MonthlyRatingChart({ points }: { points: SpectroMonthlyPoint[] }) {
  const rated = points.filter((point) => point.averageRating !== null);
  if (!rated.length) return <EmptyChart />;
  const width = Math.max(620, rated.length * 42);
  const height = 210;
  const left = 34;
  const right = 12;
  const top = 20;
  const bottom = 36;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const coordinates = rated.map((item, index) => ({
    x: left + (rated.length === 1 ? plotWidth / 2 : (index / (rated.length - 1)) * plotWidth),
    y: top + plotHeight - ((item.averageRating ?? 0) / 10) * plotHeight
  }));
  const line = coordinates.map((point) => point.x + "," + point.y).join(" ");
  const step = Math.max(1, Math.ceil(rated.length / 10));

  return (
    <>
      <div className="spectro-svg-scroll">
      <svg className="spectro-line-chart" viewBox={"0 0 " + width + " " + height} role="img" aria-label="Promedio de calificaciones por mes">
        {[0, 2, 4, 6, 8, 10].map((value) => {
          const y = top + plotHeight - (value / 10) * plotHeight;
          return (
            <g key={value}>
              <line className="spectro-chart-gridline" x1={left} y1={y} x2={width - right} y2={y} />
              <text className="spectro-chart-label" x="5" y={y + 3}>{value}</text>
            </g>
          );
        })}
        <polyline className="spectro-chart-line is-rating" points={line} />
        {coordinates.map((point, index) => (
          <circle className="spectro-chart-point is-rating" key={rated[index].key} cx={point.x} cy={point.y} r="3">
            <title>{rated[index].label}: {rated[index].averageRating?.toFixed(1)}/10 · {rated[index].ratedViewings} notas</title>
          </circle>
        ))}
        {rated.map((item, index) => (
          index % step === 0 || index === rated.length - 1 ? (
            <text className="spectro-chart-label" key={item.key} x={coordinates[index].x} y={height - 11} textAnchor="middle">{item.label}</text>
          ) : null
        ))}
      </svg>
    </div>
      <ChartDataTable caption="Promedio de calificaciones por mes" rows={rated.map((item) => ({ label: item.label, value: (item.averageRating ?? 0).toFixed(1) + "/10", detail: number(item.ratedViewings) + " notas registradas" }))} />
    </>
  );
}

function DonutChart({ items }: { items: SpectroCategoryPoint[] }) {
  const visible = items.filter((item) => item.count > 0);
  const total = visible.reduce((sum, item) => sum + item.count, 0);
  if (!total) return <EmptyChart />;
  const circumference = Math.PI * 86;
  let consumed = 0;
  return (
    <>
      <div className="spectro-donut-layout">
      <svg className="spectro-donut" viewBox="0 0 120 120" role="img" aria-label={visible.map((item) => item.label + ": " + item.count).join(", ")}>
        <circle className="spectro-donut-track" cx="60" cy="60" r="43" />
        {visible.map((item, index) => {
          const length = (item.count / total) * circumference;
          const offset = consumed;
          consumed += length;
          return (
            <circle
              className={"spectro-donut-segment spectro-chart-color-" + (index % 6)}
              key={item.label}
              cx="60"
              cy="60"
              r="43"
              strokeDasharray={length + " " + circumference}
              strokeDashoffset={-offset}
            >
              <title>{item.label}: {item.count} ({item.percentage}%)</title>
            </circle>
          );
        })}
        <text className="spectro-donut-total" x="60" y="57" textAnchor="middle">{number(total)}</text>
        <text className="spectro-donut-caption" x="60" y="70" textAnchor="middle">registros</text>
      </svg>
      <div className="spectro-donut-legend">
        {visible.map((item, index) => (
          <div key={item.label}>
            <span className={"spectro-donut-key spectro-chart-color-" + (index % 6)} />
            <span>{item.label}</span>
            <strong>{item.count}</strong>
            <small>{item.percentage.toLocaleString("es-PA", { maximumFractionDigits: 1 })}%</small>
          </div>
        ))}
      </div>
    </div>
      <ChartDataTable caption="Distribución de la categoría" rows={visible.map((item) => ({ label: item.label, value: number(item.count) + " registros", detail: item.percentage.toLocaleString("es-PA", { maximumFractionDigits: 1 }) + "% del total" }))} />
    </>
  );
}

function HourHeatmap({ cells, total }: { cells: number[][]; total: number }) {
  if (!total) return <EmptyChart>Prisma todavía no tiene horas locales suficientes guardadas en tus visionados.</EmptyChart>;
  const maximum = Math.max(1, ...cells.flat());
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return (
    <>
      <div className="spectro-heatmap-wrap">
      <div className="spectro-heatmap-scroll">
      <div className="spectro-heatmap">
        <div className="spectro-heatmap-corner" />
        {Array.from({ length: 24 }, (_, hour) => (
          <span className="spectro-heatmap-hour" key={hour}>{hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</span>
        ))}
        {cells.map((row, dayIndex) => (
          <div className="spectro-heatmap-row" key={days[dayIndex]}>
            <span className="spectro-heatmap-day">{days[dayIndex]}</span>
            {row.map((count, hour) => {
              const level = count === 0 ? 0 : Math.max(1, Math.ceil((count / maximum) * 4));
              return (
                <span
                  className={"spectro-heatmap-cell is-" + level}
                  key={hour}
                  title={days[dayIndex] + " · " + String(hour).padStart(2, "0") + ":00 · " + count + " visionados"}
                  aria-label={days[dayIndex] + " " + hour + " horas: " + count + " visionados"}
                />
              );
            })}
          </div>
        ))}
      </div>
      </div>
      <div className="spectro-heatmap-scale"><span>Menos</span><i className="is-0" /><i className="is-1" /><i className="is-2" /><i className="is-3" /><i className="is-4" /><span>Más</span></div>
      <p className="spectro-chart-footnote">{number(total)} visionados con hora local registrada. La hora del día se interpreta como fue guardada en Prisma.</p>
    </div>
      <ChartDataTable caption="Visionados por día y hora local" rows={cells.flatMap((row, dayIndex) => row.map((count, hour) => ({ label: days[dayIndex] + " · " + String(hour).padStart(2, "0") + ":00", value: number(count) + " visionados" })))} />
    </>
  );
}

function RewatchBars({ items }: { items: Array<{ title: string; viewings: number }> }) {
  if (!items.length) return <EmptyChart>Cuando registres la segunda sesión de una película, aparecerá aquí.</EmptyChart>;
  const max = Math.max(1, ...items.map((item) => item.viewings));
  return (
    <>
      <div className="spectro-horizontal-bars">
      {items.map((item) => (
        <div className="spectro-horizontal-bar-row" key={item.title}>
          <div className="spectro-horizontal-bar-heading">
            <span title={item.title}>{item.title}</span>
            <strong>{item.viewings} <small>sesiones</small></strong>
          </div>
          <div className="spectro-horizontal-bar-track">
            <span className="spectro-horizontal-bar-fill" style={{ width: Math.max(2, (item.viewings / max) * 100) + "%" }} />
          </div>
        </div>
      ))}
    </div>
      <ChartDataTable caption="Películas revisionadas y número de sesiones" rows={items.map((item) => ({ label: item.title, value: number(item.viewings) + " sesiones" }))} />
    </>
  );
}

function MovieRatingList({
  items,
  mode
}: {
  items: Array<{ movieId: string; title: string; averageRating: number | null }>;
  mode: "top" | "bottom";
}) {
  if (!items.length) return <EmptyChart>Necesitas visionados con calificación para comparar películas.</EmptyChart>;
  return (
    <ol className="spectro-movie-rating-list" aria-label={mode === "top" ? "Películas con mejores calificaciones" : "Películas con calificaciones más bajas"}>
      {items.map((item, index) => (
        <li key={item.movieId}>
          <span className="spectro-movie-rating-rank">{index + 1}</span>
          <span title={item.title}>{item.title}</span>
          <strong>{item.averageRating === null ? "—" : item.averageRating.toFixed(1) + "/10"}</strong>
        </li>
      ))}
    </ol>
  );
}

function AffinityBars({ analysis }: { analysis: SpectroAnalysis }) {
  const all = [
    ...analysis.genreAffinities,
    ...analysis.directorAffinities,
    ...analysis.castAffinities,
    ...analysis.countryAffinities,
    ...analysis.decadeAffinities,
    ...analysis.languageAffinities,
    ...analysis.durationAffinities,
    ...analysis.themeAffinities
  ].filter((item) => item.sampleSize >= 2)
    .sort((a, b) => Math.abs(b.adjustedDifference) - Math.abs(a.adjustedDifference))
    .slice(0, 12);

  if (!all.length) return <EmptyChart>Con tres películas calificadas o más, Espectro podrá empezar a estimar afinidades. Las muestras pequeñas se muestran con cautela.</EmptyChart>;
  const max = Math.max(0.15, ...all.map((item) => Math.abs(item.adjustedDifference)));
  return (
    <>
      <div className="spectro-affinity-chart">
      {all.map((item) => (
        <div className="spectro-affinity-chart-row" key={item.key}>
          <div className="spectro-affinity-chart-label">
            <small>{item.category}</small>
            <strong>{item.label}</strong>
            <span>{item.sampleSize} películas · {item.confidence}</span>
          </div>
          <div className="spectro-affinity-axis">
            <span
              className={item.adjustedDifference >= 0 ? "is-positive" : "is-negative"}
              style={{
                width: (Math.abs(item.adjustedDifference) / max) * 48 + "%",
                left: item.adjustedDifference >= 0 ? "50%" : "auto",
                right: item.adjustedDifference < 0 ? "50%" : "auto"
              }}
            />
          </div>
          <strong className={item.adjustedDifference >= 0 ? "is-positive" : "is-negative"}>
            {item.adjustedDifference > 0 ? "+" : ""}{item.adjustedDifference.toFixed(2)}
          </strong>
        </div>
      ))}
      <p className="spectro-chart-footnote">Diferencia ajustada respecto a tu promedio por título. No equivale a una probabilidad ni demuestra causalidad.</p>
    </div>
      <ChartDataTable caption="Afinidades ajustadas y respaldo" rows={all.map((item) => ({ label: item.category + ": " + item.label, value: (item.adjustedDifference > 0 ? "+" : "") + item.adjustedDifference.toFixed(2), detail: number(item.sampleSize) + " películas · " + item.confidence }))} />
    </>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="spectro-data-metric">
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function SpectroAnalyticsPanel({
  analytics,
  analysis,
  patterns
}: {
  analytics: SpectroAnalytics;
  analysis: SpectroAnalysis;
  patterns: ReactNode;
}) {
  const [activeSection, setActiveSection] = useState<SectionKey>("resumen");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight": nextIndex = (currentIndex + 1) % SECTIONS.length; break;
      case "ArrowLeft": nextIndex = (currentIndex - 1 + SECTIONS.length) % SECTIONS.length; break;
      case "Home": nextIndex = 0; break;
      case "End": nextIndex = SECTIONS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setActiveSection(SECTIONS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  const summary = analytics.summary;
  const estimatedHours = (summary.estimatedMinutes / 60).toLocaleString("es-PA", { maximumFractionDigits: 1 });

  return (
    <section className="spectro-analytics" aria-label="Analítica personal de Espectro">
      <header className="spectro-analytics-header">
        <div>
          <span className="spectro-analytics-kicker">TU PERFIL CINEMATOGRÁFICO</span>
          <h2>Tu forma de vivir el cine</h2>
          <p>
            Una lectura de tus visionados, valoraciones y películas guardadas.
            Los cálculos se realizan en este dispositivo y no son una evaluación externa de tus gustos.
          </p>
        </div>
        <span className="spectro-local-indicator"><i aria-hidden="true" /> Análisis local</span>
      </header>
      <div className="spectro-data-metrics">
        <Metric label="Visionados" value={number(summary.totalViewings)} detail={number(summary.additionalViewings) + " sesiones adicionales"} />
        <Metric label="Películas únicas" value={number(summary.uniqueMoviesWatched)} detail={number(summary.ratedMovies) + " con nota"} />
        <Metric label="Promedio por película" value={rating(summary.averageMovieRating)} detail="Revisionados agrupados por título" />
        <Metric label="Tiempo estimado" value={estimatedHours + " h"} detail={number(summary.viewingsWithoutRuntime) + " sesiones sin duración"} />
        <Metric label="Días activos" value={number(summary.activeDays)} detail={number(summary.moviesWithRewatches) + " películas revisionadas"} />
        <Metric label="Favoritos" value={number(summary.favorites)} detail={number(summary.pending) + " películas pendientes"} />
      </div>

      <nav className="spectro-analytics-nav" role="tablist" aria-orientation="horizontal" aria-label="Apartados de analítica">
        {SECTIONS.map((section, index) => (
          <button
            ref={(element) => { tabRefs.current[index] = element; }}
            className={activeSection === section.id ? "spectro-analytics-tab is-active" : "spectro-analytics-tab"}
            id={"spectro-tab-" + section.id}
            key={section.id}
            type="button"
            role="tab"
            tabIndex={activeSection === section.id ? 0 : -1}
            aria-selected={activeSection === section.id}
            aria-controls="spectro-analytics-panel"
            onClick={() => setActiveSection(section.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div id="spectro-analytics-panel" role="tabpanel" aria-labelledby={"spectro-tab-" + activeSection} className="spectro-analytics-grid">
        {activeSection === "resumen" && (
          <>
            <ChartCard title="Visionados por mes">
              <MonthlyActivityChart points={analytics.monthly} />
              <p className="spectro-chart-footnote">Cada sesión cuenta como un visionado; la misma película puede aparecer más de una vez.</p>
            </ChartCard>
            <ChartCard title="Distribución de calificaciones" tag="Por sesión">
              <RatingColumns items={analytics.ratingDistribution} />
            </ChartCard>
            <ChartCard title="Estado de la Biblioteca" description="Películas con historial, pendientes y otros títulos guardados localmente.">
              <DonutChart items={analytics.libraryBreakdown} />
            </ChartCard>
            <ChartCard title="Cobertura de metadatos">
              <div className="spectro-coverage-grid">
                {[
                  ["Géneros", analytics.coverage.withGenres],
                  ["Países", analytics.coverage.withCountries],
                  ["Dirección", analytics.coverage.withDirectors],
                  ["Año", analytics.coverage.withReleaseYear],
                  ["Duración", analytics.coverage.withRuntime],
                  ["Idioma", analytics.coverage.withLanguage],
                  ["Temas", analytics.coverage.withKeywords]
                ].map(([label, count]) => (
                  <div key={String(label)}>
                    <strong>{number(Number(count))}/{number(analytics.coverage.viewedMovies)}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <p className="spectro-chart-footnote">La cobertura depende de los metadatos disponibles en Prisma y TMDB; los campos vacíos no se estiman.</p>
            </ChartCard>
          </>
        )}

        {activeSection === "actividad" && (
          <>
            <ChartCard title="Visionados por mes" description="Todos los meses entre tu primer y tu último registro.">
              <MonthlyActivityChart points={analytics.monthly} />
            </ChartCard>
            <ChartCard title="Días de la semana" description="Cantidad de sesiones según el día local registrado.">
              <HorizontalBars items={analytics.weekdays} suffix="sesiones" showPercentage />
            </ChartCard>
            <ChartCard title="Visionados por día y hora" description="Solo incluye sesiones con hora local válida." tag={number(analytics.timedViewings) + " con hora"}>
              <HourHeatmap cells={analytics.hourHeatmap} total={analytics.timedViewings} />
            </ChartCard>
          </>
        )}

        {activeSection === "calificaciones" && (
          <>
            <ChartCard title="Distribución de calificaciones" description="Cada nota corresponde a una sesión; los revisionados también cuentan.">
              <RatingColumns items={analytics.ratingDistribution} />
              <p className="spectro-chart-footnote">{number(analytics.coverage.ratedViewings)} notas registradas · {number(analytics.coverage.unratedViewings)} visionados sin nota.</p>
            </ChartCard>
            <ChartCard title="Calificación media por mes">
              <MonthlyRatingChart points={analytics.monthly} />
            </ChartCard>
            <ChartCard title="Revisionados" description="Títulos con más de una sesión registrada." tag={number(summary.moviesWithRewatches) + " títulos"}>
              <RewatchBars items={analytics.rewatchTitles} />
              <p className="spectro-rewatch-delta">
                Cambio medio entre primera y última nota:
                <strong>{analytics.averageRewatchChange === null ? " Sin datos" : (analytics.averageRewatchChange > 0 ? "+" : "") + analytics.averageRewatchChange.toFixed(2) + " puntos"}</strong>
              </p>
            </ChartCard>
            <ChartCard title="Mejores calificaciones por película" description="Promedio de las calificaciones de cada título, no de cada sesión.">
              <MovieRatingList items={analytics.topRatedMovies} mode="top" />
            </ChartCard>
            <ChartCard title="Calificaciones más bajas por película" description="El extremo inferior de tus valoraciones, agrupando revisionados.">
              <MovieRatingList items={analytics.lowestRatedMovies} mode="bottom" />
            </ChartCard>
          </>
        )}

        {activeSection === "cine" && (
          <>
            <ChartCard title="Géneros" description="Películas únicas por género; un título puede pertenecer a varios.">
              <HorizontalBars items={analytics.genreCounts} />
            </ChartCard>
            <ChartCard title="Décadas de estreno" description="Distribución según el año de lanzamiento, no el año en que la viste.">
              <DonutChart items={analytics.decadeCounts} />
            </ChartCard>
            <ChartCard title="Países de producción" description="Un título puede sumar a más de un país.">
              <HorizontalBars items={analytics.countryCounts} />
            </ChartCard>
            <ChartCard title="Idiomas originales">
              <HorizontalBars items={analytics.languageCounts} />
            </ChartCard>
            <ChartCard title="Dirección" description="Directores con más títulos en tu historial.">
              <HorizontalBars items={analytics.directorCounts} />
            </ChartCard>
            <ChartCard title="Reparto" description="Intérpretes principales registrados en los metadatos.">
              <HorizontalBars items={analytics.castCounts} />
            </ChartCard>
            <ChartCard title="Duración de las películas" description="Películas únicas agrupadas por minutos de duración.">
              <HorizontalBars items={analytics.runtimeCounts} />
            </ChartCard>
            <ChartCard title="Palabras clave temáticas" description="Etiquetas temáticas disponibles en los metadatos.">
              <HorizontalBars items={analytics.themeCounts} />
            </ChartCard>
          </>
        )}

        {activeSection === "perfil" && (
          <>
            <ChartCard title="Afinidades ajustadas" description="Diferencia ajustada respecto a tu promedio por película. El centro representa 0." tag="Hasta 12 señales">
              <AffinityBars analysis={analysis} />
            </ChartCard>
            <ChartCard title="Géneros de favoritos">
              <HorizontalBars items={analytics.favoriteGenreCounts} />
              <p className="spectro-chart-footnote">{number(summary.favorites)} favoritos guardados. Esta elección es independiente de la nota de cada visionado.</p>
            </ChartCard>
            <ChartCard title="Metadatos de favoritos" description="Características registradas en las películas marcadas como favoritas.">
              <HorizontalBars
                items={analysis.favoriteSignals.map((item) => ({
                  label: item.category + ": " + item.label,
                  count: item.sampleSize,
                  percentage: summary.favorites ? Math.round((item.sampleSize / summary.favorites) * 1000) / 10 : 0
                }))}
                suffix="favoritos"
              />
            </ChartCard>
            <div className="spectro-chart-span">{patterns}</div>
          </>
        )}

        {activeSection === "biblioteca" && (
          <>
            <ChartCard title="Distribución del catálogo" description="Estados de los títulos almacenados localmente. Los favoritos pueden pertenecer a cualquiera de los grupos.">
              <DonutChart items={analytics.libraryBreakdown} />
            </ChartCard>
            <ChartCard title="Películas por colección" description="Número de películas distintas dentro de cada colección.">
              <HorizontalBars
                items={analytics.collectionCounts.map((item) => ({
                  label: item.name,
                  count: item.movieCount,
                  percentage: analytics.collectionCounts.reduce((sum, entry) => sum + entry.movieCount, 0)
                    ? Math.round((item.movieCount / analytics.collectionCounts.reduce((sum, entry) => sum + entry.movieCount, 0)) * 1000) / 10
                    : 0
                }))}
                suffix="películas"
                showPercentage={false}
              />
            </ChartCard>
            <ChartCard title="Datos de visionado">
              <div className="spectro-coverage-grid">
                <div><strong>{number(summary.notesWritten)}</strong><span>Comentarios escritos</span></div>
                <div><strong>{number(summary.unratedViewings)}</strong><span>Sesiones sin nota</span></div>
                <div><strong>{number(summary.favorites)}</strong><span>Favoritos explícitos</span></div>
                <div><strong>{number(summary.pending)}</strong><span>Películas pendientes</span></div>
              </div>
            </ChartCard>
          </>
        )}
      </div>
      <p className="spectro-analytics-footnote">
        Las gráficas se calculan en este dispositivo. Los conteos de visionados representan sesiones; los de catálogo, géneros y afinidades se calculan por película única cuando corresponde.
      </p>
    </section>
  );
}
