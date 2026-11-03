import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { DESIGN_W, measureElementWidth } from './battleSurfaceUtils';

export type SceneBlend = { from: number; to: number };

/** Crossfade between battle scenes: arms on the second frame so the CSS transition runs. */
export function useSceneBlend(sceneIdx: number, reducedMotion: boolean) {
  const prevSceneIdxRef = useRef(sceneIdx);
  const [blend, setBlend] = useState<SceneBlend | null>(null);
  const [armed, setArmed] = useState(false);

  useLayoutEffect(() => {
    if (reducedMotion) {
      prevSceneIdxRef.current = sceneIdx;
      setBlend(null);
      setArmed(false);
      return;
    }
    const prev = prevSceneIdxRef.current;
    if (prev === sceneIdx) return;
    setBlend({ from: prev, to: sceneIdx });
    setArmed(false);
    prevSceneIdxRef.current = sceneIdx;
  }, [sceneIdx, reducedMotion]);

  useLayoutEffect(() => {
    if (!blend) return;
    let innerRaf = 0;
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => setArmed(true));
    });
    return () => {
      cancelAnimationFrame(outerRaf);
      cancelAnimationFrame(innerRaf);
    };
  }, [blend]);

  const finish = () => {
    setBlend(null);
    setArmed(false);
  };
  return { blend, armed, finish };
}

/**
 * Width for scaling the battle UI. Prefers the sidebar column (`widthSourceRef`), which tracks the
 * pane, then the battle's own box, then the nearest measurable ancestor.
 */
export function useFrameWidth(
  outerRef: RefObject<HTMLElement | null>,
  widthSourceRef?: RefObject<HTMLElement | null>
): number {
  const [frameW, setFrameW] = useState(DESIGN_W);
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const read = () => {
      let w = measureElementWidth(widthSourceRef?.current ?? null) || measureElementWidth(outer);
      if (w <= 0) {
        let p: HTMLElement | null = outer.parentElement;
        for (let d = 0; p && d < 8; d++) {
          const pw = measureElementWidth(p);
          if (pw > 0) {
            w = pw;
            break;
          }
          p = p.parentElement;
        }
      }
      const next = w > 0 ? w : DESIGN_W;
      setFrameW((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    read();
    requestAnimationFrame(() => read());

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => read()) : null;
    const col = widthSourceRef?.current;
    if (col) ro?.observe(col);
    ro?.observe(outer);

    window.addEventListener('resize', read);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', read);
    };
  }, [outerRef, widthSourceRef]);
  return frameW;
}
