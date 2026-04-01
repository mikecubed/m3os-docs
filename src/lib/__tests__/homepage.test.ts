import { describe, expect, it } from 'vitest';

import { buildHomepageModel, type HomepageComponentSummary, type HomepagePhaseSummary } from '../homepage';

const phases: HomepagePhaseSummary[] = [
  {
    slug: 'boot-foundation',
    data: {
      phase: 1,
      title: 'Boot Foundation',
      status: 'complete',
      category: 'foundations',
      summary: 'Boot through UEFI and reach the kernel.',
      buildsOn: [],
    },
  },
  {
    slug: 'interrupts',
    data: {
      phase: 3,
      title: 'Interrupts',
      status: 'complete',
      category: 'foundations',
      summary: 'Handle exceptions and timer IRQs.',
      buildsOn: ['boot-foundation'],
    },
  },
  {
    slug: 'tasking',
    data: {
      phase: 4,
      title: 'Tasking',
      status: 'complete',
      category: 'foundations',
      summary: 'Add the scheduler and context switching.',
      buildsOn: ['interrupts'],
    },
  },
  {
    slug: 'socket-api',
    data: {
      phase: 23,
      title: 'Socket API',
      status: 'planned',
      category: 'infrastructure',
      summary: 'Expose TCP/IP to userspace.',
      buildsOn: ['ansi-escape'],
    },
  },
  {
    slug: 'nodejs',
    data: {
      phase: 52,
      title: 'Node.js',
      status: 'planned',
      category: 'productivity',
      summary: 'Run Node.js natively in m3OS.',
      buildsOn: ['networking-and-github'],
    },
  },
];

const components: HomepageComponentSummary[] = [
  {
    id: 'boot-path',
    data: {
      title: 'Boot Path',
      introducedIn: 'boot-foundation',
      touchedBy: ['interrupts'],
      summary: 'Move from firmware into the kernel.',
      responsibilities: [],
      keyFiles: [{ path: 'xtask/src/main.rs', summary: 'Build entry.' }],
    },
  },
  {
    id: 'scheduler',
    data: {
      title: 'Scheduler',
      introducedIn: 'tasking',
      touchedBy: ['nodejs', 'socket-api'],
      summary: 'Choose the next runnable task.',
      responsibilities: [],
      keyFiles: [{ path: 'kernel/src/task/scheduler.rs', summary: 'Scheduler core.' }],
    },
  },
];

describe('buildHomepageModel', () => {
  it('builds homepage stats and featured content from the real corpus shape', () => {
    const model = buildHomepageModel(phases, components);

    expect(model.stats).toEqual([
      {
        label: 'Roadmap phases',
        value: '5',
        detail: 'Generated from the m3OS phase corpus now published in this site.',
      },
      {
        label: 'Completed phases',
        value: '3',
        detail: 'Already implemented in m3OS and documented with design decisions and tradeoffs.',
      },
      {
        label: 'Core components',
        value: '2',
        detail: 'Subsystem pages that trace where schedulers, IPC, VFS, and other pieces appear.',
      },
      {
        label: 'Planned phases',
        value: '2',
        detail: 'Future milestones you can study before the implementation lands.',
      },
    ]);
    expect(model.foundations.map((phase) => phase.slug)).toEqual([
      'boot-foundation',
      'interrupts',
      'tasking',
    ]);
    expect(model.advancedPhases.map((phase) => phase.slug)).toEqual(['socket-api', 'nodejs']);
    expect(model.featuredComponents.map((component) => component.id)).toEqual(['scheduler', 'boot-path']);
  });

  it('replaces scaffold messaging with concrete learning workflow copy', () => {
    const model = buildHomepageModel(phases, components);

    expect(model.learningPath.map((item) => item.title)).toEqual([
      'Start with the foundations',
      'Follow subsystem threads',
      'Compare against real OS design',
    ]);
    expect(model.phasePageHighlights).toContain(
      'How the phase builds on, extends, or replaces earlier work in the roadmap.',
    );
    expect(model.hero.lede).not.toContain('scaffold');
    expect(model.hero.lede).not.toContain('starter');
  });
});
