import { useEffect, useState } from 'react';

/** Main-series dialogue text that types out a letter at a time (shown whole with reduced motion). */
export function TypedLine({ text, reducedMotion, className, msPerChar = 28 }: { text: string; reducedMotion?: boolean; className?: string; msPerChar?: number }) {
  const [shown, setShown] = useState(reducedMotion ? text.length : 0);
  useEffect(() => {
    if (reducedMotion) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          window.clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, msPerChar);
    return () => window.clearInterval(id);
  }, [text, reducedMotion, msPerChar]);
  return (
    <span className={`pkr-typed ${className ?? ''}`} aria-label={text}>
      {/* An invisible copy of the whole line holds its final size, so typing never reflows what's below. */}
      <span aria-hidden="true" className="pkr-typed__ghost">{text}</span>
      <span aria-hidden="true" className="pkr-typed__live">
        {text.slice(0, shown)}
        {shown < text.length ? <span className="pkr-typed-caret">▌</span> : null}
      </span>
    </span>
  );
}
