import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-live="polite">
      <div className="empty-state-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </section>
  );
}
