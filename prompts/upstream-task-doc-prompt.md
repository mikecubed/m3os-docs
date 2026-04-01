# Prompt: normalize a roadmap task doc

Use this prompt with an editing agent inside the `mikecubed/m3os` repository
when updating a phase task list. This is the highest-value upstream doc type for
better inline snippets in `m3os-docs`.

## Suggested input

- one existing task doc, for example
  `docs/roadmap/tasks/35-true-smp-multitasking-tasks.md`
- the matching phase doc
- optionally the relevant source files if symbol names need verification

## Prompt

```text
Rewrite this phase task document into a standardized task format optimized for
downstream docs generation and code-snippet extraction.

Requirements:
- Keep the real implementation content and track structure.
- Add these metadata lines near the top:
  **Status:** Complete | In Progress | Planned
  **Source Ref:** phase-NN
- Keep the `## Track Layout` table.
- For every task subsection, use this structure exactly:

  ### X.Y — Task title
  **File:** `exact/repo/path.rs`
  **Symbol:** `exact_symbol_name`
  **Why it matters:** one concise sentence
  **Acceptance:**
  - [x] ...

- If a task spans multiple files, use:

  **Files:**
  - `path/to/file1`
  - `path/to/file2`

- Prefer exact files over directories or globs.
- Prefer exact functions, methods, types, constants, or modules that exist in
  the code.
- Add `**Why it matters:**` for each task so the downstream docs can explain the
  code, not just link to it.
- Explicitly mention when the task extends, replaces, or depends on behavior
  from an earlier phase.
- Keep acceptance criteria concrete and verifiable.
- Do not add fake paths, guessed symbols, or speculative tasks.
- Keep deferred work clearly marked as deferred.

Output only the revised markdown.
```

## Notes for the agent

- `**Symbol:**` is extremely important when a downstream tool needs to extract a
  code snippet.
- If the best anchor is a type or constant rather than a function, use that real
  symbol name.
- If no single symbol is appropriate, still keep the file exact and explain the
  reason in `Why it matters`.
