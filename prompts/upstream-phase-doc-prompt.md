# Prompt: normalize a roadmap phase doc

Use this prompt with an editing agent inside the `mikecubed/m3os` repository
when updating a phase design document.

## Suggested input

- one existing phase doc, for example `docs/roadmap/34-real-time-clock.md`
- the matching task doc, for example
  `docs/roadmap/tasks/34-real-time-clock-tasks.md`
- optionally the previous phase doc when the phase extends or replaces earlier
  behavior

## Prompt

```text
Update this roadmap phase document to match the standardized learning-doc format
used by the downstream docs site.

Requirements:
- Keep all technically correct existing content.
- Add these metadata lines near the top:
  **Status:** Complete | In Progress | Planned
  **Source Ref:** phase-NN
  **Depends on:** ...
  **Builds on:** ...
  **Primary Components:** ...
- Keep the document learner-focused.
- Explicitly explain:
  1. why this phase exists,
  2. what problem it solves,
  3. what it changes from earlier phases,
  4. how each major component in the phase works,
  5. how mature operating systems approach the same problem differently.
- Add a section named `## How This Builds on Earlier Phases`.
- Preserve or improve `## Acceptance Criteria`.
- Preserve or improve `## Deferred Until Later`.
- Keep the companion task list link correct.
- Do not invent features not supported by the task doc or code.
- Do not remove technically useful implementation details just to shorten the doc.

Preferred output structure:
- title
- metadata lines
- `## Milestone Goal`
- `## Why This Phase Exists`
- `## Learning Goals`
- `## Feature Scope`
- `## Important Components and How They Work`
- `## How This Builds on Earlier Phases`
- `## Implementation Outline`
- `## Acceptance Criteria`
- `## Companion Task List`
- `## How Real OS Implementations Differ`
- `## Deferred Until Later`

Output only the revised markdown.
```

## Notes for the agent

- `Builds on` should say whether the phase extends, replaces, or reuses earlier
  behavior.
- `Primary Components` should be short subsystem names, not full sentences.
- If phases 1 through 34 are tagged, use `phase-NN` as the source ref unless
  the repository uses a different consistent tag format.
