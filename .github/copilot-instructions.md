# Copilot instructions for `m3os-docs`

## Build, test, and lint commands

- Install deps: `npm ci`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Astro/content/type checks: `npm run check`
- Format check: `npm run format`
- Full test suite: `npm test`
- Run one test file: `npm test -- src/lib/__tests__/phase-utils.test.ts`
- Build static site: `npm run build`
- Full validation pass: `npm run validate`

Content pipeline commands:

- Discover upstream docs from a local m3OS clone: `npm run content:discover -- --source ../m3os`
- Build the per-phase synthesis worklist: `npm run content:prepare -- --source ../m3os`

## High-level architecture

This repo is a static Astro docs site with a small React island and a build-time content pipeline.

- `src/content.config.ts` defines two Astro content collections: `phases` and `components`. The MDX frontmatter schema is important here; pages assume those structured fields already exist.
- `src/pages/phases/[slug].astro` and `src/pages/components/[slug].astro` generate static routes from the content collections with `getCollection()` and render the MDX body with `render()`.
- `src/pages/phases/index.astro` passes normalized phase data into `src/components/PhaseExplorer.tsx`, which is the main interactive island. Most of the site is static Astro; only the phase explorer is client-loaded React.
- `src/lib/phase-utils.ts` is the shared model layer for ordering phases, grouping them by category, and deriving prerequisite/unlock relationships from `buildsOn` slugs. The roadmap page and phase detail page both depend on that logic.
- `src/lib/content-pipeline.ts` plus `scripts/discover-content.ts` and `scripts/prepare-phase-synthesis.ts` are the upstream ingestion pipeline. They scan a local `m3os` docs tree, classify markdown files (`phase-doc`, `roadmap-entry`, `task-list`, `reference`), then build deterministic per-phase work items that target `src/content/phases/<slug>.mdx`.
- GitHub Pages deployment is environment-driven. `astro.config.mjs` reads `SITE_URL` and `BASE_PATH`, and `.github/workflows/deploy.yml` builds the site with those values set in CI.

## Key conventions

- Use `withBase()` from `src/lib/site-paths.ts` for internal links and assets. Do not hardcode root-relative links; the site is meant to work under a GitHub Pages repo base path.
- Keep new phase and component content aligned with the schemas in `src/content.config.ts`. In practice, phase pages are structured teaching documents with frontmatter for relationships (`buildsOn`, `extends`, `replaces`), key files, code spotlights, real OS differences, and success criteria.
- Treat phase relationships as slug-based graph data. `buildsOn` references other phase slugs, and the UI derives both prerequisites and “unlocks” views from that rather than storing both directions.
- The content pipeline relies on upstream filename conventions like `<phase-id>-<slug>.md` and special paths under `docs/roadmap/` and `docs/roadmap/tasks/`. If you change ingestion behavior, update `src/lib/content-pipeline.ts` and its tests together.
- Prefer type-only imports in `*.ts`/`*.tsx` files. ESLint enforces `@typescript-eslint/consistent-type-imports`.
- Tests live next to shared library code under `src/lib/__tests__/` and focus on deterministic pure logic: phase graph helpers and upstream content classification/worklist generation.
- `src/content/phases/*.mdx` and `src/content/components/*.mdx` are hand-authored content outputs; the scripts do not write them directly yet. The current pipeline prepares discovery/worklist JSON for later synthesis rather than mutating site content.
