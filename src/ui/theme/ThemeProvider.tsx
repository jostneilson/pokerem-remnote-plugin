import { useEffect, useLayoutEffect, useState } from 'react';
import { themeById, themeClassName, themedAliases, themeTokens } from './themes';

/**
 * Applies the equipped type theme (SPEC A12) to this widget's document: the `pkr-theme-<type>` class and the
 * surface/ink tokens on `<html>`, so the sidebar root, portaled modals on `document.body`, the queue strip
 * and the popup all read the same values. Each widget is its own iframe, so each calls this once.
 * `battleAmbienceCssVars` still sets the arena's own colours inside the battle field.
 */
export function useAppliedTheme(themeId: string | undefined): void {
  const preview = useThemePreview();
  const shown = preview === undefined ? themeId : preview === 'default' ? undefined : preview;
  useLayoutEffect(() => {
    const theme = themeById(shown);
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
  }, [shown]);
}

/**
 * Shop try-on (SPEC U11): one preview per widget document, shown instead of the equipped theme while set.
 * `'default'` previews the plain arcade look. Kept outside React state so the shop and the sidebar root agree.
 */
let previewId: string | undefined;
const listeners = new Set<(id: string | undefined) => void>();

export function setThemePreview(id: string | undefined): void {
  if (id === previewId) return;
  previewId = id;
  for (const l of listeners) l(id);
}

export function useThemePreview(): string | undefined {
  const [id, setId] = useState(previewId);
  useEffect(() => {
    listeners.add(setId);
    setId(previewId);
    return () => {
      listeners.delete(setId);
    };
  }, []);
  return id;
}

/** Component form for trees that prefer it. Renders nothing. */
export function ThemeProvider({ themeId }: { themeId: string | undefined }) {
  useAppliedTheme(themeId);
  return null;
}
