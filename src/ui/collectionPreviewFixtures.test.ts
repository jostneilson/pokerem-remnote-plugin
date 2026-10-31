import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(fileURLToPath(new URL('../../tools/preview/index.tsx', import.meta.url)), 'utf8');

describe('isolated collection preview matrix', () => {
  it.each(['legendary', 'ultra-beast', 'shiny', 'fainted', 'cash-bonus', 'full-party-catch'])(
    'includes the %s scenario',
    (scenario) => expect(source).toContain(`captureScenario==='${scenario}'`),
  );

  it('uses common as the deterministic default scenario', () => {
    expect(source).toContain("captureParams.get('scenario')??'common'");
  });

  it.each([280, 320, 400, 520])('supports a %ipx collection viewport', (width) => {
    expect(source).toContain(`[280,320,400,520]`);
    expect(source).toContain('captureWidth');
    expect(width).toBeGreaterThanOrEqual(280);
  });

  it('exposes reduced motion and never connects the fixture to live RemNote', () => {
    expect(source).toContain("captureParams.get('reducedMotion')==='1'");
    expect(source).toContain('No RemNote connection');
    expect(source).not.toContain('@remnote/plugin-sdk');
  });
});
