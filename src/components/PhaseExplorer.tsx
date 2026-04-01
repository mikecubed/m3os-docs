import { useMemo, useState } from 'react';

import type { PhaseCategory, PhaseStatus, PhaseSummary } from '../lib/phase-utils';
import { withBase } from '../lib/site-paths';

interface PhaseExplorerProps {
  phases: PhaseSummary[];
}

const allStatuses = 'all';
const allCategories = 'all';

export default function PhaseExplorer({ phases }: PhaseExplorerProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PhaseStatus | 'all'>(allStatuses);
  const [category, setCategory] = useState<PhaseCategory | 'all'>(allCategories);

  const filteredPhases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return phases.filter((phase) => {
      const matchesStatus = status === allStatuses || phase.data.status === status;
      const matchesCategory = category === allCategories || phase.data.category === category;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        phase.data.title.toLowerCase().includes(normalizedQuery) ||
        phase.data.summary.toLowerCase().includes(normalizedQuery) ||
        phase.slug.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesCategory && matchesQuery;
    });
  }, [category, phases, query, status]);

  return (
    <section className="explorer">
      <div className="explorer__controls">
        <label>
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search phases, summaries, or slugs"
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value as PhaseStatus | 'all')}>
            <option value={allStatuses}>All statuses</option>
            <option value="complete">Complete</option>
            <option value="in-progress">In progress</option>
            <option value="planned">Planned</option>
          </select>
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as PhaseCategory | 'all')}
          >
            <option value={allCategories}>All categories</option>
            <option value="foundations">Foundations</option>
            <option value="userspace">Userspace</option>
            <option value="infrastructure">Infrastructure</option>
            <option value="productivity">Productivity</option>
            <option value="showcase">Showcase</option>
          </select>
        </label>
      </div>

      <div className="explorer__results">
        <p className="eyebrow">Filtered phases</p>
        <strong>{filteredPhases.length}</strong>
        <span>items</span>
      </div>

      <div className="explorer__grid">
        {filteredPhases.map((phase) => (
          <a className="phase-card" href={withBase(`/phases/${phase.slug}/`)} key={phase.slug}>
            <div className="phase-card__header">
              <p className="eyebrow">Phase {phase.data.phase.toString().padStart(2, '0')}</p>
              <span className={`status-badge status-badge--${phase.data.status}`}>
                {phase.data.status.replace('-', ' ')}
              </span>
            </div>
            <h3>{phase.data.title}</h3>
            <p>{phase.data.summary}</p>
            <div className="phase-card__footer">
              <span>{phase.data.category}</span>
              <span>{phase.data.buildsOn.length} prerequisite(s)</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
