import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  buildPhaseSynthesisWorklist,
  DEFAULT_SOURCE_CANDIDATES,
  DEFAULT_SOURCE_REF,
  DEFAULT_SOURCE_REPO,
  discoverSourceDocuments,
  resolveSourceRepository,
} from '../content-pipeline';

const tempDirectories: string[] = [];

function createTempDirectory(prefix: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirectories.push(directory);
  return directory;
}

function writeMarkdownFile(rootDirectory: string, relativePath: string): void {
  const absolutePath = path.join(rootDirectory, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `# ${relativePath}\n`, 'utf8');
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('resolveSourceRepository', () => {
  it('uses an explicit source path and repo slug override', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'workspace', 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './workspace/m3os',
      repoSlug: 'example/custom-os',
      ref: 'feature/docs',
    });

    expect(repository).toMatchObject({
      sourcePath: sourceDirectory,
      docsPath: path.join(sourceDirectory, 'docs'),
      repoSlug: 'example/custom-os',
      ref: 'feature/docs',
      repoUrl: 'https://github.com/example/custom-os',
    });
  });

  it('falls back to environment values and candidate source directories', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });

    const repository = resolveSourceRepository({
      cwd,
      env: {
        M3OS_SOURCE_REPO: 'mikecubed/m3os',
      },
      candidateSourcePaths: ['./m3os', './ostest'],
    });

    expect(repository.sourcePath).toBe(sourceDirectory);
    expect(repository.repoSlug).toBe(DEFAULT_SOURCE_REPO);
    expect(repository.ref).toBe(DEFAULT_SOURCE_REF);
  });

  it('throws a helpful error when it cannot find a source repository', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');

    expect(() =>
      resolveSourceRepository({
        cwd,
        candidateSourcePaths: DEFAULT_SOURCE_CANDIDATES,
      }),
    ).toThrow(/M3OS_SOURCE_PATH|--source/);
  });
});

describe('discoverSourceDocuments', () => {
  it('classifies phase docs, roadmap entries, task lists, and references', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });
    writeMarkdownFile(sourceDirectory, 'docs/05-userspace-entry.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/04-tasking.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/tasks/22b-ansi-escape-tasks.md');
    writeMarkdownFile(sourceDirectory, 'docs/README.md');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });

    const manifest = discoverSourceDocuments(repository);

    expect(manifest.documents).toEqual([
      {
        displayTitle: 'Userspace Entry',
        githubUrl: 'https://github.com/mikecubed/m3os/blob/main/docs/05-userspace-entry.md',
        kind: 'phase-doc',
        phaseId: '05',
        phaseOrder: 5,
        relativePath: 'docs/05-userspace-entry.md',
        slug: 'userspace-entry',
      },
      {
        displayTitle: 'README',
        githubUrl: 'https://github.com/mikecubed/m3os/blob/main/docs/README.md',
        kind: 'reference',
        relativePath: 'docs/README.md',
      },
      {
        displayTitle: 'Tasking',
        githubUrl: 'https://github.com/mikecubed/m3os/blob/main/docs/roadmap/04-tasking.md',
        kind: 'roadmap-entry',
        phaseId: '04',
        phaseOrder: 4,
        relativePath: 'docs/roadmap/04-tasking.md',
        slug: 'tasking',
      },
      {
        displayTitle: 'ANSI Escape',
        githubUrl:
          'https://github.com/mikecubed/m3os/blob/main/docs/roadmap/tasks/22b-ansi-escape-tasks.md',
        kind: 'task-list',
        phaseId: '22b',
        phaseOrder: 22,
        relativePath: 'docs/roadmap/tasks/22b-ansi-escape-tasks.md',
        slug: 'ansi-escape',
      },
    ]);
  });

  it('uses acronym-aware display titles for generated phase identities', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/23-socket-api.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/tasks/24-tty-pty-tasks.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/39-nodejs.md');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });

    const manifest = discoverSourceDocuments(repository);

    expect(manifest.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayTitle: 'Socket API',
          relativePath: 'docs/roadmap/23-socket-api.md',
        }),
        expect.objectContaining({
          displayTitle: 'TTY PTY',
          relativePath: 'docs/roadmap/tasks/24-tty-pty-tasks.md',
        }),
        expect.objectContaining({
          displayTitle: 'Node.js',
          relativePath: 'docs/roadmap/39-nodejs.md',
        }),
      ]),
    );
  });
});

describe('buildPhaseSynthesisWorklist', () => {
  it('prefers roadmap identity for canonical phase output and matches the closest implementation doc', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });
    writeMarkdownFile(sourceDirectory, 'docs/01-architecture.md');
    writeMarkdownFile(sourceDirectory, 'docs/02-boot.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/01-boot-foundation.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/tasks/01-boot-foundation-tasks.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/02-memory-basics.md');
    writeMarkdownFile(sourceDirectory, 'docs/legacy-os-comparison.md');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });

    const discoveryManifest = discoverSourceDocuments(repository);
    const worklist = buildPhaseSynthesisWorklist(discoveryManifest);

    expect(worklist.sharedReferences.map((reference) => reference.relativePath)).toEqual([
      'docs/legacy-os-comparison.md',
    ]);
    expect(worklist.phases).toHaveLength(2);
    expect(worklist.phases[0]).toMatchObject({
      phaseId: '01',
      phaseOrder: 1,
      slug: 'boot-foundation',
      title: 'Boot Foundation',
      outputPath: 'src/content/phases/boot-foundation.mdx',
      previousPhaseSlug: undefined,
      nextPhaseSlug: 'memory-basics',
      sourceDocuments: {
        phaseDoc: {
          relativePath: 'docs/02-boot.md',
          slug: 'boot',
        },
        roadmapEntry: {
          relativePath: 'docs/roadmap/01-boot-foundation.md',
          slug: 'boot-foundation',
        },
        taskLists: [
          {
            relativePath: 'docs/roadmap/tasks/01-boot-foundation-tasks.md',
            slug: 'boot-foundation',
          },
        ],
      },
    });
  });

  it('prefers semantic implementation matches over same-number but unrelated docs', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });
    writeMarkdownFile(sourceDirectory, 'docs/17-os-state-analysis.md');
    writeMarkdownFile(sourceDirectory, 'docs/20-memory-reclamation.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/17-memory-reclamation.md');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });

    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));

    expect(worklist.phases[0]).toMatchObject({
      phaseId: '17',
      slug: 'memory-reclamation',
      sourceDocuments: {
        phaseDoc: {
          relativePath: 'docs/20-memory-reclamation.md',
          slug: 'memory-reclamation',
        },
      },
    });
  });

  it('leaves the implementation document unset when no top-level doc is a credible match', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });
    writeMarkdownFile(sourceDirectory, 'docs/23-tty-terminal.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/23-socket-api.md');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });

    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));

    expect(worklist.phases[0]).toMatchObject({
      phaseId: '23',
      slug: 'socket-api',
      sourceDocuments: {
        phaseDoc: undefined,
      },
    });
  });

  it('creates a deterministic briefing for a later parallel synthesis worker', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });
    writeMarkdownFile(sourceDirectory, 'docs/05-tasking.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/04-tasking.md');
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/tasks/04-tasking-tasks.md');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });

    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));

    expect(worklist.phases[0]?.briefing).toContain('Phase 04 - Tasking');
    expect(worklist.phases[0]?.briefing).toContain(
      'Primary phase doc: docs/05-tasking.md',
    );
    expect(worklist.phases[0]?.briefing).toContain(
      'Primary roadmap entry: docs/roadmap/04-tasking.md',
    );
    expect(worklist.phases[0]?.briefing).toContain(
      'Task lists: docs/roadmap/tasks/04-tasking-tasks.md',
    );
    expect(worklist.phases[0]?.briefing).toContain(
      'Target output: src/content/phases/tasking.mdx',
    );
  });

  it('falls back to task list identity when a phase has no roadmap or phase doc yet', () => {
    const cwd = createTempDirectory('m3os-docs-pipeline-');
    const sourceDirectory = path.join(cwd, 'm3os');
    mkdirSync(path.join(sourceDirectory, 'docs'), { recursive: true });
    writeMarkdownFile(sourceDirectory, 'docs/roadmap/tasks/22b-ansi-escape-tasks.md');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });

    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));

    expect(worklist.phases).toEqual([
      expect.objectContaining({
        phaseId: '22b',
        phaseOrder: 22,
        slug: 'ansi-escape',
        title: 'ANSI Escape',
        outputPath: 'src/content/phases/ansi-escape.mdx',
      }),
    ]);
  });
});
