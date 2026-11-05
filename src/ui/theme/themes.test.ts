import { describe, expect, it } from 'vitest';
import { buyTheme, createInitialStateV4, equipTheme, parseGameState } from '../../game/state/store';
import { THEME_SHOP, themePrice } from '../../game/balance';
import { contrastRatio, THEMES, themeClassName, themeTokens } from './themes';

describe('type themes (SPEC A12, Appendix H)', () => {
  it('has one theme per type, 18 in all', () => {
    expect(THEMES).toHaveLength(18);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(18);
    expect(themeClassName('Fire')).toBe('pkr-theme-fire');
  });

  // C5: body text meets WCAG AA (4.5:1) on both panels in every theme.
  it.each(THEMES.map((t) => [t.id, t] as const))('%s body inks meet AA on panel', (_id, t) => {
    const tk = themeTokens(t);
    for (const ink of ['--pkr-ink', '--pkr-ink-text', '--pkr-ink-soft', '--pkr-ink-muted'])
      for (const bg of ['--pkr-panel', '--pkr-panel-2', '--pkr-bg'])
        expect(contrastRatio(tk[ink]!, tk[bg]!), `${ink} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });
});

describe('theme save fields', () => {
  it('keeps valid owned themes and an owned active theme', () => {
    const s = parseGameState(JSON.parse(JSON.stringify({ ...createInitialStateV4(), themesOwned: ['Fire', 'Fire', 'Water', 'Lava', 3], themeActive: 'Water' })));
    expect(s.themesOwned).toEqual(['Fire', 'Water']);
    expect(s.themeActive).toBe('Water');
  });

  it('drops an active theme that is not owned', () => {
    const s = parseGameState(JSON.parse(JSON.stringify({ ...createInitialStateV4(), themesOwned: ['Fire'], themeActive: 'Ghost' })));
    expect(s.themeActive).toBeUndefined();
  });

  it('leaves saves without themes alone', () => {
    const s = parseGameState(JSON.parse(JSON.stringify(createInitialStateV4())));
    expect(s.themesOwned).toBeUndefined();
    expect(s.themeActive).toBeUndefined();
  });
});

describe('theme shop (SPEC U11)', () => {
  const rich = () => ({ ...createInitialStateV4(), currency: 100_000 });

  it('buys at ₽45k, owns and equips the theme', () => {
    const s = buyTheme(rich(), 'Fire');
    expect(s.currency).toBe(100_000 - THEME_SHOP.price);
    expect(s.themesOwned).toEqual(['Fire']);
    expect(s.themeActive).toBe('Fire');
  });

  it('a voucher takes 20% off one theme and is spent', () => {
    const s = buyTheme({ ...rich(), themeVouchers: 2 }, 'Water', true);
    expect(s.currency).toBe(100_000 - themePrice(true));
    expect(themePrice(true)).toBe(36_000);
    expect(s.themeVouchers).toBe(1);
  });

  it('refuses unknown, owned, unaffordable and voucher-less buys', () => {
    const s = rich();
    expect(buyTheme(s, 'Lava')).toBe(s);
    const owned = buyTheme(s, 'Fire');
    expect(buyTheme(owned, 'Fire')).toBe(owned);
    const poor = { ...s, currency: 1000 };
    expect(buyTheme(poor, 'Ice')).toBe(poor);
    expect(buyTheme(s, 'Ice', true)).toBe(s);
  });

  it('equips owned themes and the free default only', () => {
    const owned = buyTheme(buyTheme(rich(), 'Fire'), 'Ghost');
    expect(equipTheme(owned, 'Fire').themeActive).toBe('Fire');
    expect(equipTheme(owned, 'default').themeActive).toBeUndefined();
    expect(equipTheme(owned, 'Ice')).toBe(owned);
  });
});
