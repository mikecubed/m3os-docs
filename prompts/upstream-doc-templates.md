# Upstream roadmap doc templates

These are copyable templates for the main doc types in `mikecubed/m3os`.

## Template: phase design doc

```md
# Phase NN - Title

**Status:** Complete | In Progress | Planned
**Source Ref:** phase-NN
**Depends on:** Phase X ✅, Phase Y ✅
**Builds on:** Brief note on what earlier phase is extended, reused, or replaced
**Primary Components:** component-a, component-b, component-c

## Milestone Goal

One short paragraph describing the learner-visible outcome of the phase.

## Why This Phase Exists

Explain the design problem this phase solves and why earlier phases were not
enough.

## Learning Goals

- Concept 1
- Concept 2
- Concept 3

## Feature Scope

### Area A

Explain the behavior change and why it matters.

### Area B

Explain what is added, replaced, or extended from earlier phases.

## Important Components and How They Work

### Component 1

What it does, where it fits, and how control or data flows through it.

### Component 2

What changed from the previous phase and why.

## How This Builds on Earlier Phases

- Extends Phase X by ...
- Replaces the earlier ... from Phase Y with ...
- Reuses ... from Phase Z but changes ...

## Implementation Outline

1. Step
2. Step
3. Step

## Acceptance Criteria

- Measurable outcome
- Measurable outcome

## Companion Task List

- [Phase NN Task List](./tasks/NN-slug-tasks.md)

## How Real OS Implementations Differ

- Difference 1
- Difference 2
- Difference 3

## Deferred Until Later

- Deferred item
- Deferred item
```

## Template: phase task doc

```md
# Phase NN — Title: Task List

**Status:** Complete | In Progress | Planned
**Source Ref:** phase-NN
**Depends on:** Phase X ✅, Phase Y ✅
**Goal:** One short paragraph.

## Track Layout

| Track | Scope | Dependencies | Status |
|---|---|---|---|
| A | ... | ... | ✅ Done |
| B | ... | A | In Progress |

---

## Track A — Track Title

### A.1 — Exact task title

**File:** `path/to/file.rs`
**Symbol:** `exact_symbol_name`
**Why it matters:** One sentence explaining why this code matters.

**Acceptance:**
- [x] Concrete behavior
- [x] Concrete behavior

### A.2 — Another task

**Files:**
- `path/to/file1.rs`
- `path/to/file2.rs`

**Symbol:** `another_symbol`
**Why it matters:** One sentence.

**Acceptance:**
- [x] Concrete behavior

---

## Track B — Another Track

### B.1 — Task title

**File:** `path/to/file.rs`
**Symbol:** `pick_next`
**Why it matters:** Explains how this extends or replaces behavior from an
earlier phase.

**Acceptance:**
- [ ] Concrete behavior

---

## Documentation Notes

- Mention what changed relative to the previous phase.
- Mention any behavior that replaced an older implementation.
- Prefer exact files over directories.
- Prefer exact symbols over generic descriptions.
```

## Template: roadmap README summary row

```md
| Phase | Theme | Primary Outcome | Status | Source Ref | Milestone | Tasks |
|---|---|---|---|---|---|---|
| 34 | Real-Time Clock | CMOS RTC, wall-clock time, CLOCK_REALTIME | Complete | `phase-34` | [Phase 34](./34-real-time-clock.md) | [Tasks](./tasks/34-real-time-clock-tasks.md) |
```
