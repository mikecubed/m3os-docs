import { execFileSync } from 'node:child_process';
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

function runGit(rootDirectory: string, ...args: string[]): void {
  execFileSync('git', args, {
    cwd: rootDirectory,
    stdio: 'ignore',
  });
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

  it('uses the upstream kernel version as a fallback while allowing the current phase to be marked complete', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'kernel/Cargo.toml',
      `[package]
name = "kernel"
version = "0.36.0"
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/34-real-time-clock.md',
      `# Phase 34 - Real-Time Clock

## Milestone Goal

Teach the kernel about wall clock time.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/34-real-time-clock-tasks.md',
      `# Phase 34 — Real-Time Clock and Timekeeping: Task List

## Track Layout

| Track | Scope | Dependencies | Status |
|---|---|---|---|
| A | Time conversion | — | ✅ Done |
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/35-true-smp-multitasking.md',
      `# Phase 35 - True SMP Multitasking

## Milestone Goal

Dispatch work across all CPU cores.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/35-true-smp-multitasking-tasks.md',
      `# Phase 35 — True SMP Multitasking: Task List

## Track Layout

| Track | Scope | Dependencies | Status |
|---|---|---|---|
| A | Per-core syscall infrastructure | — | Done |
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/36-expanded-memory.md',
      `# Phase 36 - Expanded Memory

## Milestone Goal

Expand demand paging.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/36-expanded-memory-tasks.md',
      `# Phase 36 — Expanded Memory: Task List

**Status:** Complete

## Track Layout

| Track | Scope | Dependencies | Status |
|---|---|---|---|
| A | Demand paging | — | Done |
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/37-io-multiplexing.md',
      `# Phase 37 - I/O Multiplexing

## Milestone Goal

Add poll/select style waiting.
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

    expect(generatedDocuments.find((document) => document.slug === 'real-time-clock')?.content).toContain(
      'status: complete',
    );
    expect(
      generatedDocuments.find((document) => document.slug === 'true-smp-multitasking')?.content,
    ).toContain('status: complete');
    expect(generatedDocuments.find((document) => document.slug === 'expanded-memory')?.content).toContain(
      'status: complete',
    );
    expect(generatedDocuments.find((document) => document.slug === 'io-multiplexing')?.content).toContain(
      'status: planned',
    );
  });

  it('extracts source-backed code spotlight snippets from task sections with file references', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'kernel/src/task/scheduler.rs',
      `pub fn pick_next(core_id: usize) -> Option<usize> {
    if core_id != 0 {
        return Some(0);
    }

    Some(core_id + 1)
}
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/35-true-smp-multitasking.md',
      `# Phase 35 - True SMP Multitasking

## Milestone Goal

Dispatch work across all CPU cores.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/35-true-smp-multitasking-tasks.md',
      `# Phase 35 — True SMP Multitasking: Task List

## Track B — Multi-Core Task Dispatch

### B.1 — Remove BSP-only dispatch guard

**File:** \`kernel/src/task/scheduler.rs\`

Remove the \`pick_next()\` guard so all cores can choose runnable work.
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
    const smpDocument = generatedDocuments.find((document) => document.slug === 'true-smp-multitasking');

    expect(smpDocument?.content).toContain('codeSpotlights:');
    expect(smpDocument?.content).toContain('title: "Remove BSP-only dispatch guard"');
    expect(smpDocument?.content).toContain('file: "kernel/src/task/scheduler.rs"');
    expect(smpDocument?.content).toContain('lines: "L1-L7"');
    expect(smpDocument?.content).toContain('snippetLanguage: "rust"');
    expect(smpDocument?.content).toContain('snippet: "pub fn pick_next(core_id: usize) -> Option<usize> {');
  });

  it('prefers function declarations so boot snippets include the full function body', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'kernel/src/main.rs',
      `#![no_std]
#![no_main]

use bootloader_api::{entry_point, BootInfo};

entry_point!(kernel_main);

fn kernel_main(_boot_info: &'static mut BootInfo) -> ! {
    serial::init();
    serial::init_logger();

    serial_println!("[m3os] Hello from kernel!");
    log::info!("Kernel initialized");

    hlt_loop();
}

fn hlt_loop() -> ! {
    loop {
        x86_64::instructions::hlt();
    }
}
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/01-boot-foundation.md',
      `# Phase 1 - Boot Foundation

## Milestone Goal

Boot the kernel through UEFI and halt cleanly.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/01-boot-foundation-tasks.md',
      `# Phase 1 — Boot Foundation: Task List

### A.1 — Implement a minimal kernel_main entry point

**File:** \`kernel/src/main.rs\`
**Symbol:** \`kernel_main\`, \`entry_point!(kernel_main)\`
**Why it matters:** This is the first code that runs after the bootloader hands off control; it must reach a stable halt loop.

Implement a minimal kernel_main entry point.
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
    const bootDocument = generatedDocuments.find((document) => document.slug === 'boot-foundation');

    expect(bootDocument?.content).toContain('entry_point!(kernel_main);');
    expect(bootDocument?.content).toContain('snippet: "entry_point!(kernel_main);');
    expect(bootDocument?.content).toContain('hlt_loop();');
    expect(bootDocument?.content).toContain('x86_64::instructions::hlt();');
  });

  it('adds teaching summaries and walkthrough steps to code spotlights when task docs provide them', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'kernel/src/task/scheduler.rs',
      `pub fn pick_next(core_id: usize) -> Option<usize> {
    if core_id != 0 {
        return Some(0);
    }

    Some(core_id + 1)
}
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/35-true-smp-multitasking.md',
      `# Phase 35 - True SMP Multitasking

## Milestone Goal

Dispatch work across all CPU cores.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/35-true-smp-multitasking-tasks.md',
      `# Phase 35 — True SMP Multitasking: Task List

## Track B — Multi-Core Task Dispatch

### B.1 — Remove BSP-only dispatch guard

**File:** \`kernel/src/task/scheduler.rs\`
**Symbol:** \`pick_next\`
**Why it matters:** Once scheduling leaves the bootstrap processor, every core needs the same dispatch path.

Remove the \`pick_next()\` guard so all cores can choose runnable work.

#### Step 1 — Drop the BSP check
Delete the early return that forces secondary cores back to CPU 0.

#### Step 2 — Keep the runnable fallback
Leave the final \`Some(core_id + 1)\` path in place so dispatch still returns work.
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
    const smpDocument = generatedDocuments.find((document) => document.slug === 'true-smp-multitasking');

    expect(smpDocument?.content).toContain(
      'summary: "Remove the pick_next() guard so all cores can choose runnable work. Why it matters: Once scheduling leaves the bootstrap processor, every core needs the same dispatch path. Focus on `pick_next` in `kernel/src/task/scheduler.rs` while you trace the snippet."',
    );
    expect(smpDocument?.content).toContain('steps:');
    expect(smpDocument?.content).toContain('title: "Drop the BSP check"');
    expect(smpDocument?.content).toContain(
      'summary: "Delete the early return that forces secondary cores back to CPU 0."',
    );
    expect(smpDocument?.content).toContain('title: "Keep the runnable fallback"');
    expect(smpDocument?.content).toContain(
      'summary: "Leave the final Some(core_id + 1) path in place so dispatch still returns work."',
    );
  });

  it('ignores markdown separators when building spotlight summaries', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'xtask/src/main.rs',
      `fn cmd_sign() {}

fn sign_efi() {}
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/10-secure-boot.md',
      `# Phase 10 - Secure Boot

## Milestone Goal

Sign EFI binaries and boot with Secure Boot enabled.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/10-secure-boot-tasks.md',
      `# Phase 10 — Secure Boot: Task List

### A.1 — Add sign subcommand to xtask

**File:** \`xtask/src/main.rs\`
**Symbol:** \`cmd_sign\`
**Why it matters:** Integrating signing into the build pipeline avoids manual sbsign invocations.
---
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
    const secureBootDocument = generatedDocuments.find((document) => document.slug === 'secure-boot');

    expect(secureBootDocument?.content).toContain(
      'summary: "Add sign subcommand to xtask. Why it matters: Integrating signing into the build pipeline avoids manual sbsign invocations. Focus on `cmd_sign` in `xtask/src/main.rs` while you trace the snippet."',
    );
  });

  it('uses a phase source ref for links and snippets when upstream docs provide one', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'docs/34-timekeeping.md',
      `# Phase 34 Notes

## Overview

RTC initialization lives in \`kernel/src/rtc.rs\`.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/34-real-time-clock.md',
      `# Phase 34 - Real-Time Clock

**Source Ref:** phase-34

## Milestone Goal

Teach the kernel wall-clock time.

## Learning Goals

- Understand RTC bring-up.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/34-real-time-clock-tasks.md',
      `# Phase 34 — Real-Time Clock: Task List

**Source Ref:** phase-34

### A.1 — Initialize RTC
**File:** \`kernel/src/rtc.rs\`
**Symbol:** \`init_rtc\`
**Why it matters:** Reads the RTC once at boot.

**Acceptance:**
- [x] Works
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'kernel/src/rtc.rs',
      `pub fn init_rtc() {
    let source = "tagged";
    let _ = source;
}
`,
    );

    runGit(sourceDirectory, 'init');
    runGit(sourceDirectory, 'config', 'user.name', 'Copilot Test');
    runGit(sourceDirectory, 'config', 'user.email', 'copilot@example.com');
    runGit(sourceDirectory, 'add', '.');
    runGit(sourceDirectory, 'commit', '-m', 'Initial phase 34 state');
    runGit(sourceDirectory, 'tag', 'phase-34');

    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/34-real-time-clock.md',
      `# Phase 34 - Real-Time Clock

**Source Ref:** phase-34

## Milestone Goal

Teach the kernel wall-clock time from the cleaned-up main docs.

## Learning Goals

- Understand RTC bring-up.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'kernel/src/rtc.rs',
      `pub fn init_rtc() {
    let source = "main";
    let _ = source;
}
`,
    );
    runGit(sourceDirectory, 'add', 'kernel/src/rtc.rs');
    runGit(sourceDirectory, 'commit', '-m', 'Change rtc implementation on main');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });
    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));
    const generatedDocuments = generatePhaseDocuments(worklist, {
      outputDirectory: path.join(cwd, 'generated'),
    });
    const generatedDocument = generatedDocuments.find(
      (document) => document.slug === 'real-time-clock',
    );

    expect(generatedDocument?.content).toContain(
      'githubUrl: "https://github.com/mikecubed/m3os/blob/phase-34/kernel/src/rtc.rs"',
    );
    expect(generatedDocument?.content).toContain(
      '[Roadmap entry](https://github.com/mikecubed/m3os/blob/main/docs/roadmap/34-real-time-clock.md)',
    );
    expect(generatedDocument?.content).toContain(
      'summary: "Teach the kernel wall-clock time from the cleaned-up main docs."',
    );
    expect(generatedDocument?.content).toContain('let source = \\"tagged\\";');
    expect(generatedDocument?.content).not.toContain('let source = \\"main\\";');
  });

  it('falls back to the default source ref when an explicit phase ref is unavailable locally', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/35-true-smp-multitasking.md',
      `# Phase 35 - True SMP Multitasking

**Source Ref:** phase-35

## Milestone Goal

Dispatch work across all CPU cores.

## Learning Goals

- Understand per-core syscall state.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/35-true-smp-multitasking-tasks.md',
      `# Phase 35 — True SMP Multitasking: Task List

**Source Ref:** phase-35

### A.1 — Move syscall state into per-core storage
**File:** \`kernel/src/smp/mod.rs\`
**Symbol:** \`PerCoreData\`
**Why it matters:** Keeps syscall save state isolated per core.

**Acceptance:**
- [x] Works
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'kernel/src/smp/mod.rs',
      `pub struct PerCoreData {
    pub syscall_stack_top: u64,
}
`,
    );

    runGit(sourceDirectory, 'init');
    runGit(sourceDirectory, 'config', 'user.name', 'Copilot Test');
    runGit(sourceDirectory, 'config', 'user.email', 'copilot@example.com');
    runGit(sourceDirectory, 'add', '.');
    runGit(sourceDirectory, 'commit', '-m', 'Current main state');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });
    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));
    const generatedDocuments = generatePhaseDocuments(worklist, {
      outputDirectory: path.join(cwd, 'generated'),
    });
    const generatedDocument = generatedDocuments.find(
      (document) => document.slug === 'true-smp-multitasking',
    );

    expect(generatedDocument?.content).toContain(
      'githubUrl: "https://github.com/mikecubed/m3os/blob/main/kernel/src/smp/mod.rs"',
    );
    expect(generatedDocument?.content).toContain('pub struct PerCoreData {');
  });

  it('falls back to a matching version tag when the explicit source ref name is not present locally', () => {
    const cwd = createTempDirectory('m3os-docs-generate-');
    const sourceDirectory = path.join(cwd, 'm3os');

    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/34-real-time-clock.md',
      `# Phase 34 - Real-Time Clock

**Source Ref:** phase-34

## Milestone Goal

Teach the kernel wall-clock time.

## Learning Goals

- Understand RTC bring-up.
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'docs/roadmap/tasks/34-real-time-clock-tasks.md',
      `# Phase 34 — Real-Time Clock: Task List

**Source Ref:** phase-34

### A.1 — Initialize RTC
**File:** \`kernel/src/rtc.rs\`
**Symbol:** \`init_rtc\`
**Why it matters:** Reads the RTC once at boot.

**Acceptance:**
- [x] Works
`,
    );
    writeMarkdownFile(
      sourceDirectory,
      'kernel/src/rtc.rs',
      `pub fn init_rtc() {
    let source = "version-tag";
    let _ = source;
}
`,
    );

    runGit(sourceDirectory, 'init');
    runGit(sourceDirectory, 'config', 'user.name', 'Copilot Test');
    runGit(sourceDirectory, 'config', 'user.email', 'copilot@example.com');
    runGit(sourceDirectory, 'add', '.');
    runGit(sourceDirectory, 'commit', '-m', 'Initial phase 34 state');
    runGit(sourceDirectory, 'tag', 'v0.34.0');

    writeMarkdownFile(
      sourceDirectory,
      'kernel/src/rtc.rs',
      `pub fn init_rtc() {
    let source = "main";
    let _ = source;
}
`,
    );
    runGit(sourceDirectory, 'add', 'kernel/src/rtc.rs');
    runGit(sourceDirectory, 'commit', '-m', 'Change rtc implementation on main');

    const repository = resolveSourceRepository({
      cwd,
      sourcePath: './m3os',
      repoSlug: 'mikecubed/m3os',
    });
    const worklist = buildPhaseSynthesisWorklist(discoverSourceDocuments(repository));
    const generatedDocuments = generatePhaseDocuments(worklist, {
      outputDirectory: path.join(cwd, 'generated'),
    });
    const generatedDocument = generatedDocuments.find(
      (document) => document.slug === 'real-time-clock',
    );

    expect(generatedDocument?.content).toContain(
      'githubUrl: "https://github.com/mikecubed/m3os/blob/v0.34.0/kernel/src/rtc.rs"',
    );
    expect(generatedDocument?.content).toContain('let source = \\"version-tag\\";');
    expect(generatedDocument?.content).not.toContain('let source = \\"main\\";');
  });
});
