import { useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, Clapperboard, Compass, LoaderCircle, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import type { HomePick, HomePickKind } from "../../domain/homeSelection";
import { getHomeRecommendations, type HomeRecommendationResult } from "../../infrastructure/database/homeRepository";
import { getTmdbImageUrl } from "../../infrastructure/tmdb/TmdbService";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";
import "./home.css";

const imageBase = "https://image.tmdb.org/t/p/";

const sections: {
  kind: HomePickKind;
  title: string;
  eyebrow: string;
  icon: LucideIcon;
}[] = [
  { kind: "safe", title: "Apuesta segura", eyebrow: "LO QUE PODRÍA ENCAJAR CONTIGO", icon: BrainCircuit },
  { kind: "discovery", title: "Nuevo descubrimiento", eyebrow: "ALGO FAMILIAR, ALGO NUEVO", icon: Sparkles },
  { kind: "outside", title: "Fuera de tu zona", eyebrow: "SAL DE LO HABITUAL", icon: Compass }
];

function confidenceLabel(value: HomePick["confidence"]): string {
  if (value === "sólida") return "Consistente";
  if (value === "moderada") return "En desarrollo";
  if (value === "variable") return "Variable";
  if (value === "declarada") return "Favoritos declarados";
  if (value === "inicial") return "Inicial";
  return "Sin evidencia suficiente";
}

function HomePickCard({ pick, section }: { pick: HomePick; section: typeof sections[number] }) {
  const Icon = section.icon;
  const image = getTmdbImageUrl(imageBase, pick.movie.posterPath, "w342");
  const reason = pick.reasons.find((item) => item.contribution > 0) ?? pick.reasons[0];
  const movieMeta = [
    pick.movie.releaseYear ? String(pick.movie.releaseYear) : "",
    pick.movie.genres.slice(0, 2).join(" · "),
    pick.movie.runtimeMinutes ? pick.movie.runtimeMinutes + " min" : ""
  ].filter(Boolean).join(" · ");

  return (
    <article className="home-pick-card card-surface" data-home-pick={pick.kind}>
      <div className="home-pick-art">
        {image
          ? <img src={image} alt={"Póster de " + pick.movie.title} loading="lazy" />
          : <div className="home-pick-placeholder" aria-hidden="true"><Clapperboard size={28} /></div>}
      </div>
      <div className="home-pick-content">
        <div className="home-pick-heading">
          <div>
            <p className="eyebrow">{section.eyebrow}</p>
            <h2>{section.title}</h2>
          </div>
          <Icon size={18} className="accent-icon" aria-hidden="true" />
        </div>
        <h3>{pick.movie.title}</h3>
        {movieMeta && <p className="home-pick-meta">{movieMeta}</p>}
        <p className="home-pick-explanation">{pick.explanation}</p>
        {reason && (
          <p className="home-pick-signal">
            {reason.category}: {reason.label} · {reason.sampleSize} películas
          </p>
        )}
        <div className="home-pick-metrics">
          {pick.fitPercentage !== null && <span>Encaje <strong>{pick.fitPercentage}%</strong></span>}
          {pick.predictedRating !== null && <span>Nota estimada <strong>{pick.predictedRating.toFixed(1)}/10</strong></span>}
          <span>Confianza <strong>{confidenceLabel(pick.confidence)}</strong></span>
        </div>
        <div className="home-pick-footer">
          <span className="home-pick-source">{pick.source === "pending" ? "De tus pendientes" : "Del catálogo local"}</span>
          <a
            className="home-pick-open"
            href={"#/movie/" + pick.movie.tmdbId}
            onClick={() => saveCurrentRouteScrollPosition()}
          >
            Ver película <ArrowRight size={15} />
          </a>
        </div>
      </div>
    </article>
  );
}

export function HomePage() {
  const [result, setResult] = useState<HomeRecommendationResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getHomeRecommendations()
      .then((next) => {
        if (active) setResult(next);
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "No se pudieron preparar las propuestas.");
      });
    return () => { active = false; };
  }, []);

  const picksByKind = new Map((result?.picks ?? []).map((pick) => [pick.kind, pick]));

  return (
    <div className="page page-home">
      <header className="home-heading">
        <p className="eyebrow">PRISMA · TU DIARIO CINEMATOGRÁFICO</p>
        <h1>¿Qué película vemos hoy?</h1>
        <p className="page-lead">Tres caminos para encontrar tu próxima película, a partir de lo que has visto y de lo que todavía te espera.</p>
      </header>

      {error ? (
        <EmptyState
          icon={<BrainCircuit size={26} />}
          title="No pudimos preparar tus propuestas"
          description={error}
          action={<a className="button button-secondary" href="#/discover">Explorar películas</a>}
        />
      ) : !result ? (
        <div className="home-loading" role="status">
          <LoaderCircle className="spin" size={22} />
          <span>Buscando buenas opciones para ti…</span>
        </div>
      ) : (
        <>
          <div className="home-picks">
            {sections.map((section) => {
              const pick = picksByKind.get(section.kind);
              return pick
                ? <HomePickCard key={section.kind} pick={pick} section={section} />
                : (
                  <section className="home-pick-empty card-surface" key={section.kind}>
                    <div><p className="eyebrow">{section.eyebrow}</p><h2>{section.title}</h2></div>
                    <p className="muted-copy">
                      {section.kind === "safe"
                        ? "Prisma necesita más valoraciones o metadatos para encontrar una coincidencia respaldada."
                        : section.kind === "discovery"
                          ? "Todavía no hay otra propuesta con suficientes señales para distinguirla."
                          : "Añade metadatos a algunas películas pendientes para descubrir opciones menos habituales."}
                    </p>
                    <a className="home-pick-empty-link" href="#/discover">Explorar cine <ArrowRight size={15} /></a>
                  </section>
                );
            })}
          </div>
          <div className="home-quick-links">
            <a href="#/personal/library">Ver mis pendientes <ArrowRight size={15} /></a>
            <span>·</span>
            <a href="#/discover">Descubrir más películas <ArrowRight size={15} /></a>
          </div>
          {!result.hasEnoughData && (
            <p className="home-learning-note" role="status">
              Prisma todavía está aprendiendo tus preferencias. Las propuestas sin predicción son exploraciones, no recomendaciones personalizadas.
            </p>
          )}
          <p className="home-data-note">
            {result.ratedMovieCount} películas calificadas · {result.candidateCount} candidatas locales
          </p>
        </>
      )}
    </div>
  );
}
