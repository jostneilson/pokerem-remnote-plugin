import { useLayoutEffect } from 'react';
import { themeById, themeClassName, themedAliases, themeTokens } from './themes';

/**
 * Applies the equipped type theme (SPEC A12) to this widget's document: the `pkr-theme-<type>` class and the
 * surface/ink tokens on `<html>`, so the sidebar root, portaled modals on `document.body`, the queue strip
 * and the popup all read the same values. Each widget is its own iframe, so each calls this once.
 * `battleAmbienceCssVars` still sets the arena's own colours inside the battle field.
 */
export function useAppliedTheme(themeId: string | undefined): void {
  useLayoutEffect(() => {
    const theme = themeById(themeId);
    const root = document.documentElement;
    if (!theme) return;
    const cls = themeClassName(theme.id);
    const base = themeTokens(theme);
    const tokens = { ...base, ...themedAliases(base) };
    root.classList.add('pkr-themed', cls);
    for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
    return () => {
      root.classList.remove('pkr-themed', cls);
      for (const k of Object.keys(tokens)) root.style.removeProperty(k);
    };
  }, [themeId]);
}

/** Component form for trees that prefer it. Renders nothing. */
export function ThemeProvider({ themeId }: { themeId: string | undefined }) {
  useAppliedTheme(themeId);
  return null;
}
