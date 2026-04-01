import { describe, expect, it } from 'vitest';

import {
  findRelatedPhases,
  groupPhasesByCategory,
  sortPhases,
  type PhaseSummary,
} from '../phase-utils';

const phases: PhaseSummary[] = [
  {
    slug: 'tasking',
    data: {
      phase: 4,
      title: 'Tasking',
      summary: 'Task switching and scheduling.',
      category: 'foundations',
      status: 'complete',
      buildsOn: ['memory-basics', 'interrupts'],
    },
  },
  {
    slug: 'memory-basics',
    data: {
      phase: 2,
      title: 'Memory Basics',
      summary: 'Frames, pages, and heap allocation.',
      category: 'foundations',
      status: 'complete',
      buildsOn: ['boot-foundation'],
    },
  },
  {
    slug: 'userspace-entry',
    data: {
      phase: 5,
      title: 'Userspace Entry',
      summary: 'The first ring 3 transition.',
      category: 'userspace',
      status: 'complete',
      buildsOn: ['tasking'],
    },
  },
  {
    slug: 'interrupts',
    data: {
      phase: 3,
      title: 'Interrupts',
      summary: 'IRQ and exception handling.',
      category: 'foundations',
      status: 'complete',
      buildsOn: ['boot-foundation', 'memory-basics'],
    },
  },
  {
    slug: 'boot-foundation',
    data: {
      phase: 1,
      title: 'Boot Foundation',
      summary: 'UEFI to kernel entry.',
      category: 'foundations',
      status: 'complete',
      buildsOn: [],
    },
  },
];

describe('sortPhases', () => {
  it('sorts phases by phase number ascending', () => {
    expect(sortPhases(phases).map((phase) => phase.slug)).toEqual([
      'boot-foundation',
      'memory-basics',
      'interrupts',
      'tasking',
      'userspace-entry',
    ]);
  });
});

describe('groupPhasesByCategory', () => {
  it('groups phases by category and preserves phase ordering inside each category', () => {
    const grouped = groupPhasesByCategory(phases);

    expect(grouped.get('foundations')?.map((phase) => phase.slug)).toEqual([
      'boot-foundation',
      'memory-basics',
      'interrupts',
      'tasking',
    ]);
    expect(grouped.get('userspace')?.map((phase) => phase.slug)).toEqual(['userspace-entry']);
  });
});

describe('findRelatedPhases', () => {
  it('returns both prerequisites and unlocked phases for the current phase', () => {
    const relatedPhases = findRelatedPhases('tasking', phases);

    expect(relatedPhases.buildsOn.map((phase) => phase.slug)).toEqual([
      'memory-basics',
      'interrupts',
    ]);
    expect(relatedPhases.unlocks.map((phase) => phase.slug)).toEqual(['userspace-entry']);
  });
});
