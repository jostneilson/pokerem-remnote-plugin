import type { CSSProperties, ReactNode } from 'react';

/**
 * Compact inset panel — matches battle corner HUD / trek tray language for queue & popups.
 */
export function PokeRemSatelliteMiniCard({
  children,
  className,
  style,
  accentBorder,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Optional rgba hex — harmonizes border with scene accent */
  accentBorder?: string;
}) {
  return (
    <div
      className={`pkr-satellite-mini-card ${className ?? ''}`}
      style={{
        borderColor: accentBorder ?? 'rgba(255,255,255,0.14)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Floating / satellite root — optional top scene accent stripe (battle field continuity).
 */
export function PokeRemSatelliteHudFrame({
  children,
  accentBar,
  className,
  style,
}: {
  children: ReactNode;
  accentBar?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`pkr-satellite-hud-frame ${className ?? ''}`} style={style}>
      {accentBar ? (
        <div
          className="pkr-satellite-hud-frame__accent"
          style={{ background: accentBar, boxShadow: `0 0 14px ${accentBar}55` }}
          aria-hidden
        />
      ) : null}
      <div className="pkr-satellite-hud-frame__body">{children}</div>
    </div>
  );
}
