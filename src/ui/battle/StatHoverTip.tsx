import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const SHOW_MS = 100;
const HIDE_MS = 80;

/**
 * Fixed-position tooltip so hints aren’t clipped by the battle header’s overflow.
 * Short delay on show; quick fade for a fluid feel.
 */
export function StatHoverTip({
  label,
  className,
  children,
}: {
  label: string;
  /** Merged onto the hover target wrapper (e.g. `min-w-0 flex-1` for the XP bar row). */
  className?: string;
  children: React.ReactNode;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const showT = useRef<number>();
  const hideT = useRef<number>();

  const measure = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({ left: r.left + r.width / 2, top: r.bottom + 6 });
  }, []);

  const onEnter = () => {
    window.clearTimeout(hideT.current);
    showT.current = window.setTimeout(() => {
      measure();
      setOpen(true);
    }, SHOW_MS);
  };

  const onLeave = () => {
    window.clearTimeout(showT.current);
    setMounted(false);
    hideT.current = window.setTimeout(() => {
      setOpen(false);
      setCoords(null);
    }, HIDE_MS);
  };

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(
    () => () => {
      window.clearTimeout(showT.current);
      window.clearTimeout(hideT.current);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => measure();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, measure]);

  const tip =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="tooltip"
            className="pkr-stat-tooltip pointer-events-none fixed z-[9999] max-w-[min(14rem,calc(100vw-16px))] transition-[opacity,transform] ease-out"
            style={{
              left: coords.left,
              top: coords.top,
              transform: prefersReducedMotion
                ? 'translateX(-50%)'
                : `translateX(-50%) translateY(${mounted ? 0 : 4}px)`,
              opacity: mounted ? 1 : 0,
              transitionDuration: prefersReducedMotion ? '0.14s' : '0.2s',
            }}
          >
            {label}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <span
        ref={wrapRef}
        className={['inline-flex cursor-help items-center', className].filter(Boolean).join(' ')}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {children}
      </span>
      {tip}
    </>
  );
}
