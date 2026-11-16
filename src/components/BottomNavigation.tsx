import { BookOpen, BrainCircuit, Compass, House } from "lucide-react";

type Section = "home" | "cine" | "discover" | "spectro";

interface BottomNavigationProps {
  active: Section;
  compact?: boolean;
}

const items: { id: Section; label: string; href: string; icon: typeof House }[] = [
  { id: "home", label: "Inicio", href: "#/", icon: House },
  { id: "discover", label: "Descubrir", href: "#/discover", icon: Compass },
  { id: "cine", label: "Mi cine", href: "#/personal", icon: BookOpen },
  { id: "spectro", label: "Espectro", href: "#/spectro", icon: BrainCircuit }
];

export function BottomNavigation({ active, compact = false }: BottomNavigationProps) {
  return (
    <nav className={compact ? "bottom-nav bottom-nav-compact" : "bottom-nav"} aria-label="Navegación principal">
      <div className="bottom-nav-pill">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <a
              className={selected ? "bottom-nav-item is-active" : "bottom-nav-item"}
              href={item.href}
              key={item.id}
              aria-current={selected ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
