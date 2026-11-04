import { describe, expect, it } from 'vitest';
import { coinsSpoken, formatCoins, formatCoinsExact } from './coins';

describe('formatCoins', () => {
  it('matches the 1.6.0 display rules', () => {
    expect(formatCoins(0)).toBe('₽0');
    expect(formatCoins(999)).toBe('₽999');
    expect(formatCoins(1000)).toBe('₽1.0k');
    expect(formatCoins(1550)).toBe('₽1.5k');
    expect(formatCoins(1999)).toBe('₽1.9k');
    expect(formatCoins(9999)).toBe('₽9.9k');
    expect(formatCoins(10_000)).toBe('₽10k');
    expect(formatCoins(15_200)).toBe('₽15k');
    expect(formatCoins(152_999)).toBe('₽152k');
    expect(formatCoins(999_999)).toBe('₽999k');
    expect(formatCoins(1_200_000)).toBe('₽1.2M');
    expect(formatCoins(1_299_999)).toBe('₽1.2M');
  });

  it('handles junk and negatives', () => {
    expect(formatCoins(undefined)).toBe('₽0');
    expect(formatCoins(NaN)).toBe('₽0');
    expect(formatCoins(-1550)).toBe('−₽1.5k');
  });

  it('exact and spoken forms', () => {
    expect(formatCoinsExact(1550)).toBe('₽1,550');
    expect(formatCoinsExact(1_200_000)).toBe('₽1,200,000');
    expect(coinsSpoken(1550)).toBe('1,550 Poké Dollars');
  });
});
