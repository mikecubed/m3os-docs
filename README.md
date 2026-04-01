# m3OS docs

An **Astro + TypeScript + MDX** documentation app for teaching how m³OS evolves phase by phase.

This repo is intentionally separate from the OS source tree so it can:

- deploy cleanly to **GitHub Pages**
- evolve its docs UX independently
- pull content and code references from `../ostest` at build time later

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
| `npm run validate` | Run lint + check + test + build |

## Content structure

Phase content lives in:

- `src/content/phases/`

Component content lives in:

- `src/content/components/`

Collection schemas live in:

- `src/content.config.ts`

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

## Immediate next steps

1. Import real `../ostest/docs` phase content into `src/content/phases/`.
2. Add build-time helpers for code excerpt generation and pinned GitHub links.
3. Create the GitHub repo, push `main`, and enable the Pages workflow.
