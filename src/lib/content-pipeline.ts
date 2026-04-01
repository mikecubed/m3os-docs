import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_SOURCE_REPO = 'mikecubed/m3os';
export const DEFAULT_SOURCE_REF = 'main';
export const DEFAULT_SOURCE_CANDIDATES = ['../m3os', '../ostest'] as const;

export type SourceDocumentKind = 'phase-doc' | 'reference' | 'roadmap-entry' | 'task-list';

export interface SourceRepositoryOptions {
  cwd?: string;
  sourcePath?: string;
  repoSlug?: string;
  ref?: string;
  env?: NodeJS.ProcessEnv;
  candidateSourcePaths?: readonly string[];
}

export interface ResolvedSourceRepository {
  sourcePath: string;
  docsPath: string;
  repoSlug: string;
  ref: string;
  repoUrl: string;
}

export interface SourceDocumentEntry {
  kind: SourceDocumentKind;
  relativePath: string;
  githubUrl: string;
  displayTitle: string;
  phaseId?: string;
  phaseOrder?: number;
  slug?: string;
}

export interface SourceDiscoveryManifest {
  source: ResolvedSourceRepository;
  documents: SourceDocumentEntry[];
}

export interface PhaseSynthesisSourceDocuments {
  phaseDoc?: SourceDocumentEntry;
  roadmapEntry?: SourceDocumentEntry;
  taskLists: SourceDocumentEntry[];
}

export interface PhaseSynthesisWorkItem {
  phaseId: string;
  phaseOrder: number;
  slug: string;
  title: string;
  outputPath: string;
  previousPhaseSlug?: string;
  nextPhaseSlug?: string;
  sourceDocuments: PhaseSynthesisSourceDocuments;
  briefing: string;
}

export interface PhaseSynthesisWorklist {
  source: ResolvedSourceRepository;
  sharedReferences: SourceDocumentEntry[];
  phases: PhaseSynthesisWorkItem[];
}

export function resolveSourceRepository(
  options: SourceRepositoryOptions = {},
): ResolvedSourceRepository {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const repoSlug = options.repoSlug ?? env.M3OS_SOURCE_REPO?.trim() ?? DEFAULT_SOURCE_REPO;
  const ref = options.ref ?? env.M3OS_SOURCE_REF?.trim() ?? DEFAULT_SOURCE_REF;

  assertValidRepoSlug(repoSlug);

  const requestedSourcePath = options.sourcePath ?? env.M3OS_SOURCE_PATH?.trim();
  const candidateSourcePaths = requestedSourcePath
    ? [requestedSourcePath]
    : [...(options.candidateSourcePaths ?? DEFAULT_SOURCE_CANDIDATES)];
  const sourcePath = candidateSourcePaths
    .map((candidatePath) => path.resolve(cwd, candidatePath))
    .find((candidatePath) => existsSync(candidatePath));

  if (!sourcePath) {
    throw new Error(
      `Could not find the m3OS source repository. Pass --source <path> or set M3OS_SOURCE_PATH. Tried: ${candidateSourcePaths.join(
        ', ',
      )}`,
    );
  }

  const docsPath = path.join(sourcePath, 'docs');

  if (!existsSync(docsPath)) {
    throw new Error(`The source repository at ${sourcePath} is missing a docs directory.`);
  }

  return {
    sourcePath,
    docsPath,
    repoSlug,
    ref,
    repoUrl: `https://github.com/${repoSlug}`,
  };
}

export function discoverSourceDocuments(
  repository: ResolvedSourceRepository,
): SourceDiscoveryManifest {
  const documents = listMarkdownFiles(repository.docsPath)
    .map((absolutePath) => createSourceDocumentEntry(repository, absolutePath))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    source: repository,
    documents,
  };
}

export function buildPhaseSynthesisWorklist(
  manifest: SourceDiscoveryManifest,
): PhaseSynthesisWorklist {
  const implementationDocs = manifest.documents.filter(
    (document) => document.kind === 'phase-doc',
  );
  const groupedPhases = new Map<
    string,
    {
      phaseOrder: number;
      roadmapEntry?: SourceDocumentEntry;
      taskLists: SourceDocumentEntry[];
    }
  >();
  const sharedReferences = manifest.documents.filter((document) => document.kind === 'reference');

  for (const document of manifest.documents) {
    if (
      (document.kind === 'roadmap-entry' || document.kind === 'task-list') &&
      document.phaseId &&
      document.phaseOrder !== undefined
    ) {
      const existingPhase =
        groupedPhases.get(document.phaseId) ??
        {
          phaseOrder: document.phaseOrder,
          taskLists: [],
        };

      if (document.kind === 'roadmap-entry') {
        existingPhase.roadmapEntry = document;
      } else {
        existingPhase.taskLists.push(document);
      }

      groupedPhases.set(document.phaseId, existingPhase);
    }
  }

  const phases = [...groupedPhases.entries()]
    .map(([phaseId, groupedPhase]) =>
      createPhaseSynthesisWorkItem({
        phaseId,
        phaseOrder: groupedPhase.phaseOrder,
        phaseDoc: matchImplementationDocument(groupedPhase, implementationDocs),
        roadmapEntry: groupedPhase.roadmapEntry,
        taskLists: groupedPhase.taskLists.sort((left, right) =>
          left.relativePath.localeCompare(right.relativePath),
        ),
      }),
    )
    .sort((left, right) => left.phaseOrder - right.phaseOrder)
    .map((phase, index, phases_) => ({
      ...phase,
      previousPhaseSlug: phases_[index - 1]?.slug,
      nextPhaseSlug: phases_[index + 1]?.slug,
    }))
    .map((phase) => ({
      ...phase,
      briefing: createPhaseBriefing(phase),
    }));

  return {
    source: manifest.source,
    sharedReferences,
    phases,
  };
}

function matchImplementationDocument(
  phase: {
    phaseOrder: number;
    roadmapEntry?: SourceDocumentEntry;
    taskLists: SourceDocumentEntry[];
  },
  candidates: readonly SourceDocumentEntry[],
): SourceDocumentEntry | undefined {
  const canonicalDocument = phase.roadmapEntry ?? phase.taskLists[0];

  if (!canonicalDocument) {
    return undefined;
  }

  const phaseTokens = collectDocumentTokens(canonicalDocument);
  let bestCandidate: SourceDocumentEntry | undefined;
  let bestScore = 0;

  for (const candidate of candidates) {
    const candidateTokens = collectDocumentTokens(candidate);
    const overlappingTokens = [...phaseTokens].filter((token) => candidateTokens.has(token));
    const overlapScore = overlappingTokens.length * 10;
    const exactSlugScore =
      canonicalDocument.slug && candidate.slug === canonicalDocument.slug ? 100 : 0;
    const titleScore =
      normalizeComparisonValue(candidate.displayTitle) ===
      normalizeComparisonValue(canonicalDocument.displayTitle)
        ? 50
        : 0;
    const distancePenalty = Math.abs((candidate.phaseOrder ?? phase.phaseOrder) - phase.phaseOrder);
    const score = exactSlugScore + titleScore + overlapScore - distancePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestScore >= 8 ? bestCandidate : undefined;
}

function assertValidRepoSlug(repoSlug: string): void {
  if (!/^[^/]+\/[^/]+$/.test(repoSlug)) {
    throw new Error(`Invalid repo slug "${repoSlug}". Expected the format owner/repo.`);
  }
}

function listMarkdownFiles(rootDirectory: string): string[] {
  const directories = [rootDirectory];
  const markdownFiles: string[] = [];

  while (directories.length > 0) {
    const currentDirectory = directories.pop();

    if (!currentDirectory) {
      continue;
    }

    for (const directoryEntry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const absolutePath = path.join(currentDirectory, directoryEntry.name);

      if (directoryEntry.isDirectory()) {
        directories.push(absolutePath);
        continue;
      }

      if (directoryEntry.isFile() && /\.(md|mdx)$/i.test(directoryEntry.name)) {
        markdownFiles.push(absolutePath);
      }
    }
  }

  return markdownFiles;
}

function createSourceDocumentEntry(
  repository: ResolvedSourceRepository,
  absolutePath: string,
): SourceDocumentEntry {
  const relativePath = toPosixPath(path.relative(repository.sourcePath, absolutePath));
  const githubUrl = `${repository.repoUrl}/blob/${repository.ref}/${relativePath}`;
  const fileName = path.posix.basename(relativePath);
  const phaseMetadata = parsePhaseMetadata(fileName);

  if (relativePath.startsWith('docs/roadmap/tasks/')) {
    const normalizedTaskMetadata = phaseMetadata
      ? {
          ...phaseMetadata,
          slug: phaseMetadata.slug.replace(/-tasks$/u, ''),
        }
      : undefined;

    return {
      kind: 'task-list',
      relativePath,
      githubUrl,
      displayTitle: normalizedTaskMetadata ? humanizeSlug(normalizedTaskMetadata.slug) : fileName,
      phaseId: normalizedTaskMetadata?.phaseId,
      phaseOrder: normalizedTaskMetadata?.phaseOrder,
      slug: normalizedTaskMetadata?.slug,
    };
  }

  if (relativePath.startsWith('docs/roadmap/')) {
    return {
      kind: 'roadmap-entry',
      relativePath,
      githubUrl,
      displayTitle: phaseMetadata ? humanizeSlug(phaseMetadata.slug) : fileName,
      phaseId: phaseMetadata?.phaseId,
      phaseOrder: phaseMetadata?.phaseOrder,
      slug: phaseMetadata?.slug,
    };
  }

  if (relativePath.startsWith('docs/') && phaseMetadata) {
    return {
      kind: 'phase-doc',
      relativePath,
      githubUrl,
      displayTitle: humanizeSlug(phaseMetadata.slug),
      phaseId: phaseMetadata.phaseId,
      phaseOrder: phaseMetadata.phaseOrder,
      slug: phaseMetadata.slug,
    };
  }

  return {
    kind: 'reference',
    relativePath,
    githubUrl,
    displayTitle: fileName.replace(/\.(md|mdx)$/i, ''),
  };
}

function collectDocumentTokens(document: Pick<SourceDocumentEntry, 'displayTitle' | 'slug'>): Set<string> {
  const tokens = new Set<string>();

  for (const value of [document.displayTitle, document.slug]) {
    if (!value) {
      continue;
    }

    for (const token of value
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .map(normalizeToken)
      .filter((token) => token.length > 1)) {
      tokens.add(token);
    }
  }

  return tokens;
}

function normalizeComparisonValue(value: string): string {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map(normalizeToken)
    .filter((token) => token.length > 0)
    .join(' ');
}

function normalizeToken(token: string): string {
  switch (token) {
    case 'compatibility':
      return 'compat';
    case 'filesystem':
    case 'filesystems':
      return 'fs';
    case 'terminal':
    case 'terminals':
      return 'tty';
    case 'timekeeping':
      return 'time';
    case 'networking':
      return 'network';
    default:
      return token;
  }
}

function createPhaseSynthesisWorkItem(phase: {
  phaseId: string;
  phaseOrder: number;
  phaseDoc?: SourceDocumentEntry;
  roadmapEntry?: SourceDocumentEntry;
  taskLists: SourceDocumentEntry[];
}): Omit<PhaseSynthesisWorkItem, 'briefing' | 'nextPhaseSlug' | 'previousPhaseSlug'> {
  const canonicalDocument = phase.roadmapEntry ?? phase.phaseDoc ?? phase.taskLists[0];

  if (!canonicalDocument?.slug) {
    throw new Error(`Could not determine a canonical slug for phase ${phase.phaseId}.`);
  }

  return {
    phaseId: phase.phaseId,
    phaseOrder: phase.phaseOrder,
    slug: canonicalDocument.slug,
    title: canonicalDocument.displayTitle,
    outputPath: `src/content/phases/${canonicalDocument.slug}.mdx`,
    sourceDocuments: {
      phaseDoc: phase.phaseDoc,
      roadmapEntry: phase.roadmapEntry,
      taskLists: phase.taskLists,
    },
  };
}

function createPhaseBriefing(phase: {
  phaseId: string;
  title: string;
  outputPath: string;
  previousPhaseSlug?: string;
  nextPhaseSlug?: string;
  sourceDocuments: PhaseSynthesisSourceDocuments;
}): string {
  const taskListLine =
    phase.sourceDocuments.taskLists.length > 0
      ? phase.sourceDocuments.taskLists.map((document) => document.relativePath).join(', ')
      : 'none';

  return [
    `Phase ${phase.phaseId} - ${phase.title}`,
    `Primary phase doc: ${phase.sourceDocuments.phaseDoc?.relativePath ?? 'none'}`,
    `Primary roadmap entry: ${phase.sourceDocuments.roadmapEntry?.relativePath ?? 'none'}`,
    `Task lists: ${taskListLine}`,
    `Previous phase slug: ${phase.previousPhaseSlug ?? 'none'}`,
    `Next phase slug: ${phase.nextPhaseSlug ?? 'none'}`,
    `Target output: ${phase.outputPath}`,
    'Required coverage: design decisions, real OS differences, component walkthroughs, relationship to prior phases, and candidate code spotlights with GitHub links.',
  ].join('\n');
}

function parsePhaseMetadata(
  fileName: string,
): { phaseId: string; phaseOrder: number; slug: string } | undefined {
  const match = fileName.match(/^(\d+[a-z]?)-(.+)\.(md|mdx)$/i);

  if (!match) {
    return undefined;
  }

  const [, phaseId, slug] = match;
  const phaseOrder = Number.parseInt(phaseId, 10);

  return {
    phaseId,
    phaseOrder,
    slug,
  };
}

const TITLE_SEGMENT_OVERRIDES: Record<string, string> = {
  ansi: 'ANSI',
  api: 'API',
  fs: 'FS',
  github: 'GitHub',
  io: 'I/O',
  ipc: 'IPC',
  nodejs: 'Node.js',
  os: 'OS',
  posix: 'POSIX',
  pty: 'PTY',
  smp: 'SMP',
  ssh: 'SSH',
  tty: 'TTY',
  vfs: 'VFS',
};

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((segment) => TITLE_SEGMENT_OVERRIDES[segment] ?? `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join(' ');
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join(path.posix.sep);
}
