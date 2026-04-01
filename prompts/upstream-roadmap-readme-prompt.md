# Prompt: normalize `docs/roadmap/README.md`

Use this prompt with an editing agent inside the `mikecubed/m3os` repository
when bringing the roadmap index in line with the real phase/task state.

## Suggested input

- `docs/roadmap/README.md`
- the list of existing phase docs in `docs/roadmap/`
- the list of existing task docs in `docs/roadmap/tasks/`
- current tagged phases, especially phases 1 through 34
- current in-progress phase indicator, such as the kernel version

## Prompt

```text
Update `docs/roadmap/README.md` so it matches the real roadmap state and the
existing phase/task documents.

Requirements:
- Mark phases 1 through 34 as complete.
- Mark the current phase as in progress when supported by the current repository
  state.
- Replace stale `not yet created` task placeholders with real task links where
  task files exist.
- Add a `Status` column and a `Source Ref` column to milestone summary tables if
  they do not already exist.
- Use `phase-NN` source refs for tagged phases unless the repository uses a
  different consistent format.
- Keep phase titles and paths unchanged unless they are actually wrong.
- Keep the file readable as a roadmap overview, not a duplicate of all phase
  docs.
- Preserve the learning-first framing and dependency map.
- Do not invent missing task docs or mark unfinished phases complete.

Output only the revised markdown.
```

## Notes for the agent

- The README should be the easiest place to audit roadmap status at a glance.
- If a summary table groups phases into sections, keep those sections, but make
  the status and task links accurate within each table.
