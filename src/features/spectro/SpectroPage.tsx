import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrainCircuit, CheckCircle2, Fingerprint, RefreshCw, Sparkles, WifiOff
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { getSpectroAnalysis } from "../../infrastructure/database/spectroRepository";
import {
  getSpectroMetadataSnapshot,
  startSpectroMetadataEnrichment,
  subscribeSpectroMetadata,
  type SpectroMetadataSnapshot
} from "../../infrastructure/database/spectroMetadataService";
import {
  answerSpectroRatingQuestion,
  dismissSpectroRatingQuestion,
  getNextSpectroRatingQuestion,
  type SpectroRatingQuestion
} from "../../infrastructure/database/spectroQuestionService";
import type { SpectroAffinity, SpectroAnalysis } from "../../domain/spectro";

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

function SpectroPatternsPanel({ patterns }: { patterns: SpectroAnalysis["patterns"] }) {
  return (
    <section className="spectro-patterns-section card-surface" aria-labelledby="spectro-patterns-title">
      <div className="content-caption">
        <div>
          <h2 id="spectro-patterns-title">Combinaciones que destacan</h2>
          <p className="muted-copy spectro-patterns-intro">
            Interacciones encontradas al explorar las combinaciones de rasgos disponibles, no una lista cerrada de parejas.
          </p>
        </div>
        <Sparkles size={19} className="accent-icon" aria-hidden="true" />
      </div>
      {patterns.length ? (
        <div className="spectro-pattern-grid">
          {patterns.map((pattern) => (
            <article className="spectro-pattern-card" key={pattern.key}>
              <div className="spectro-pattern-heading">
                <div>
                  <small>{pattern.category}</small>
                  <h3>{pattern.label}</h3>
                </div>
                <strong className={pattern.adjustedDifference >= 0 ? "is-positive" : "is-negative"}>
                  {signed(pattern.adjustedDifference)}
                </strong>
              </div>
              <div className="spectro-pattern-metrics">
                <span>Nota observada <strong>{pattern.averageRating.toFixed(1)}/10</strong></span>
                <span>Esperada por separado <strong>{pattern.expectedRating.toFixed(1)}/10</strong></span>
                <span>p original <strong>{pattern.pValue < 0.0001 ? "<0.0001" : pattern.pValue.toFixed(4)}</strong></span>
                <span>q corregido <strong>{(pattern.qValue * 100).toFixed(1)}%</strong></span>
              </div>
              <div className="spectro-pattern-support">
                <span>{pattern.sampleSize} películas distintas</span>
                <span>Variación {pattern.dispersion.toFixed(1)}</span>
                <span>{pattern.foldCount}/5 bloques · {(pattern.foldConsistency * 100).toFixed(0)}% de consistencia</span>
                <span className={"spectro-confidence is-" + pattern.confidence}>{confidenceLabel(pattern.confidence)}</span>
              </div>
              <div className="spectro-pattern-evidence">
                <small>Ejemplos que respaldan el patrón</small>
                <ul>
                  {pattern.supportingMovies.map((movie) => (
                    <li key={movie.title}>
                      <span>{movie.title}</span>
                      <strong>{movie.rating.toFixed(1)}/10 · desvío {signed(movie.residual)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-copy spectro-patterns-empty">
          No se han encontrado interacciones que superen la validación cruzada y la corrección por múltiples comparaciones. Esto evita presentar coincidencias aisladas como descubrimientos.
        </p>
      )}
      <p className="spectro-method-note">
        La expectativa se calcula con un modelo aditivo entrenado sin incluir los títulos que evalúa (cinco bloques cruzados).
        Los valores p se corrigen con Benjamini–Yekutieli para controlar falsos descubrimientos entre parejas dependientes.
        Se muestran solo señales con q ≤ 5 % y consistencia entre bloques; siguen siendo asociaciones, no causas.
      </p>
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

function getProfileSignals(analysis: SpectroAnalysis): {
  positive: SpectroAffinity[];
  negative: SpectroAffinity[];
} {
  const all = [
    ...analysis.genreAffinities,
    ...analysis.directorAffinities,
    ...analysis.castAffinities,
    ...analysis.countryAffinities,
    ...analysis.decadeAffinities,
    ...analysis.languageAffinities,
    ...analysis.durationAffinities,
    ...analysis.themeAffinities
  ];
  const supported = all.filter((item) => (
    item.sampleSize >= 3
    && (item.confidence === "moderada" || item.confidence === "sólida")
    && Math.abs(item.adjustedDifference) >= 0.15
  ));
  return {
    positive: supported
      .filter((item) => item.adjustedDifference > 0)
      .sort((a, b) => b.adjustedDifference - a.adjustedDifference || b.sampleSize - a.sampleSize)
      .slice(0, 4),
    negative: supported
      .filter((item) => item.adjustedDifference < 0)
      .sort((a, b) => a.adjustedDifference - b.adjustedDifference || b.sampleSize - a.sampleSize)
      .slice(0, 4)
  };
}

function SpectroProfileSignals({ analysis }: { analysis: SpectroAnalysis }) {
  const signals = getProfileSignals(analysis);
  const renderSignal = (item: SpectroAffinity, tone: "positive" | "negative") => (
    <article className={"spectro-profile-signal is-" + tone} key={item.key}>
      <div className="spectro-profile-signal-copy">
        <small>{item.category}</small>
        <strong>{item.label}</strong>
        <span>{item.sampleSize} películas · {confidenceLabel(item.confidence)}</span>
      </div>
      <div className="spectro-profile-signal-value">
        <strong>{item.averageRating.toFixed(1)}<small>/10</small></strong>
        <span>{signed(item.adjustedDifference)} vs. tu promedio</span>
      </div>
    </article>
  );

  return (
    <section className="spectro-profile-signals card-surface" aria-labelledby="spectro-profile-signals-title">
      <div className="content-caption">
        <div>
          <h2 id="spectro-profile-signals-title">Señales de tu gusto</h2>
          <p className="muted-copy spectro-profile-section-intro">
            Rasgos que se repiten en tus calificaciones y cuentan con respaldo suficiente.
          </p>
        </div>
        <Fingerprint size={19} className="accent-icon" aria-hidden="true" />
      </div>
      {signals.positive.length || signals.negative.length ? (
        <div className="spectro-profile-signal-columns">
          <div className="spectro-profile-signal-group">
            <h3>Te suelen gustar más</h3>
            {signals.positive.length ? (
              <div className="spectro-profile-signal-list">
                {signals.positive.map((item) => renderSignal(item, "positive"))}
              </div>
            ) : (
              <p className="muted-copy spectro-profile-signal-empty">Todavía no hay señales positivas suficientemente consistentes.</p>
            )}
          </div>
          <div className="spectro-profile-signal-group">
            <h3>Te suelen convencer menos</h3>
            {signals.negative.length ? (
              <div className="spectro-profile-signal-list">
                {signals.negative.map((item) => renderSignal(item, "negative"))}
              </div>
            ) : (
              <p className="muted-copy spectro-profile-signal-empty">Todavía no hay señales negativas suficientemente consistentes.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="muted-copy spectro-profile-signal-empty">
          Aún no hay suficientes señales consistentes para describir tu gusto. Espectro evita convertir diferencias pequeñas o muestras variables en preferencias confirmadas.
        </p>
      )}
      <p className="spectro-method-note">
        Cada señal compara películas distintas con tu promedio personal. Una asociación describe tus valoraciones; no demuestra que ese rasgo sea la causa de que te guste una película.
      </p>
    </section>
  );
}

function SpectroExplicitFavorites({ analysis }: { analysis: SpectroAnalysis }) {
  const signals = analysis.favoriteSignals.slice(0, 8);
  if (!signals.length) return null;

  return (
    <section className="spectro-explicit-favorites card-surface" aria-labelledby="spectro-explicit-favorites-title">
      <div className="content-caption">
        <div>
          <h2 id="spectro-explicit-favorites-title">Lo que has elegido como favorito</h2>
          <p className="muted-copy spectro-profile-section-intro">
            Tus elecciones explícitas, separadas de las conclusiones que se extraen de tus notas.
          </p>
        </div>
        <Sparkles size={18} className="accent-icon" aria-hidden="true" />
      </div>
      <div className="spectro-favorite-chips">
        {signals.map((item) => (
          <span className="spectro-favorite-chip" key={item.key}>
            <strong>{item.label}</strong>
            <small>{item.category} · {item.sampleSize} {item.sampleSize === 1 ? "película favorita" : "películas favoritas"}</small>
          </span>
        ))}
      </div>
      <p className="spectro-method-note">
        Marcar una película como favorita no añade ni modifica su calificación.
      </p>
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
  return (
    <div className="page spectro-page">
      <header className="spectro-page-intro">
        <div className="spectro-page-kicker"><BrainCircuit size={17} /> ESPECTRO · PERFIL PERSONAL</div>
        <h1>Tu mirada cinematográfica</h1>
        <p>
          Una lectura de tu manera de ver el cine, construida con tus calificaciones, tus favoritos y patrones que superan controles estadísticos.
        </p>
      </header>

      <section className="spectro-overview card-surface" aria-labelledby="spectro-overview-title">
        <div className="spectro-overview-heading">
          <div>
            <span className="spectro-overview-eyebrow">TU RETRATO ACTUAL</span>
            <h2 id="spectro-overview-title">Lo que sabemos de tu gusto</h2>
          </div>
          <span className="status-pill">Análisis local</span>
        </div>
        <div className="spectro-summary-grid">
          <div className="spectro-summary-card">
            <strong>{analysis.movieCount}</strong>
            <span>Películas distintas calificadas</span>
          </div>
          <div className="spectro-summary-card">
            <strong>{analysis.averageRating?.toFixed(1) ?? "—"}<small>/10</small></strong>
            <span>Promedio personal por título</span>
          </div>
          <div className="spectro-summary-card">
            <strong>{analysis.patterns.length}</strong>
            <span>Combinaciones validadas</span>
          </div>
        </div>
        <p className="spectro-overview-note">
          Los revisionados aportan contexto sobre cada película, pero no cuentan como títulos nuevos para confirmar una preferencia.
        </p>
      </section>

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

      {analysis.movieCount < 3 && (
        <section className="spectro-insufficient card-surface" role="status">
          <Fingerprint size={23} className="accent-icon" />
          <div>
            <h2>Tu retrato todavía está tomando forma</h2>
            <p>
              Necesitamos al menos tres películas distintas con calificación para empezar a identificar señales. Llevas {analysis.movieCount} de 3. Tus favoritos se conservan como elecciones explícitas, sin convertirse en notas.
            </p>
          </div>
        </section>
      )}

      <SpectroProfileSignals analysis={analysis} />
      <SpectroExplicitFavorites analysis={analysis} />
      <SpectroPatternsPanel patterns={analysis.patterns} />

      <p className="spectro-version-note">
        Espectro {analysis.algorithmVersion} · Análisis local actualizado {new Date(analysis.computedAt).toLocaleString("es-PA")}
      </p>
    </div>
  );
}

export function SpectroPage() {
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

  useEffect(() => { void refreshQuestion(); }, [refreshQuestion]);

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
    return <div className="page"><div className="detail-loading"><span>Analizando tu perfil…</span></div></div>;
  }
  if (state === "error" || !analysis) {
    return (
      <div className="page spectro-page">
        <EmptyState
          icon={<BrainCircuit size={26} />}
          title="No se pudo calcular Espectro"
          description={error}
          action={<button className="button button-secondary" type="button" onClick={() => void refreshAnalysis()}>Reintentar</button>}
        />
      </div>
    );
  }

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
