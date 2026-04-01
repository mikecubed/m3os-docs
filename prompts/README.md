# Upstream m3OS doc prompts

This folder contains reusable prompt and template files for normalizing the
roadmap docs in `mikecubed/m3os` so they work better with the `m3os-docs`
content pipeline.

## Files

- `upstream-phase-doc-prompt.md` - prompt for phase design docs such as
  `docs/roadmap/34-real-time-clock.md`
- `upstream-task-doc-prompt.md` - prompt for task docs such as
  `docs/roadmap/tasks/34-real-time-clock-tasks.md`
- `upstream-roadmap-readme-prompt.md` - prompt for `docs/roadmap/README.md`
- `upstream-doc-templates.md` - copyable markdown templates for the main
  upstream doc types

## Recommended order

1. Update `docs/roadmap/README.md` so phase status, task links, and source refs
   are accurate.
2. Normalize phase design docs so they explain what changed, why the phase
   exists, and how it builds on earlier phases.
3. Normalize task docs so each task uses exact files and symbols for downstream
   snippet extraction.

## Conventions to keep

- Add `**Status:** Complete | In Progress | Planned`
- Add `**Source Ref:** phase-NN` for tagged phases
- Prefer exact `**File:**` and `**Symbol:**` references over directories or
  generic descriptions
- Explicitly describe what a phase extends, replaces, or reuses from earlier
  phases
