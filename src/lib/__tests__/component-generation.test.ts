import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  generateComponentDocuments,
  type PhaseComponentSource,
} from '../component-generation';

const phases: PhaseComponentSource[] = [
  {
    components: ['boot-path'],
    keyFiles: [
      { path: 'xtask/src/main.rs', summary: 'Host-side image creation and QEMU orchestration.' },
      { path: 'kernel/src/main.rs', summary: 'Kernel entry and early runtime startup.' },
    ],
    phase: 1,
    slug: 'boot-foundation',
    summary: 'Boot the kernel through UEFI and establish early diagnostics.',
    title: 'Boot Foundation',
  },
  {
    components: ['scheduler', 'interrupt-router'],
    keyFiles: [
      { path: 'kernel/src/task/mod.rs', summary: 'Task state and scheduler glue.' },
      { path: 'kernel/src/arch/x86_64/interrupts.rs', summary: 'Interrupt handlers and IRQ flow.' },
    ],
    phase: 4,
    slug: 'tasking',
    summary: 'Introduce task switching and cooperative scheduling.',
    title: 'Tasking',
  },
  {
    components: ['scheduler', 'process-model'],
    keyFiles: [
      { path: 'kernel/src/process/mod.rs', summary: 'Userspace process state.' },
      { path: 'kernel/src/task/mod.rs', summary: 'Task state and scheduler glue.' },
    ],
    phase: 5,
    slug: 'userspace-entry',
    summary: 'Launch the first userspace process.',
    title: 'Userspace Entry',
  },
];

describe('generateComponentDocuments', () => {
  it('aggregates component docs from generated phase metadata', () => {
    const generatedDocuments = generateComponentDocuments(phases, {
      outputDirectory: '/tmp/components',
    });
    const schedulerDocument = generatedDocuments.find(
      (document) => document.slug === 'scheduler',
    );

    expect(generatedDocuments.map((document) => document.slug)).toEqual([
      'boot-path',
      'interrupt-router',
      'process-model',
      'scheduler',
    ]);
    expect(schedulerDocument).toMatchObject({
      outputPath: path.join('/tmp/components', 'scheduler.mdx'),
      slug: 'scheduler',
    });
    expect(schedulerDocument?.content).toContain('title: "Scheduler"');
    expect(schedulerDocument?.content).toContain('introducedIn: "tasking"');
    expect(schedulerDocument?.content).toContain('touchedBy:');
    expect(schedulerDocument?.content).toContain('  - "userspace-entry"');
    expect(schedulerDocument?.content).toContain('responsibilities:');
    expect(schedulerDocument?.content).toContain('keyFiles:');
    expect(schedulerDocument?.content).toContain('path: "kernel/src/task/mod.rs"');
    expect(schedulerDocument?.content).toContain(
      'The scheduler is introduced in Tasking and later touched by 1 phase(s).',
    );
  });

  it('keeps only key files that belong to the current component', () => {
    const generatedDocuments = generateComponentDocuments(phases, {
      outputDirectory: '/tmp/components',
    });
    const processModelDocument = generatedDocuments.find(
      (document) => document.slug === 'process-model',
    );

    expect(processModelDocument?.content).toContain('path: "kernel/src/process/mod.rs"');
    expect(processModelDocument?.content).not.toContain('path: "kernel/src/task/mod.rs"');
  });
});
