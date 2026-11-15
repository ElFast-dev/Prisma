import { ArrowLeft, Palette, Clapperboard, MapPin, Database, ShieldCheck, FolderArchive, Info, ChevronRight } from "lucide-react";

const settingsGroups = [
  { icon: Palette, title: "Apariencia", description: "Tema oscuro y preferencias de movimiento." },
  { icon: Clapperboard, title: "Catálogo cinematográfico", description: "Conexión personal con TMDB." },
  { icon: MapPin, title: "Región", description: "Panamá (PA) como región inicial." },
  { icon: Database, title: "Almacenamiento", description: "Base de datos local y caché." },
  { icon: ShieldCheck, title: "Privacidad", description: "Cómo se almacenan y utilizan tus datos." },
  { icon: FolderArchive, title: "Copias de seguridad", description: "Exportar y restaurar tu información." },
  { icon: Info, title: "Acerca de Prisma", description: "Versión, documentación y créditos." }
];

export function SettingsPage() {
  return (
    <div className="page">
      <header className="section-heading">
        <div className="heading-with-back">
          <a href="#/discover" className="back-link" aria-label="Volver a Descubrir"><ArrowLeft size={19} /></a>
          <div>
            <p className="eyebrow">PRISMA</p>
            <h1>Ajustes</h1>
          </div>
        </div>
      </header>
      <p className="page-lead">Configura y administra tu espacio cinematográfico.</p>
      <div className="settings-list">
        {settingsGroups.map(({ icon: Icon, title, description }) => (
          <button className="settings-row card-surface" key={title} disabled>
            <span className="settings-icon"><Icon size={21} /></span>
            <span className="settings-copy">
              <strong>{title}</strong>
              <span>{description}</span>
            </span>
            <ChevronRight size={18} className="subtle-icon" />
          </button>
        ))}
      </div>
      <div className="settings-notice card-surface">
        <span className="status-pill">Primera estructura</span>
        <p>Los apartados de configuración se habilitarán por fases. La clave de TMDB no se solicita ni se almacena en esta versión inicial.</p>
      </div>
      <footer className="page-footer">
        <span>PRISMA</span>
        <span>Versión de desarrollo 0.1.0</span>
      </footer>
    </div>
  );
}
