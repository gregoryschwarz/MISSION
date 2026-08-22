import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../src/parent/style.css', import.meta.url), 'utf8');

describe('parent desktop layout', () => {
  it('gives every new dashboard section the full twelve-column width', () => {
    expect(css).toContain('.dashboard > .parent-weekly-report,');
    expect(css).toContain('.dashboard > .parent-curriculum,');
    expect(css).toContain('.dashboard > .retention-summary');
    expect(css).toMatch(/\.dashboard > \.parent-weekly-report,[\s\S]*\.dashboard > \.retention-summary,[\s\S]*\{\s*grid-column:\s*1\s*\/\s*-1/);
  });

  it('keeps competency cards readable instead of squeezing their text', () => {
    expect(css).toMatch(/\.parent-competency-grid\s*\{[^}]*repeat\(auto-fit,minmax\(280px,1fr\)\)/);
    expect(css).toMatch(/\.parent-competency-card\s*\{[^}]*min-width:\s*0/);
  });
});
