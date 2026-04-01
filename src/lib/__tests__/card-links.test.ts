import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = '/home/mikecubed/projects/m3os-docs';

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('list card link markup', () => {
  it('uses a full-card anchor in the shared phase card component', () => {
    const source = readProjectFile('src/components/PhaseCard.astro');

    expect(source).toContain('<a class="phase-card" href={withBase(`/phases/${phase.slug}/`)}>');
    expect(source).not.toContain('<article class="phase-card">');
  });

  it('uses a full-card anchor for homepage featured components', () => {
    const source = readProjectFile('src/pages/index.astro');

    expect(source).toContain('<a class="phase-card" href={withBase(`/components/${component.id}/`)}>');
    expect(source).not.toContain('<article class="phase-card">');
  });

  it('uses a full-card anchor for the components index grid', () => {
    const source = readProjectFile('src/pages/components/index.astro');

    expect(source).toContain('<a class="phase-card" href={withBase(`/components/${component.id}/`)}>');
    expect(source).not.toContain('<article class="phase-card">');
  });
});
