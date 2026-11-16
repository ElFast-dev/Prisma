import { useState, type FormEvent } from "react";
import { Star, X } from "lucide-react";
import type { Viewing } from "../domain/types";
import { toLocalDateString } from "../domain/viewingRules";
import { addViewing, updateViewing } from "../infrastructure/database/viewingService";

interface ViewingFormProps {
  movieId: string;
  movieTitle: string;
  nextNumber: number;
  initialViewing?: Viewing;
  onClose: () => void;
  onSaved: () => void;
}

export function ViewingForm({ movieId, movieTitle, nextNumber, initialViewing, onClose, onSaved }: ViewingFormProps) {
  const [date, setDate] = useState(initialViewing?.watchedOn ?? toLocalDateString(new Date()));
  const [rating, setRating] = useState(initialViewing?.rating ?? 0);
  const [time, setTime] = useState(initialViewing?.watchedAtLocalTime ?? "");
  const [review, setReview] = useState(initialViewing?.review ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const values = {
        watchedOn: date,
        rating: rating || undefined,
        watchedAtLocalTime: time,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        review: review.trim()
      };
      if (initialViewing) {
        await updateViewing(initialViewing.id, values);
      } else {
        await addViewing({ movieId, ...values });
      }
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el visionado.");
    } finally {
      setSaving(false);
    }
  }

  const today = toLocalDateString(new Date());

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="bottom-sheet viewing-sheet" role="dialog" aria-modal="true" aria-labelledby="viewing-form-title">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <p className="eyebrow">EXPERIENCIA CINEMATOGRÁFICA #{initialViewing?.sequenceNumber ?? nextNumber}</p>
            <h2 id="viewing-form-title">{initialViewing ? "Editar visionado" : "Registrar visionado"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Cerrar formulario">
            <X size={19} />
          </button>
        </div>
        <p className="muted-copy viewing-movie-title">{movieTitle}</p>
        <form className="viewing-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="viewing-date">Fecha del visionado</label>
          <input className="text-field" id="viewing-date" type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} required />

          <div className="field-label rating-label">
            <span>Calificación (opcional)</span>
            <span className="rating-value">{rating ? rating + "/10" : "Sin calificar"}</span>
          </div>
          <div className="rating-star-grid" role="group" aria-label="Calificación de 1 a 10 estrellas">
            {Array.from({ length: 10 }, (_, index) => {
              const value = index + 1;
              return (
                <button
                  key={value}
                  type="button"
                  className={value <= rating ? "rating-star is-selected" : "rating-star"}
                  aria-label={value + " de 10 estrellas"}
                  aria-pressed={rating === value}
                  onClick={() => { setRating(value); setError(""); }}
                >
                  <Star size={22} fill={value <= rating ? "currentColor" : "none"} />
                </button>
              );
            })}
          </div>
          <label className="field-label" htmlFor="viewing-time">Hora (opcional)</label>
          <input className="text-field" id="viewing-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          <label className="field-label" htmlFor="viewing-review">Comentario (opcional)</label>
          <textarea className="text-field text-area" id="viewing-review" value={review} onChange={(event) => setReview(event.target.value)} maxLength={10000} placeholder="¿Qué te pareció esta experiencia?" rows={3} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="button button-secondary" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Guardando..." : initialViewing ? "Guardar cambios" : "Guardar visionado"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
