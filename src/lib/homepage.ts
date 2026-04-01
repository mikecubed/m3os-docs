import type { PhaseSummary } from './phase-utils';

export interface HomepageComponentSummary {
  id: string;
  data: {
    title: string;
    introducedIn: string;
    touchedBy: string[];
    summary: string;
    responsibilities: string[];
    keyFiles: {
      path: string;
      summary: string;
    }[];
  };
}

export type HomepagePhaseSummary = PhaseSummary;

export interface HomepageModel {
  hero: {
    eyebrow: string;
    title: string;
    lede: string;
  };
  stats: {
    label: string;
    value: string;
    detail: string;
  }[];
  learningPath: {
    title: string;
    description: string;
  }[];
  phasePageHighlights: string[];
  foundations: HomepagePhaseSummary[];
  advancedPhases: HomepagePhaseSummary[];
  featuredComponents: HomepageComponentSummary[];
}

export function buildHomepageModel(
  phases: readonly HomepagePhaseSummary[],
  components: readonly HomepageComponentSummary[],
): HomepageModel {
  const completedCount = phases.filter((phase) => phase.data.status === 'complete').length;
  const plannedCount = phases.filter((phase) => phase.data.status === 'planned').length;
  const sortedPhases = [...phases].sort((left, right) => left.data.phase - right.data.phase);
  const foundations = sortedPhases.filter((phase) => phase.data.category === 'foundations').slice(0, 6);
  const advancedPhases = sortedPhases
    .filter((phase) => phase.data.status !== 'complete')
    .slice(0, 6);
  const featuredComponents = [...components]
    .sort((left, right) => {
      const touchedDelta = right.data.touchedBy.length - left.data.touchedBy.length;

      if (touchedDelta !== 0) {
        return touchedDelta;
      }

      const keyFileDelta = right.data.keyFiles.length - left.data.keyFiles.length;

      if (keyFileDelta !== 0) {
        return keyFileDelta;
      }

      return left.data.title.localeCompare(right.data.title);
    })
    .slice(0, 6);

  return {
    hero: {
      eyebrow: 'Learning roadmap',
      title: 'Understand how m3OS grows from boot code into a usable operating system.',
      lede: `Study ${phases.length} roadmap phases and ${components.length} subsystem pages that explain why each milestone exists, how the implementation works in m3OS, and where a production OS would make different tradeoffs.`,
    },
    stats: [
      {
        label: 'Roadmap phases',
        value: String(phases.length),
        detail: 'Generated from the m3OS phase corpus now published in this site.',
      },
      {
        label: 'Completed phases',
        value: String(completedCount),
        detail: 'Already implemented in m3OS and documented with design decisions and tradeoffs.',
      },
      {
        label: 'Core components',
        value: String(components.length),
        detail: 'Subsystem pages that trace where schedulers, IPC, VFS, and other pieces appear.',
      },
      {
        label: 'Planned phases',
        value: String(plannedCount),
        detail: 'Future milestones you can study before the implementation lands.',
      },
    ],
    learningPath: [
      {
        title: 'Start with the foundations',
        description:
          'Follow the earliest phases in order to see boot, memory, interrupts, and tasking become the base layer for everything else.',
      },
      {
        title: 'Follow subsystem threads',
        description:
          'Use component pages to trace how one subsystem shows up across multiple phases instead of reading the roadmap as isolated milestones.',
      },
      {
        title: 'Compare against real OS design',
        description:
          'Each phase page calls out where m3OS intentionally stays simple and what a production kernel usually adds in exchange for scale, performance, or compatibility.',
      },
    ],
    phasePageHighlights: [
      'The design decisions and learning goal behind the phase, not just the task list.',
      'Important files and code spotlight links back to the upstream m3OS repository.',
      'How the phase builds on, extends, or replaces earlier work in the roadmap.',
      'What a real operating system would do differently once the teaching version is understood.',
    ],
    foundations,
    advancedPhases,
    featuredComponents,
  };
}
