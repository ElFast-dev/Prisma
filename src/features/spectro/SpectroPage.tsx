import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrainCircuit, CheckCircle2, Fingerprint, RefreshCw, WifiOff
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { getSpectroWorkspace } from "../../infrastructure/database/spectroRepository";
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
import type { SpectroAnalytics } from "../../domain/spectroAnalytics";
import { SpectroAnalyticsPanel } from "./SpectroAnalyticsPanel";

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
        <h2 id="spectro-patterns-title">Interacciones estadísticas</h2>
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

function SpectroMetadataStatus({ snapshot }: {
  snapshot: SpectroMetadataSnapshot;
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
          <strong>Metadatos pendientes</strong>
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
        <p className="muted-copy">{snapshot.lastError ?? "Prisma conservará la información disponible. Revisa la credencial TMDB en Ajustes si el problema persiste."}</p>
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
          {snapshot.lastError ?? "Prisma conservará los datos disponibles y volverá a consultar automáticamente los metadatos temporales."}
        </p>
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
        <div>
          <h2 id="spectro-question-title">¿Qué nota le darías a {question.title}?</h2>
          <p className="muted-copy">Visionado registrado: {formatQuestionDate(question.watchedOn)}.</p>
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

function SpectroHome({
  analysis,
  analytics,
  metadata,
  question,
  questionBusy,
  questionError,
  onQuestionAnswer,
  onQuestionDismiss
}: {
  analysis: SpectroAnalysis;
  analytics: SpectroAnalytics;
  metadata: SpectroMetadataSnapshot;
  question: SpectroRatingQuestion | null;
  questionBusy: boolean;
  questionError: string;
  onQuestionAnswer: (rating: number) => void;
  onQuestionDismiss: () => void;
}) {
  return (
    <div className="page spectro-page">
      <header className="spectro-page-intro">
        <div className="spectro-page-kicker"><BrainCircuit size={14} /> ANÁLISIS CINEMATOGRÁFICO PERSONAL</div>
        <h1>Espectro</h1>
        <p>
          Descubre qué conecta tus películas, cómo evolucionan tus gustos y qué patrones aparecen
          en tu historial. Tu información personal se analiza localmente en este dispositivo.
        </p>
      </header>

      {question && (
        <SpectroRatingQuestionCard
          question={question}
          busy={questionBusy}
          error={questionError}
          onAnswer={onQuestionAnswer}
          onDismiss={onQuestionDismiss}
        />
      )}
      <SpectroMetadataStatus snapshot={metadata} />

      {analysis.movieCount < 3 && (
        <section className="spectro-insufficient card-surface" role="status">
          <Fingerprint size={23} className="accent-icon" />
          <div>
            <h2>Pocas películas calificadas</h2>
            <p>
              Hay {analysis.movieCount} películas distintas calificadas. Las afinidades requieren al menos tres títulos; otras comparaciones necesitan muestras mayores.
            </p>
          </div>
        </section>
      )}

      <SpectroAnalyticsPanel
        analytics={analytics}
        analysis={analysis}
        patterns={<SpectroPatternsPanel patterns={analysis.patterns} />}
      />

      <p className="spectro-version-note">
        Espectro {analysis.algorithmVersion} · Cálculo local actualizado {new Date(analysis.computedAt).toLocaleString("es-PA")}
      </p>
    </div>
  );
}

export function SpectroPage() {
  const [analysis, setAnalysis] = useState<SpectroAnalysis | null>(null);
  const [analytics, setAnalytics] = useState<SpectroAnalytics | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<SpectroMetadataSnapshot>(EMPTY_METADATA);
  const [question, setQuestion] = useState<SpectroRatingQuestion | null>(null);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const lastRefreshAt = useRef(0);
  const analysisRequestId = useRef(0);

  const refreshAnalysis = useCallback(async () => {
    const requestId = ++analysisRequestId.current;
    try {
      const result = await getSpectroWorkspace();
      if (requestId !== analysisRequestId.current) return;
      setAnalysis(result.analysis);
      setAnalytics(result.analytics);
      setState("ready");
      setError("");
    } catch (cause) {
      if (requestId !== analysisRequestId.current) return;
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
    const onCredentialsUpdated = () => { void startSpectroMetadataEnrichment(true); };
    window.addEventListener("online", onOnline);
    window.addEventListener("prisma:tmdb-credentials-updated", onCredentialsUpdated);

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
      window.removeEventListener("prisma:tmdb-credentials-updated", onCredentialsUpdated);
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
    return (
      <div className="page spectro-page" aria-busy="true">
        <header className="spectro-page-intro">
          <div className="spectro-page-kicker"><BrainCircuit size={14} /> ANÁLISIS CINEMATOGRÁFICO PERSONAL</div>
          <h1>Espectro</h1>
          <p>Preparando tu perfil local y las estadísticas de tu historial.</p>
        </header>
        <div className="spectro-loading-summary" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="spectro-loading-metric" key={index}>
              <span /><strong /><i />
            </div>
          ))}
        </div>
        <div className="spectro-loading-charts" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="spectro-loading-chart" key={index}>
              <strong /><span /><span /><span />
            </div>
          ))}
        </div>
        <p className="spectro-loading-note" role="status">Calculando sin bloquear la navegación de Prisma…</p>
      </div>
    );
  }
  if (state === "error" || !analysis || !analytics) {
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
      analytics={analytics}
      metadata={metadata}
      question={question}
      questionBusy={questionBusy}
      questionError={questionError}
      onQuestionAnswer={(value) => void handleQuestionAnswer(value)}
      onQuestionDismiss={() => void handleQuestionDismiss()}
    />
  );
}
