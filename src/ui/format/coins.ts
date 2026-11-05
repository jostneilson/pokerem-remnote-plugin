/*
 * The one way PokéRem shows money. Short form for every label; the exact amount goes in tooltips,
 * aria-labels and purchase confirms. Short amounts round down, so they never show more than you have.
 */

function sign(n: number): string {
  return n < 0 ? '−' : '';
}

/** `₽999`, `₽1.5k`, `₽15k`, `₽152k`, `₽1.2M`. */
export function formatCoins(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? Math.trunc(amount) : 0;
  const v = Math.abs(n);
  let body: string;
  if (v < 1000) body = `${v}`;
  else if (v < 10_000) body = `${(Math.floor(v / 100) / 10).toFixed(1)}k`;
  else if (v < 1_000_000) body = `${Math.floor(v / 1000)}k`;
  else body = `${(Math.floor(v / 100_000) / 10).toFixed(1)}M`;
  return `${sign(n)}₽${body}`;
}

/** `₽1,550` — for tooltips, aria-labels and confirms. */
export function formatCoinsExact(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? Math.trunc(amount) : 0;
  return `${sign(n)}₽${Math.abs(n).toLocaleString('en-US')}`;
}

/** Screen-reader wording: "1,550 Poké Dollars". */
export function coinsSpoken(amount: number | null | undefined): string {
  return `${formatCoinsExact(amount).replace(/^−?₽/, (m) => (m.startsWith('−') ? 'minus ' : ''))} Poké Dollars`;
}
