import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildPhaseSynthesisWorklist, discoverSourceDocuments, resolveSourceRepository } from '../content-pipeline';
import { generatePhaseDocuments } from '../phase-generation';

const tempDirectories: string[] = [];

function createTempDirectory(prefix: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirectories.push(directory);
  return directory;
}

function writeMarkdownFile(rootDirectory: string, relativePath: string, content: string): void {
  const absolutePath = path.join(rootDirectory, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf8');
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('generatePhaseDocuments', () => {
  it('generates MDX frontmatter and learning sections from roadmap, phase, and task docs', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'docs/01-architecture.md',
      `# Architecture

## Overview

The boot path begins in UEFI, reaches the Rust kernel entry point, and initializes serial logging first.

## Design Principles

- keep the boot path explicit
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/01-boot-foundation.md',
      `# Phase 1 - Boot Foundation

## Milestone Goal

Boot the kernel through UEFI, print useful output over serial, and halt cleanly.

## Learning Goals

- Understand the boot handoff to \`kernel_main\`.
- Learn why serial logging is the first debugging surface.

## Implementation Outline

1. Set up the kernel crate and host-side \`xtask\`.
2. Initialize COM1 serial and expose print macros.

## Acceptance Criteria

- The kernel boots in QEMU through UEFI.
- Serial output includes a clear startup message.

## Documentation Deliverables

- explain the boot path from \`xtask\` to \`kernel_main\`

## How Real OS Implementations Differ

Production kernels support many more boot modes and richer diagnostics.

## Deferred Until Later

- framebuffer output

## Key Files

| File | Purpose |
|---|---|
| \`xtask/src/main.rs\` | Host-side image creation and QEMU orchestration. |
| \`kernel/src/main.rs\` | Kernel entry and early runtime startup. |
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/01-boot-foundation-tasks.md',
      `# Phase 1 Tasks - Boot Foundation

**Depends on:** none

## Implementation Tasks

- [x] P1-T001 Create the workspace.
- [x] P1-T002 Implement serial logging.
`,
    );

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });
    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));
    const generatedDocuments = generatePhaseDocuments(worklist, {
      outputDirectory: path.join(cwd, 'generated'),
    });

    expect(generatedDocuments).toHaveLength(1);
    expect(generatedDocuments[0]).toMatchObject({
      slug: 'boot-foundation',
      outputPath: path.join(cwd, 'generated', 'boot-foundation.mdx'),
    });
    expect(generatedDocuments[0]?.content).toContain('phase: 1');
    expect(generatedDocuments[0]?.content).toContain('title: "Boot Foundation"');
    expect(generatedDocuments[0]?.content).toContain('status: complete');
    expect(generatedDocuments[0]?.content).toContain('category: foundations');
    expect(generatedDocuments[0]?.content).toContain(
      'summary: "Boot the kernel through UEFI, print useful output over serial, and halt cleanly."',
    );
    expect(generatedDocuments[0]?.content).toContain(
      'learningGoal: "Understand the boot handoff to `kernel_main`."',
    );
    expect(generatedDocuments[0]?.content).toContain('components:');
    expect(generatedDocuments[0]?.content).toContain('  - "boot-path"');
    expect(generatedDocuments[0]?.content).toContain('keyFiles:');
    expect(generatedDocuments[0]?.content).toContain('path: "xtask/src/main.rs"');
    expect(generatedDocuments[0]?.content).toContain(
      'summary: "Host-side image creation and QEMU orchestration."',
    );
    expect(generatedDocuments[0]?.content).toContain('codeSpotlights:');
    expect(generatedDocuments[0]?.content).toContain(
      'title: "Host-side image creation and QEMU orchestration"',
    );
    expect(generatedDocuments[0]?.content).toContain('file: "xtask/src/main.rs"');
    expect(generatedDocuments[0]?.content).toContain(
      'githubUrl: "https://github.com/mikecubed/m3os/blob/main/xtask/src/main.rs"',
    );
    expect(generatedDocuments[0]?.content).toContain('realOsDifferences:');
    expect(generatedDocuments[0]?.content).toContain(
      '- "Production kernels support many more boot modes and richer diagnostics."',
    );
    expect(generatedDocuments[0]?.content).toContain('## Why this phase matters');
    expect(generatedDocuments[0]?.content).toContain('## How it works in m3OS');
    expect(generatedDocuments[0]?.content).toContain('## Source materials');
    expect(generatedDocuments[0]?.content).toContain(
      '[Roadmap entry](https://github.com/mikecubed/m3os/blob/main/docs/roadmap/01-boot-foundation.md)',
    );
  });

  it('infers progress status and prerequisite phase slugs from task metadata', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/01-boot-foundation.md',
      `# Phase 1 - Boot Foundation

## Milestone Goal

Boot foundation.

## Learning Goals

- Learn boot flow.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/01-boot-foundation-tasks.md',
      `# Phase 1 Tasks - Boot Foundation

**Depends on:** none

## Implementation Tasks

- [x] Done
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/02-memory-basics.md',
      `# Phase 2 - Memory Basics

## Milestone Goal

Introduce the first memory abstractions.

## Learning Goals

- Understand frame allocation.

## Acceptance Criteria

- Allocation works.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/02-memory-basics-tasks.md',
      `# Phase 2 Tasks - Memory Basics

**Depends on:** Boot Foundation

## Implementation Tasks

- [x] Early setup
- [ ] Finish allocator
`,
    );

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });
    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));
    const generatedDocuments = generatePhaseDocuments(worklist, {
      outputDirectory: path.join(cwd, 'generated'),
    });
    const memoryDocument = generatedDocuments.find((document) => document.slug === 'memory-basics');

    expect(memoryDocument?.content).toContain('status: in-progress');
    expect(memoryDocument?.content).toContain('buildsOn:');
    expect(memoryDocument?.content).toContain('- "boot-foundation"');
    expect(memoryDocument?.content).toContain('extends: []');
  });

  it('falls back to inline file references when a key file table is absent', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'docs/06-ipc-core.md',
      `# IPC Core

## Overview

The dispatcher lives in \`kernel/src/ipc/mod.rs\` and rendezvous endpoints live in \`kernel/src/ipc/endpoint.rs\`.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/06-ipc-core.md',
      `# Phase 6 - IPC Core

## Milestone Goal

Enable capability-based IPC between tasks.

## Learning Goals

- Understand endpoint rendezvous.
`,
    );

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });
    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));
    const generatedDocuments = generatePhaseDocuments(worklist, {
      outputDirectory: path.join(cwd, 'generated'),
    });
    const ipcDocument = generatedDocuments.find((document) => document.slug === 'ipc-core');

    expect(ipcDocument?.content).toContain('components:');
    expect(ipcDocument?.content).toContain('  - "ipc"');
    expect(ipcDocument?.content).toContain('path: "kernel/src/ipc/mod.rs"');
    expect(ipcDocument?.content).toContain('path: "kernel/src/ipc/endpoint.rs"');
    expect(ipcDocument?.content).toContain(
      'summary: "The dispatcher lives in kernel/src/ipc/mod.rs and rendezvous endpoints live in kernel/src/ipc/endpoint.rs."',
    );
  });

  it('reconstructs multiline bullets and infers components from phase text when key files are absent', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/04-tasking.md',
      `# Phase 4 - Tasking

## Milestone Goal

Introduce the scheduler and explain context switching.

## Learning Goals

- Understand what a task context contains and why
  preserving it across timer-driven scheduling matters.

## Implementation Outline

1. Build a simple scheduler around ready tasks and context switching.

## Acceptance Criteria

- Timer-driven scheduling rotates runnable tasks.
`,
    );

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });
    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));
    const generatedDocuments = generatePhaseDocuments(worklist, {
      outputDirectory: path.join(cwd, 'generated'),
    });
    const taskingDocument = generatedDocuments.find((document) => document.slug === 'tasking');

    expect(taskingDocument?.content).toContain('title: "Tasking"');
    expect(taskingDocument?.content).toContain('  - "scheduler"');
    expect(taskingDocument?.content).toContain(
      'learningGoal: "Understand what a task context contains and why preserving it across timer-driven scheduling matters."',
    );
  });
});
