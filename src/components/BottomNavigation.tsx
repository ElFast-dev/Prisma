import { BrainCircuit, Compass, UserRound } from "lucide-react";

type Section = "personal" | "discover" | "spectro";

interface BottomNavigationProps {
  active: Section;
  compact?: boolean;
}

const items: { id: Section; label: string; href: string; icon: typeof UserRound }[] = [
  { id: "personal", label: "Personal", href: "#/personal", icon: UserRound },
  { id: "discover", label: "Descubrir", href: "#/discover", icon: Compass },
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
