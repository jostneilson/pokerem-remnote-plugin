import type { ReactNode } from 'react';

export function Panel({
  title,
  icon,
  accent,
  children,
}: {
  title?: string;
  icon?: ReactNode;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="pkr-panel"
      style={accent ? { borderColor: accent } : undefined}
    >
      {title ? (
        <div
          className="pkr-panel-header"
          style={accent ? { background: `linear-gradient(90deg, ${accent}20 0%, transparent 100%)` } : undefined}
        >
          {icon && <span className="flex shrink-0 items-center text-sm">{icon}</span>}
          {title}
        </div>
      ) : null}
      {children}
    </section>
  );
}
