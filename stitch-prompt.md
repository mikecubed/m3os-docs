# Stitch prompt for m3os-docs

Design a **learning-first interactive documentation app** for **m³OS**, a toy operating system written in Rust. The site will be hosted on **GitHub Pages**, so the design should assume a **static site with rich client-side interactivity**, not a server-rendered or database-backed application.

The website's purpose is to teach how the OS evolves across **phased milestone documents**. It should feel like a polished hybrid of:

- a technical docs site
- an interactive learning app
- a system architecture reference
- a roadmap explorer
- a code-and-component relationship viewer

Do **not** design this like a generic marketing site or startup landing page. This is for developers and learners studying operating system design. It should feel more like a **tool for exploring and understanding a system** than a static blog.

## Primary goals

The site should help a reader:

1. understand the purpose of each phase
2. see the important design decisions for that phase
3. understand how the implementation works at a component level
4. see how that phase builds on, extends, or replaces earlier phases
5. compare the toy OS design with how a real OS would typically solve the same problem
6. inspect important code excerpts from the source repository
7. navigate the full roadmap from early boot to advanced features
8. move fluidly between phases, components, diagrams, and code without getting lost

## Content source and structure

The content comes from phased documents in a sibling project called `ostest`.

Important document types include:

- architecture overview
- subsystem docs like boot, memory, interrupts, tasking, IPC, userspace
- roadmap and per-phase milestone pages
- task lists
- “how real OSes differ” explanations already present in the docs

Representative phases and topics include:

- Phase 1: Boot Foundation
- Phase 2: Memory Basics
- Phase 3: Interrupts
- Phase 4: Tasking
- Phase 5: Userspace Entry
- Phase 6: IPC Core
- Phase 7: Core Servers
- Phase 8: Storage and VFS
- Phase 9: Framebuffer and Shell
- later phases include process model, POSIX compatibility, writable filesystem, shell/tools, hardware discovery, networking, memory reclamation, signal handlers, userspace init, Ion shell, TTY/terminal control, persistent storage, SMP, text editor, user accounts, ext2, PTY, telnet, compiler bootstrap, build tools, kernel memory improvements, and more

The design should scale to roughly **48 phases**, with some complete and some planned.

## Core information architecture

Design the site around these primary areas:

1. **Home / Learning Overview**
2. **Phases Index**
3. **Phase Detail Page**
4. **Architecture / System Overview**
5. **Component Explorer**
6. **Roadmap / Dependency View**
7. **Code Reference / Important Snippets**
8. **Cross-linked Learning Navigation**

## Most important page: Phase Detail

The Phase Detail page is the centerpiece of the whole site. It should feel highly structured and highly teachable.

Each phase page should include clear sections for:

- phase title and number
- one-sentence learning goal
- milestone status such as complete or planned
- prerequisites / dependency chain
- “builds on” / “extends” / “replaces” callouts
- design decisions
- how the implementation works
- important components in that phase
- code spotlight excerpts
- “how real OSes differ”
- acceptance criteria or what success looks like
- links to related earlier and later phases
- interactive links into related components, code files, and dependency paths

I want a strong visual way to explain progression, such as:

- dependency breadcrumbs
- a mini timeline
- “before / after this phase” comparisons
- cards showing reused, extended, or replaced components
- expandable relationship maps between concepts, components, and code

## Desired UX patterns

Please design interfaces for these experiences:

### 1. Phases index

A scannable index of all phases with:

- number
- title
- theme
- status
- short description
- dependency hints
- category grouping such as foundations, userspace, productivity, infrastructure, showcase

The phases index should support a visual roadmap feeling, not just a flat table.

It should ideally feel like an **interactive explorer**, with filtering or alternate views such as:

- by phase number
- by subsystem
- by learning track
- by status
- by component touched

### 2. Phase detail layout

This page should have a high-information-density layout without feeling cluttered.

Include ideas like:

- sticky local table of contents
- summary sidebar
- dependency mini-graph
- section anchors
- callout boxes for design tradeoffs
- diagrams or component relationship panels
- code excerpt cards with filename and line references
- tabs or segmented views for concepts / implementation / code / comparisons
- hover or click interactions that highlight related components and prior phases

### 3. Component explorer

A way to browse key OS components and understand where they appear in the roadmap. Examples:

- bootloader / kernel entry
- frame allocator
- page tables
- scheduler
- syscall gate
- IPC endpoints
- init
- console server
- VFS server
- shell
- filesystem drivers

Each component view should make it easy to answer:

- what it does
- which phase introduces it
- which later phases modify it
- what code files matter most
- which other components it depends on or communicates with

This should feel like a **systems map**, not just an index page.

### 4. Roadmap and dependency visualization

I want a view that helps users understand that phases build on each other. This can be a roadmap graph, timeline, dependency map, or hybrid.

It should clearly show:

- foundational phases
- branching dependencies
- optional phases
- later advanced phases
- complete vs planned work

Please consider interactions like:

- zooming or focusing on a subset of phases
- highlighting prerequisite chains
- selecting a phase and seeing its incoming and outgoing edges
- selecting a component and seeing which phases touch it

### 5. Code references

Important code should be featured throughout the site, but the design must assume **GitHub Pages hosting**.

Please design for a **static-first** approach:

- preferred: code excerpts generated at build time from local source files or pinned GitHub permalinks
- good fallback: summary cards with filename, path, line range, and “view on GitHub” links
- optional enhancement: client-side fetches from GitHub only if nonessential

Avoid requiring a live backend or anything fragile. The UX should still work well if code excerpts are pre-rendered.

The code experience should help users understand:

- why this snippet matters
- where it fits in the architecture
- which phase introduced it
- which later phase changes or supersedes it

## Visual and brand direction

The visual tone should be:

- technical
- thoughtful
- trustworthy
- educational
- calm and readable
- slightly “systems programming” inspired

Possible aesthetic cues:

- dark or dark-friendly theme
- subtle terminal or blueprint influence, but not gimmicky
- diagram-friendly layouts
- strong typography for dense technical reading
- clear hierarchy for prose, diagrams, and code
- good treatment of tables, callouts, and dependency visuals
- application-like panels, inspectors, and exploration views

Avoid:

- flashy startup aesthetics
- oversized hero sections with little substance
- overly playful illustrations
- anything that makes dense technical content harder to scan

## Accessibility and readability

Prioritize:

- excellent readability for long-form technical writing
- responsive behavior for laptop and desktop first, but still usable on mobile
- strong contrast
- keyboard-friendly navigation
- code blocks that are easy to read
- diagrams or relationship panels that remain understandable on smaller screens

## GitHub Pages / implementation constraints

The resulting design should be compatible with a site that can be deployed to **GitHub Pages**.

Assume:

- static generation is preferred
- no required backend
- content is markdown-driven
- diagrams may be rendered from markdown or prebuilt assets
- code excerpts may be generated during build time
- repository links should point to GitHub
- client-side state for filters, tabs, highlighted relationships, and graph exploration is acceptable

Please keep the design practical for implementation in a static docs-oriented stack.

## Interaction model

I want the design to feel like a **usable product**, not only a set of article pages.

Please incorporate ideas like:

- an app-shell style layout where appropriate
- persistent navigation between phases, components, and roadmap views
- deep linking into specific sections, components, or code spotlights
- filterable and highlightable relationship views
- lightweight panel interactions rather than heavy animation
- an experience where a learner can start at a phase, jump to a component, inspect code, then come back to the roadmap without losing context

## Suggested content modules / components

Please include design concepts for reusable components such as:

- PhaseCard
- PhaseStatusBadge
- DependencyTrail
- BuildsOnPanel
- ReplacesExtendsPanel
- DesignDecisionCallout
- RealOsComparisonBox
- ComponentMap
- CodeSpotlight
- RelatedPhasesRail
- RoadmapGraphPanel
- KeyFilesList
- LearningObjectivesPanel
- ComponentRelationshipPanel
- PhaseImpactMap
- CodeContextPanel
- ConceptToCodeLink
- DependencyInspector
- CompareWithRealOsPanel

## Sample content tone

The site should explain topics like:

- why a microkernel keeps only minimal mechanisms in the kernel
- how boot moves from UEFI firmware to kernel entry
- how memory management evolves from boot info to frames, paging, and heap allocation
- how tasking introduces context switching and scheduling
- why IPC becomes the core primitive in a microkernel
- how userspace servers such as init, console, VFS, and shell interact
- how later phases extend earlier designs instead of starting over

## Deliverables I want from Stitch

Please generate:

1. a homepage / overview page
2. a phases index / roadmap page
3. a detailed phase page template
4. an architecture or component explorer page
5. reusable UI components for the educational callouts, dependency relationships, and code spotlights
6. at least one interactive app-style view that demonstrates cross-linking between roadmap, components, and code

If possible, show the design with realistic example content for a few phases such as:

- Phase 1 Boot Foundation
- Phase 2 Memory Basics
- Phase 4 Tasking
- Phase 6 IPC Core
- Phase 20 Userspace Init and Shell

## Final guidance

Optimize for a site that teaches the evolution of the OS over time. The phase-to-phase relationship is as important as the individual documents. Readers should come away understanding both:

- how this specific toy OS is designed
- how real operating systems differ, and why those simplifications were made

The final design should feel like a serious, well-structured systems learning resource that is realistic to implement on GitHub Pages, while also feeling like an **interactive exploration app for understanding how the OS actually works**.
