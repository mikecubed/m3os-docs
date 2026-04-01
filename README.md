# m3OS docs

An **Astro + TypeScript + MDX** documentation app for teaching how m³OS evolves phase by phase.

This repo is intentionally separate from the OS source tree so it can:

- deploy cleanly to **GitHub Pages**
- evolve its docs UX independently
- pull content and code references from a local m3OS clone later

## What is set up

- Astro static site scaffold with **strict TypeScript**
- MDX content collections for **phases** and **components**
- interactive React-based phase explorer
- starter routes for:
  - `/`
  - `/phases/`
  - `/phases/[slug]/`
  - `/components/`
  - `/components/[slug]/`
  - `/roadmap/`
- ESLint, Prettier, Vitest, and Astro type checking
- local Stitch design exports in `design-reference/stitch/`

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run lint` | Run ESLint |
| `npm run check` | Run Astro type/content checks |
| `npm test` | Run Vitest with coverage |
| `npm run build` | Build the static site |
| `npm run content:discover -- --source ../m3os` | Discover upstream phase and roadmap docs from a local m3OS clone |
| `npm run content:prepare -- --source ../m3os` | Build a per-phase synthesis worklist for later parallel content generation |
| `npm run content:generate -- --source ../m3os` | Generate phase MDX drafts from the prepared worklist |
| `npm run content:generate-components` | Generate component MDX docs from the live phase collection |
| `npm run validate` | Run lint + check + test + build |

## Content structure

Phase content lives in:

- `src/content/phases/`

Component content lives in:

- `src/content/components/`

Collection schemas live in:

- `src/content.config.ts`

## Upstream content pipeline

The pipeline is local-first and targets the canonical upstream GitHub repo:

- repo slug: `mikecubed/m3os`
- default branch/ref: `main`

Discovery command examples:

```bash
npm run content:discover -- --source ../m3os
```

If your local clone lives elsewhere, point the script at it directly:

```bash
npm run content:discover -- --source /path/to/m3os
```

You can also override the GitHub repo slug or ref used for generated links:

```bash
npm run content:discover -- --source ../ostest --repo mikecubed/m3os --ref main
```

Environment variables are supported too:

```bash
M3OS_SOURCE_PATH=../m3os M3OS_SOURCE_REPO=mikecubed/m3os npm run content:discover
```

The next pipeline stage builds a deterministic phase worklist that is ready to hand to parallel workers:

```bash
npm run content:prepare -- --source ../m3os
```

Each work item includes:

- the canonical phase slug and output path
- matched phase doc, roadmap entry, and task list inputs
- previous/next phase context
- a deterministic briefing string that a later subagent can consume directly

The generation stage turns that worklist into MDX phase documents:

```bash
npm run content:generate -- --source ../m3os
```

By default it writes drafts into:

```text
src/content/phases-generated/
```

To target the live site collection instead, pass an explicit output directory:

```bash
npm run content:generate -- --source ../m3os --output-dir src/content/phases
```

To regenerate a single phase while iterating:

```bash
npm run content:generate -- --source ../m3os --phase tasking
```

The phase generator currently supports two important quality signals from the upstream repo:

- if `kernel/Cargo.toml` uses a `0.<phase>.x` version, phases below that version are treated as complete and the current version phase is treated as in progress
- task docs with `###` subsections plus `**File:**` references can produce inline source-backed code spotlights when they also mention a concrete symbol or function name

Once live phase docs have been generated, the component stage derives subsystem pages from the
published phase metadata:

```bash
npm run content:generate-components
```

That stage aggregates:

- the earliest phase that introduces each component
- later phases that touch it
- component-specific key files already extracted from the phase corpus

## GitHub Pages

The Astro config is wired for environment-driven Pages settings:

- `SITE_URL` — full site URL, for example `https://your-user.github.io`
- `BASE_PATH` — repo base path, for example `/m3os-docs/`

Examples:

```bash
SITE_URL=https://your-user.github.io BASE_PATH=/m3os-docs/ npm run build
```

If this becomes a user/org Pages site rather than a project Pages site, set:

```bash
SITE_URL=https://your-user.github.io BASE_PATH=/ npm run build
```

## Prompt pack for upstream docs

If you want another agent to normalize the upstream `mikecubed/m3os` roadmap
docs so they generate better learning pages and inline snippets here, use the
prompt pack in:

- `prompts/README.md`

It includes separate prompt files for:

- phase design docs
- phase task docs
- `docs/roadmap/README.md`
- copyable markdown templates for each upstream doc type

## Immediate next steps

1. Transform discovered `mikecubed/m3os` phase and roadmap docs into generated phase/component content.
2. Add build-time helpers for code excerpt generation and pinned GitHub links.
3. Hook the generated content into the existing phase and component routes.
