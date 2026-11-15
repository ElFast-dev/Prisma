import { ArrowLeft, EllipsisVertical, Film } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";

export function MovieDetailPage() {
  return (
    <div className="page">
      <header className="section-heading">
        <a href="#/discover" className="back-link" aria-label="Volver"><ArrowLeft size={19} /></a>
        <span className="eyebrow">FICHA CINEMATOGRÁFICA</span>
        <button className="icon-button" disabled aria-label="Más opciones"><EllipsisVertical size={20} /></button>
      </header>
      <EmptyState
        icon={<Film size={27} />}
        title="La ficha cinematográfica se construirá con TMDB"
        description="Aquí aparecerán la carátula, los datos de la película, los estados, la sinopsis, tus visionados, el reparto, el equipo, la disponibilidad y las recomendaciones."
        action={<a href="#/discover" className="text-link">Volver a Descubrir</a>}
      />
    </div>
  );
}
