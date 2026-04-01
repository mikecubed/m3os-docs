export type PhaseStatus = 'complete' | 'planned' | 'in-progress';

export type PhaseCategory =
  | 'foundations'
  | 'userspace'
  | 'infrastructure'
  | 'productivity'
  | 'showcase';

export interface PhaseSummary {
  slug: string;
  data: {
    phase: number;
    title: string;
    summary: string;
    category: PhaseCategory;
    status: PhaseStatus;
    buildsOn: string[];
  };
}

export interface RelatedPhases {
  buildsOn: PhaseSummary[];
  unlocks: PhaseSummary[];
}

export function sortPhases(phases: readonly PhaseSummary[]): PhaseSummary[] {
  return [...phases].sort((left, right) => left.data.phase - right.data.phase);
}

export function groupPhasesByCategory(
  phases: readonly PhaseSummary[],
): Map<PhaseCategory, PhaseSummary[]> {
  const groupedPhases = new Map<PhaseCategory, PhaseSummary[]>();

  for (const phase of sortPhases(phases)) {
    const existingPhases = groupedPhases.get(phase.data.category) ?? [];
    existingPhases.push(phase);
    groupedPhases.set(phase.data.category, existingPhases);
  }

  return groupedPhases;
}

export function findRelatedPhases(
  currentPhaseSlug: string,
  phases: readonly PhaseSummary[],
): RelatedPhases {
  const sortedPhases = sortPhases(phases);
  const currentPhase = sortedPhases.find((phase) => phase.slug === currentPhaseSlug);

  if (!currentPhase) {
    return {
      buildsOn: [],
      unlocks: [],
    };
  }

  return {
    buildsOn: currentPhase.data.buildsOn
      .map((slug) => sortedPhases.find((phase) => phase.slug === slug))
      .filter((phase): phase is PhaseSummary => phase !== undefined),
    unlocks: sortedPhases.filter((phase) => phase.data.buildsOn.includes(currentPhaseSlug)),
  };
}
