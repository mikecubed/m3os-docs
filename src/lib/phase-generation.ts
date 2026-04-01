import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { PhaseSynthesisWorklist, SourceDocumentEntry } from './content-pipeline';
import type { PhaseCategory, PhaseStatus } from './phase-utils';

export interface GeneratedPhaseDocument {
  slug: string;
  outputPath: string;
  content: string;
}

export interface GeneratePhaseDocumentsOptions {
  outputDirectory: string;
}

interface ParsedMarkdownDocument {
  raw: string;
  title?: string;
  sections: Map<string, string>;
}

interface ParsedTaskDocument extends ParsedMarkdownDocument {
  completedTaskCount: number;
  dependsOn: string[];
  totalTaskCount: number;
}

interface GeneratedKeyFile {
  path: string;
  summary: string;
}

interface GeneratedCodeSpotlight {
  file: string;
  githubUrl: string;
  lines: string;
  summary: string;
  title: string;
}

const GENERIC_KEY_FILE_SUMMARY = 'Referenced in the implementation notes.';

const CATEGORY_OVERRIDES: Record<string, PhaseCategory> = {
  'ansi-escape': 'userspace',
  audio: 'productivity',
  'boot-foundation': 'foundations',
  'build-tools': 'productivity',
  'claude-code': 'productivity',
  'compiler-bootstrap': 'productivity',
  'core-servers': 'infrastructure',
  'cross-compiled-toolchains': 'productivity',
  'crypto-primitives': 'foundations',
  'directory-vfs': 'infrastructure',
  doom: 'showcase',
  'expanded-coreutils': 'productivity',
  'expanded-memory': 'foundations',
  'ext2-filesystem': 'infrastructure',
  'filesystem-enhancements': 'infrastructure',
  'framebuffer-and-shell': 'productivity',
  'hardware-discovery': 'infrastructure',
  'interrupts': 'foundations',
  'io-multiplexing': 'infrastructure',
  'ion-shell': 'productivity',
  'ipc-core': 'foundations',
  'kernel-memory-improvements': 'foundations',
  'memory-basics': 'foundations',
  'memory-reclamation': 'foundations',
  'mouse-input': 'productivity',
  network: 'infrastructure',
  'networking-and-github': 'infrastructure',
  nodejs: 'productivity',
  'persistent-storage': 'infrastructure',
  'ports-system': 'infrastructure',
  'posix-compat': 'userspace',
  'process-model': 'userspace',
  'pty-subsystem': 'userspace',
  'real-time-clock': 'foundations',
  'rust-cross-compilation': 'productivity',
  'secure-boot': 'foundations',
  'shell-and-tools': 'productivity',
  'signal-handlers': 'userspace',
  smp: 'foundations',
  'socket-api': 'infrastructure',
  'ssh-server': 'infrastructure',
  'storage-and-vfs': 'infrastructure',
  'system-services': 'infrastructure',
  tasking: 'foundations',
  'telnet-server': 'infrastructure',
  'text-editor': 'productivity',
  'threading-primitives': 'foundations',
  'true-smp-multitasking': 'foundations',
  'tty-pty': 'userspace',
  'unix-domain-sockets': 'infrastructure',
  'user-accounts': 'userspace',
  'userspace-entry': 'userspace',
  'userspace-init-shell': 'userspace',
  'writable-fs': 'infrastructure',
};

export function generatePhaseDocuments(
  worklist: PhaseSynthesisWorklist,
  options: GeneratePhaseDocumentsOptions,
): GeneratedPhaseDocument[] {
  const phaseTitleLookup = new Map(
    worklist.phases.map((phase) => [phase.slug, phase.title] as const),
  );
  const dependencyLookup = new Map<string, string>();

  for (const phase of worklist.phases) {
    dependencyLookup.set(normalizeLookupKey(phase.slug), phase.slug);
    dependencyLookup.set(normalizeLookupKey(phase.title), phase.slug);
    dependencyLookup.set(normalizeLookupKey(`Phase ${phase.phaseId}`), phase.slug);
    dependencyLookup.set(normalizeLookupKey(`Phase ${phase.phaseId} - ${phase.title}`), phase.slug);
  }

  return worklist.phases.map((phase) => {
    const phaseDocument = readSourceDocument(worklist.source.sourcePath, phase.sourceDocuments.phaseDoc);
    const roadmapDocument = readSourceDocument(
      worklist.source.sourcePath,
      phase.sourceDocuments.roadmapEntry,
    );
    const taskDocuments = phase.sourceDocuments.taskLists.map((taskList) =>
      parseTaskDocument(readSourceText(worklist.source.sourcePath, taskList)),
    );
    const taskSummary = summarizeTasks(taskDocuments);
    const buildsOn = resolveBuildDependencies({
      dependencyLookup,
      fallbackPhaseSlug: phase.previousPhaseSlug,
      taskDocuments,
    });
    const extendsPhases =
      phase.previousPhaseSlug && !buildsOn.includes(phase.previousPhaseSlug)
        ? [phase.previousPhaseSlug]
        : [];
    const summary =
      firstParagraph(roadmapDocument.sections.get('Milestone Goal')) ??
      firstParagraph(phaseDocument.sections.get('Overview')) ??
      `Learn how ${phase.title} fits into m3OS.`;
    const learningObjectives = extractListItems(roadmapDocument.sections.get('Learning Goals'));
    const implementationOutline = extractListItems(
      roadmapDocument.sections.get('Implementation Outline'),
    );
    const acceptanceCriteria = extractListItems(
      roadmapDocument.sections.get('Acceptance Criteria'),
    );
    const documentationDeliverables = extractListItems(
      roadmapDocument.sections.get('Documentation Deliverables'),
    );
    const deferredItems = extractListItems(roadmapDocument.sections.get('Deferred Until Later'));
    const realOsDifferences = extractListItems(
      roadmapDocument.sections.get('How Real OS Implementations Differ'),
    );
    const normalizedRealOsDifferences =
      realOsDifferences.length > 0
        ? realOsDifferences
        : extractParagraphs(roadmapDocument.sections.get('How Real OS Implementations Differ'));
    const learningGoal = learningObjectives[0] ?? `Understand ${phase.title} in m3OS.`;
    const category = inferPhaseCategory(phase.slug, phase.phaseOrder);
    const status = inferPhaseStatus(taskSummary);
    const keyFiles = extractKeyFiles({
      documents: [
        {
          githubUrl: phase.sourceDocuments.roadmapEntry?.githubUrl,
          markdown: roadmapDocument,
        },
        {
          githubUrl: phase.sourceDocuments.phaseDoc?.githubUrl,
          markdown: phaseDocument,
        },
      ],
      repoUrl: worklist.source.repoUrl,
      repoRef: worklist.source.ref,
    });
    const components = inferComponents(
      keyFiles,
      [
        phase.title,
        summary,
        ...learningObjectives,
        ...implementationOutline,
        ...extractParagraphs(phaseDocument.sections.get('Overview')),
      ].join(' '),
    );
    const codeSpotlights = createCodeSpotlights({
      keyFiles,
      repoRef: worklist.source.ref,
      repoUrl: worklist.source.repoUrl,
    });
    const content = [
      renderFrontmatter({
        buildsOn,
        category,
        codeSpotlights,
        components,
        learningGoal,
        learningObjectives,
        keyFiles,
        phaseOrder: phase.phaseOrder,
        realOsDifferences: normalizedRealOsDifferences,
        status,
        successCriteria: acceptanceCriteria,
        summary,
        title: phase.title,
        extendsPhases,
      }),
      renderBody({
        buildsOn,
        deferredItems,
        documentationDeliverables,
        implementationOutline,
        phaseDoc: phase.sourceDocuments.phaseDoc,
        phaseOverview: extractParagraphs(phaseDocument.sections.get('Overview')),
        phaseTitleLookup,
        previousPhaseSlug: phase.previousPhaseSlug,
        roadmapEntry: phase.sourceDocuments.roadmapEntry,
        slug: phase.slug,
        summary,
        taskSummary,
        taskLists: phase.sourceDocuments.taskLists,
        title: phase.title,
      }),
    ].join('\n\n');

    return {
      slug: phase.slug,
      outputPath: path.join(options.outputDirectory, `${phase.slug}.mdx`),
      content,
    };
  });
}

export function writeGeneratedPhaseDocuments(
  documents: readonly GeneratedPhaseDocument[],
): void {
  for (const document of documents) {
    mkdirSync(path.dirname(document.outputPath), { recursive: true });
    writeFileSync(document.outputPath, `${document.content}\n`, 'utf8');
  }
}

function readSourceDocument(
  sourceRoot: string,
  sourceDocument: SourceDocumentEntry | undefined,
): ParsedMarkdownDocument {
  if (!sourceDocument) {
    return {
      raw: '',
      sections: new Map(),
    };
  }

  return parseMarkdownDocument(readSourceText(sourceRoot, sourceDocument));
}

function readSourceText(sourceRoot: string, sourceDocument: SourceDocumentEntry): string {
  return readFileSync(path.join(sourceRoot, sourceDocument.relativePath), 'utf8');
}

function parseMarkdownDocument(markdown: string): ParsedMarkdownDocument {
  const sections = new Map<string, string>();
  const lines = markdown.split(/\r?\n/u);
  let currentSectionTitle: string | undefined;
  let title: string | undefined;
  const sectionLines: string[] = [];

  function commitSection(): void {
    if (currentSectionTitle) {
      sections.set(currentSectionTitle, sectionLines.join('\n').trim());
      sectionLines.length = 0;
    }
  }

  for (const line of lines) {
    if (!title && line.startsWith('# ')) {
      title = line.slice(2).trim();
      continue;
    }

    const sectionMatch = line.match(/^##\s+(.+)$/u);

    if (sectionMatch) {
      commitSection();
      currentSectionTitle = sectionMatch[1]?.trim();
      continue;
    }

    if (currentSectionTitle) {
      sectionLines.push(line);
    }
  }

  commitSection();

  return {
    raw: markdown,
    title,
    sections,
  };
}

function parseTaskDocument(markdown: string): ParsedTaskDocument {
  const parsedDocument = parseMarkdownDocument(markdown);
  const taskMatches = [...markdown.matchAll(/^\s*-\s+\[([ xX])\]\s+(.+)$/gmu)];
  const dependsOnMatch = markdown.match(/\*\*Depends on:\*\*\s*(.+)$/imu);

  return {
    ...parsedDocument,
    completedTaskCount: taskMatches.filter((match) => match[1]?.toLowerCase() === 'x').length,
    dependsOn: splitDependsOn(dependsOnMatch?.[1]),
    totalTaskCount: taskMatches.length,
  };
}

function splitDependsOn(dependsOnValue: string | undefined): string[] {
  if (!dependsOnValue) {
    return [];
  }

  const normalizedValue = dependsOnValue.trim();

  if (normalizedValue.toLowerCase() === 'none') {
    return [];
  }

  return normalizedValue
    .split(/,| and /iu)
    .map((value) => value.replace(/\[|\]|\(|\)|`/gu, '').trim())
    .filter((value) => value.length > 0);
}

function summarizeTasks(taskDocuments: readonly ParsedTaskDocument[]): {
  completedTaskCount: number;
  totalTaskCount: number;
} {
  return taskDocuments.reduce(
    (summary, taskDocument) => ({
      completedTaskCount: summary.completedTaskCount + taskDocument.completedTaskCount,
      totalTaskCount: summary.totalTaskCount + taskDocument.totalTaskCount,
    }),
    {
      completedTaskCount: 0,
      totalTaskCount: 0,
    },
  );
}

function resolveBuildDependencies(input: {
  dependencyLookup: ReadonlyMap<string, string>;
  fallbackPhaseSlug?: string;
  taskDocuments: readonly ParsedTaskDocument[];
}): string[] {
  const dependencies = new Set<string>();

  for (const taskDocument of input.taskDocuments) {
    for (const dependency of taskDocument.dependsOn) {
      const resolvedDependency =
        input.dependencyLookup.get(normalizeLookupKey(dependency)) ??
        input.dependencyLookup.get(normalizeLookupKey(dependency.replace(/^Phase\s+\w+\s*-\s*/iu, '')));

      if (resolvedDependency) {
        dependencies.add(resolvedDependency);
      }
    }
  }

  if (dependencies.size === 0 && input.fallbackPhaseSlug) {
    dependencies.add(input.fallbackPhaseSlug);
  }

  return [...dependencies];
}

function normalizeLookupKey(value: string): string {
  return value.toLowerCase().replace(/\s+/gu, ' ').trim();
}

function inferPhaseStatus(taskSummary: {
  completedTaskCount: number;
  totalTaskCount: number;
}): PhaseStatus {
  if (taskSummary.totalTaskCount === 0) {
    return 'planned';
  }

  if (taskSummary.completedTaskCount === 0) {
    return 'planned';
  }

  if (taskSummary.completedTaskCount < taskSummary.totalTaskCount) {
    return 'in-progress';
  }

  return 'complete';
}

function inferPhaseCategory(slug: string, phaseOrder: number): PhaseCategory {
  const override = CATEGORY_OVERRIDES[slug];

  if (override) {
    return override;
  }

  if (phaseOrder <= 10) {
    return 'foundations';
  }

  if (slug.includes('shell') || slug.includes('tool') || slug.includes('editor')) {
    return 'productivity';
  }

  if (slug.includes('user') || slug.includes('tty') || slug.includes('pty')) {
    return 'userspace';
  }

  return 'infrastructure';
}

function extractListItems(section: string | undefined): string[] {
  if (!section) {
    return [];
  }

  const items: string[] = [];
  let currentItem: string | undefined;

  for (const line of section.split(/\r?\n/u)) {
    const trimmedLine = line.trim();

    if (/^([-*]|\d+\.)\s+/u.test(trimmedLine)) {
      if (currentItem) {
        items.push(normalizeSentence(currentItem));
      }

      currentItem = trimmedLine
        .replace(/^([-*]|\d+\.)\s+/u, '')
        .replace(/^\[[ xX]\]\s+/u, '')
        .trim();
      continue;
    }

    if (currentItem && /^\s{2,}\S/u.test(line)) {
      currentItem = `${currentItem} ${trimmedLine}`;
      continue;
    }

    if (currentItem) {
      items.push(normalizeSentence(currentItem));
      currentItem = undefined;
    }
  }

  if (currentItem) {
    items.push(normalizeSentence(currentItem));
  }

  return items;
}

function extractParagraphs(section: string | undefined): string[] {
  if (!section) {
    return [];
  }

  return section
    .replace(/```[\s\S]*?```/gu, '')
    .split(/\n\s*\n/gu)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/gu, ' ').trim())
    .filter(
      (paragraph) =>
        paragraph.length > 0 &&
        !/^([-*]|\d+\.)\s+/u.test(paragraph) &&
        !paragraph.startsWith('|') &&
        !paragraph.startsWith('---'),
    );
}

function firstParagraph(section: string | undefined): string | undefined {
  return extractParagraphs(section)[0];
}

function renderFrontmatter(input: {
  buildsOn: readonly string[];
  category: PhaseCategory;
  codeSpotlights: readonly GeneratedCodeSpotlight[];
  components: readonly string[];
  extendsPhases: readonly string[];
  learningGoal: string;
  learningObjectives: readonly string[];
  keyFiles: readonly GeneratedKeyFile[];
  phaseOrder: number;
  realOsDifferences: readonly string[];
  status: PhaseStatus;
  successCriteria: readonly string[];
  summary: string;
  title: string;
}): string {
  return [
    '---',
    `phase: ${input.phaseOrder}`,
    `title: ${yamlString(input.title)}`,
    `status: ${input.status}`,
    `category: ${input.category}`,
    `summary: ${yamlString(input.summary)}`,
    `learningGoal: ${yamlString(input.learningGoal)}`,
    renderStringArrayField('buildsOn', input.buildsOn),
    renderStringArrayField('extends', input.extendsPhases),
    'replaces: []',
    renderStringArrayField('components', input.components),
    renderStringArrayField('learningObjectives', input.learningObjectives),
    renderKeyFileField(input.keyFiles),
    renderCodeSpotlightsField(input.codeSpotlights),
    renderStringArrayField('realOsDifferences', input.realOsDifferences),
    renderStringArrayField('successCriteria', input.successCriteria),
    '---',
  ].join('\n');
}

function renderStringArrayField(fieldName: string, values: readonly string[]): string {
  if (values.length === 0) {
    return `${fieldName}: []`;
  }

  return [`${fieldName}:`, ...values.map((value) => `  - ${yamlString(value)}`)].join('\n');
}

function renderKeyFileField(keyFiles: readonly GeneratedKeyFile[]): string {
  if (keyFiles.length === 0) {
    return 'keyFiles: []';
  }

  return [
    'keyFiles:',
    ...keyFiles.flatMap((keyFile) => [
      `  - path: ${yamlString(keyFile.path)}`,
      `    summary: ${yamlString(keyFile.summary)}`,
    ]),
  ].join('\n');
}

function renderCodeSpotlightsField(codeSpotlights: readonly GeneratedCodeSpotlight[]): string {
  if (codeSpotlights.length === 0) {
    return 'codeSpotlights: []';
  }

  return [
    'codeSpotlights:',
    ...codeSpotlights.flatMap((spotlight) => [
      `  - title: ${yamlString(spotlight.title)}`,
      `    file: ${yamlString(spotlight.file)}`,
      `    lines: ${yamlString(spotlight.lines)}`,
      `    summary: ${yamlString(spotlight.summary)}`,
      `    githubUrl: ${yamlString(spotlight.githubUrl)}`,
    ]),
  ].join('\n');
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function renderBody(input: {
  buildsOn: readonly string[];
  deferredItems: readonly string[];
  documentationDeliverables: readonly string[];
  implementationOutline: readonly string[];
  phaseDoc?: SourceDocumentEntry;
  phaseOverview: readonly string[];
  phaseTitleLookup: ReadonlyMap<string, string>;
  previousPhaseSlug?: string;
  roadmapEntry?: SourceDocumentEntry;
  slug: string;
  summary: string;
  taskLists: readonly SourceDocumentEntry[];
  taskSummary: {
    completedTaskCount: number;
    totalTaskCount: number;
  };
  title: string;
}): string {
  const buildContext =
    input.buildsOn.length > 0
      ? `This phase builds on ${input.buildsOn
          .map((slug) => input.phaseTitleLookup.get(slug) ?? slug)
          .join(', ')} and turns that foundation into ${input.title}.`
      : input.previousPhaseSlug
        ? `This phase follows ${input.phaseTitleLookup.get(input.previousPhaseSlug) ?? input.previousPhaseSlug} and establishes the next layer of the system.`
        : 'This phase establishes the first teachable slice of the system and becomes the baseline for everything that follows.';
  const taskSummaryLine =
    input.taskSummary.totalTaskCount > 0
      ? `${input.taskSummary.completedTaskCount} of ${input.taskSummary.totalTaskCount} tracked tasks are complete.`
      : 'No checklist tasks were discovered for this phase yet.';

  return [
    '## Why this phase matters',
    '',
    input.summary,
    '',
    '## How it works in m3OS',
    '',
    ...(input.phaseOverview.length > 0
      ? input.phaseOverview
      : ['The roadmap entry defines the learning scope for this phase; a deeper implementation doc has not been matched yet.']),
    '',
    '## How it builds on earlier phases',
    '',
    buildContext,
    '',
    '## Implementation outline',
    '',
    ...(input.implementationOutline.length > 0
      ? input.implementationOutline.map((item) => `- ${item}`)
      : ['- Implementation steps have not been extracted yet.']),
    '',
    '## Task progress snapshot',
    '',
    taskSummaryLine,
    '',
    '## Documentation targets',
    '',
    ...(input.documentationDeliverables.length > 0
      ? input.documentationDeliverables.map((item) => `- ${item}`)
      : ['- Documentation deliverables have not been listed yet.']),
    '',
    '## Deferred follow-on work',
    '',
    ...(input.deferredItems.length > 0
      ? input.deferredItems.map((item) => `- ${item}`)
      : ['- No deferred items were listed in the roadmap entry.']),
    '',
    '## Source materials',
    '',
    ...(input.roadmapEntry
      ? [`- [Roadmap entry](${input.roadmapEntry.githubUrl})`]
      : ['- Roadmap entry not found.']),
    ...(input.phaseDoc ? [`- [Implementation document](${input.phaseDoc.githubUrl})`] : []),
    ...input.taskLists.map((taskList) => `- [Task list](${taskList.githubUrl})`),
  ].join('\n');
}

function extractKeyFiles(input: {
  documents: readonly {
    githubUrl?: string;
    markdown: ParsedMarkdownDocument;
  }[];
  repoRef: string;
  repoUrl: string;
}): GeneratedKeyFile[] {
  const keyFiles = new Map<string, GeneratedKeyFile>();

  for (const document of input.documents) {
    const explicitKeyFiles = extractKeyFilesFromSection(document.markdown.sections.get('Key Files'));

    for (const keyFile of explicitKeyFiles) {
      keyFiles.set(keyFile.path, keyFile);
    }

    if (explicitKeyFiles.length === 0) {
      for (const keyFile of extractInlineKeyFiles(document.markdown.raw)) {
        if (!keyFiles.has(keyFile.path)) {
          keyFiles.set(keyFile.path, keyFile);
        }
      }
    }
  }

  return [...keyFiles.values()].filter((keyFile) => keyFile.path.length > 0);
}

function extractKeyFilesFromSection(section: string | undefined): GeneratedKeyFile[] {
  if (!section) {
    return [];
  }

  return section
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.includes('`'))
    .map((line) => line.split('|').map((cell) => cell.trim()))
    .flatMap((cells) => {
      const pathCell = cells[1];
      const summaryCell = cells[2];
      const filePathMatch = pathCell?.match(/`([^`]+)`/u);

      if (!filePathMatch?.[1] || !summaryCell || summaryCell.startsWith('---')) {
        return [];
      }

      return [
        {
          path: filePathMatch[1],
          summary: normalizeSentence(summaryCell.replace(/`([^`]+)`/gu, '$1')),
        },
      ];
    });
}

function extractInlineKeyFiles(markdown: string): GeneratedKeyFile[] {
  const matches = [...markdown.matchAll(/`((?:xtask|kernel(?:-core)?|userspace)\/[^`\s]+)`/gmu)];
  const seenPaths = new Set<string>();

  return matches.flatMap((match) => {
    const filePath = match[1];

    if (!filePath || seenPaths.has(filePath)) {
      return [];
    }

    seenPaths.add(filePath);

    return [
      {
        path: filePath,
        summary: describeInlineReference(markdown, match.index ?? 0, filePath),
      },
    ];
  });
}

function inferComponents(
  keyFiles: readonly GeneratedKeyFile[],
  fallbackText?: string,
): string[] {
  const components = new Set<string>();

  for (const keyFile of keyFiles) {
    const component = inferComponentFromPath(keyFile.path);

    if (component) {
      components.add(component);
    }
  }

  if (components.size === 0 && fallbackText) {
    for (const component of inferComponentsFromText(fallbackText)) {
      components.add(component);
    }
  }

  return [...components];
}

export function inferComponentFromPath(filePath: string): string | undefined {
  if (filePath.startsWith('xtask/') || filePath.includes('/serial')) {
    return 'boot-path';
  }

  if (filePath.includes('/task/') || filePath.includes('switch.S') || filePath.includes('scheduler')) {
    return 'scheduler';
  }

  if (filePath.includes('/ipc/')) {
    return 'ipc';
  }

  if (filePath.includes('/mm/') || filePath.includes('buddy.rs') || filePath.includes('slab.rs')) {
    return 'memory-manager';
  }

  if (filePath.includes('/process/') || filePath.includes('/elf')) {
    return 'process-model';
  }

  if (filePath.includes('/fs/')) {
    return 'vfs';
  }

  if (filePath.includes('/tty') || filePath.includes('/stdin') || filePath.includes('/shell/')) {
    return 'terminal';
  }

  if (filePath.includes('/net/')) {
    return 'network-stack';
  }

  if (filePath.includes('/arch/x86_64/interrupts') || filePath.includes('/apic')) {
    return 'interrupt-router';
  }

  return undefined;
}

function createCodeSpotlights(input: {
  keyFiles: readonly GeneratedKeyFile[];
  repoRef: string;
  repoUrl: string;
}): GeneratedCodeSpotlight[] {
  return input.keyFiles.slice(0, 3).map((keyFile) => ({
    file: keyFile.path,
    githubUrl: `${input.repoUrl}/blob/${input.repoRef}/${keyFile.path}`,
    lines: 'See file',
    summary: keyFile.summary,
    title: createSpotlightTitle(keyFile),
  }));
}

function describeInlineReference(markdown: string, matchIndex: number, filePath: string): string {
  const lines = markdown.split(/\r?\n/u);
  const lineIndex = markdown.slice(0, matchIndex).split(/\r?\n/u).length - 1;
  const contextCandidates = [
    lines[lineIndex],
    findNeighboringContextLine(lines, lineIndex, -1),
    findNeighboringContextLine(lines, lineIndex, 1),
  ];

  for (const candidate of contextCandidates) {
    const normalizedCandidate = normalizeContextCandidate(candidate, filePath);

    if (normalizedCandidate) {
      return normalizedCandidate;
    }
  }

  return GENERIC_KEY_FILE_SUMMARY;
}

function findNeighboringContextLine(
  lines: readonly string[],
  startIndex: number,
  direction: -1 | 1,
): string | undefined {
  for (
    let index = startIndex + direction;
    index >= 0 && index < lines.length;
    index += direction
  ) {
    const candidate = lines[index]?.trim();

    if (!candidate) {
      continue;
    }

    return lines[index];
  }

  return undefined;
}

function normalizeContextCandidate(candidate: string | undefined, filePath: string): string | undefined {
  if (!candidate) {
    return undefined;
  }

  const trimmedCandidate = candidate.trim();

  if (trimmedCandidate.startsWith('|')) {
    const cells = trimmedCandidate.split('|').map((cell) => cell.trim()).filter(Boolean);
    const fileCell = cells[0];
    const summaryCell = cells[1];

    if (fileCell?.includes(filePath) && summaryCell && !summaryCell.startsWith('---')) {
      return normalizeSentence(summaryCell.replace(/`([^`]+)`/gu, '$1'));
    }
  }

  const normalizedCandidate = normalizeSentence(
    trimmedCandidate
      .replace(/^[-*]\s+/u, '')
      .replace(/^\d+\.\s+/u, '')
      .replace(/^>+\s*/u, '')
      .replace(/\*\*/gu, '')
      .replace(/`/gu, '')
      .replace(/^[A-Za-z ]+:\s*/u, ''),
  );

  if (
    normalizedCandidate.length < 20 ||
    normalizedCandidate === filePath ||
    /^#{1,6}\s/u.test(trimmedCandidate) ||
    /^(File|Files):/iu.test(trimmedCandidate) ||
    normalizedCandidate.startsWith('---')
  ) {
    return undefined;
  }

  return normalizedCandidate;
}

function inferComponentsFromText(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const inferredComponents: string[] = [];

  const keywordMap: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['boot-path', ['boot', 'uefi', 'serial', 'xtask']],
    ['interrupt-router', ['interrupt', 'irq', 'apic', 'idt']],
    ['ipc', ['ipc', 'message passing', 'capability', 'endpoint']],
    ['memory-manager', ['memory', 'allocator', 'paging', 'frame', 'heap', 'slab', 'buddy']],
    ['network-stack', ['network', 'socket', 'tcp', 'udp', 'telnet', 'ssh']],
    ['process-model', ['process', 'userspace', 'elf', 'fork', 'exec', 'signal']],
    ['scheduler', ['scheduler', 'task', 'context switch', 'preempt', 'thread']],
    ['terminal', ['terminal', 'tty', 'pty', 'shell', 'ansi']],
    ['vfs', ['filesystem', 'vfs', 'directory', 'mount', 'storage']],
  ];

  const scoredComponents = keywordMap
    .map(([component, keywords]) => [
      component,
      keywords.filter((keyword) => normalizedText.includes(keyword)).length,
    ] as const)
    .filter(([, score]) => score > 0);

  const highestScore = scoredComponents.reduce(
    (currentHighestScore, [, score]) => Math.max(currentHighestScore, score),
    0,
  );

  for (const [component, score] of scoredComponents) {
    if (score === highestScore || score >= 2) {
      inferredComponents.push(component);
    }
  }

  return inferredComponents;
}

function createSpotlightTitle(keyFile: GeneratedKeyFile): string {
  const summaryWithoutPeriod = keyFile.summary.replace(/\.$/u, '');

  if (summaryWithoutPeriod === GENERIC_KEY_FILE_SUMMARY.replace(/\.$/u, '')) {
    return humanizeFileReference(keyFile.path);
  }

  const leadingPhraseMatch = summaryWithoutPeriod.match(
    /^(?:The\s+)?(.+?)\s+(?:lives in|live in|is in|are in|sits in|sit in|handles|handle|implements|implement|provides|provide|contains|contain|defines|define)\b/iu,
  );

  if (leadingPhraseMatch?.[1]) {
    return capitalizeFragment(leadingPhraseMatch[1]);
  }

  if (summaryWithoutPeriod.length <= 72) {
    return summaryWithoutPeriod;
  }

  return humanizeFileReference(keyFile.path);
}

function humanizeFileReference(filePath: string): string {
  const segments = filePath.split('/').filter((segment) => segment.length > 0);
  const fileName = segments.at(-1) ?? filePath;
  const stem = fileName.replace(/\.[^.]+$/u, '');

  if (stem === 'main') {
    const contextSegment = [...segments]
      .reverse()
      .find((segment) => segment !== 'main.rs' && segment !== 'src');

    return `${capitalizeFragment((contextSegment ?? 'Kernel').replace(/[-_]/gu, ' '))} entry`;
  }

  if (stem === 'mod') {
    return capitalizeFragment(segments.at(-2) ?? 'Module');
  }

  if (stem.length === 0) {
    return capitalizeFragment((segments.at(-1) ?? 'Source').replace(/[-_]/gu, ' '));
  }

  return capitalizeFragment(stem.replace(/[-_]/gu, ' '));
}

function capitalizeFragment(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeSentence(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}
