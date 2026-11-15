interface MoviePosterCardProps {
  title: string;
  imageUrl: string | null;
  onClick: () => void;
}

export function MoviePosterCard({ title, imageUrl, onClick }: MoviePosterCardProps) {
  return (
    <button className="poster-card" type="button" onClick={onClick} aria-label={"Abrir ficha de " + title}>
      {imageUrl ? (
        <img src={imageUrl} alt={title} loading="lazy" />
      ) : (
        <span className="poster-placeholder" aria-label="Carátula no disponible">
          <span>PRISMA</span>
        </span>
      )}
    </button>
  );
}
