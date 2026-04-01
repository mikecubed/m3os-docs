import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  generateComponentDocuments,
  type PhaseComponentSource,
} from '../src/lib/component-generation';

interface GenerateComponentsArguments {
  outputDirectory?: string;
  phasesDirectory?: string;
}

function parseArguments(argv: readonly string[]): GenerateComponentsArguments {
  const parsedArguments: GenerateComponentsArguments = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (argument === '--output-dir' && value) {
      parsedArguments.outputDirectory = value;
      index += 1;
      continue;
    }

    if (argument === '--phases-dir' && value) {
      parsedArguments.phasesDirectory = value;
      index += 1;
      continue;
    }

    throw new Error(
      `Unknown or incomplete argument "${argument}". Supported flags: --output-dir, --phases-dir.`,
    );
  }

  return parsedArguments;
}

function registerStdoutExitHandling(): void {
  process.stdout.on('error', (error) => {
    if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
      process.exit(0);
    }

    throw error;
  });
}

function readPhaseSource(filePath: string): PhaseComponentSource {
  const fileContent = readFileSync(filePath, 'utf8');
  const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---/u);

  if (!frontmatterMatch?.[1]) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }

  const frontmatter = frontmatterMatch[1];

  return {
    components: readStringArrayField(frontmatter, 'components'),
    keyFiles: readKeyFiles(frontmatter),
    phase: readNumberField(frontmatter, 'phase'),
    slug: path.basename(filePath, path.extname(filePath)),
    summary: readStringField(frontmatter, 'summary'),
    title: readStringField(frontmatter, 'title'),
  };
}

function readNumberField(frontmatter: string, fieldName: string): number {
  const match = frontmatter.match(new RegExp(`^${fieldName}:\\s+(\\d+)$`, 'mu'));

  if (!match?.[1]) {
    throw new Error(`Missing ${fieldName} in generated phase frontmatter.`);
  }

  return Number.parseInt(match[1], 10);
}

function readStringField(frontmatter: string, fieldName: string): string {
  const match = frontmatter.match(new RegExp(`^${fieldName}:\\s+(".*")$`, 'mu'));

  if (!match?.[1]) {
    throw new Error(`Missing ${fieldName} in generated phase frontmatter.`);
  }

  return JSON.parse(match[1]);
}

function readStringArrayField(frontmatter: string, fieldName: string): string[] {
  const inlineMatch = frontmatter.match(new RegExp(`^${fieldName}:\\s+\\[\\]$`, 'mu'));

  if (inlineMatch) {
    return [];
  }

  const sectionMatch = frontmatter.match(
    new RegExp(`^${fieldName}:\\n((?:  - ".*"\\n?)*)`, 'mu'),
  );

  if (!sectionMatch?.[1]) {
    return [];
  }

  return sectionMatch[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /u, ''))
    .map((value) => JSON.parse(value));
}

function readKeyFiles(frontmatter: string): PhaseComponentSource['keyFiles'] {
  const inlineMatch = frontmatter.match(/^keyFiles:\s+\[\]$/mu);

  if (inlineMatch) {
    return [];
  }

  const sectionMatch = frontmatter.match(
    /^keyFiles:\n((?: {2}- path: ".*"\n {4}summary: ".*"\n?)*)/mu,
  );

  if (!sectionMatch?.[1]) {
    return [];
  }

  return [...sectionMatch[1].matchAll(/ {2}- path: "(.+)"\n {4}summary: "(.+)"/gmu)].map(
    (match) => ({
      path: JSON.parse(`"${match[1] ?? ''}"`),
      summary: JSON.parse(`"${match[2] ?? ''}"`),
    }),
  );
}

function writeGeneratedDocuments(
  documents: ReturnType<typeof generateComponentDocuments>,
): void {
  for (const document of documents) {
    mkdirSync(path.dirname(document.outputPath), { recursive: true });
    writeFileSync(document.outputPath, `${document.content}\n`, 'utf8');
  }
}

function run(): void {
  registerStdoutExitHandling();

  const arguments_ = parseArguments(process.argv.slice(2));
  const phasesDirectory = path.resolve(arguments_.phasesDirectory ?? 'src/content/phases');
  const outputDirectory = path.resolve(arguments_.outputDirectory ?? 'src/content/components');
  const phaseEntries = readdirSync(phasesDirectory)
    .filter((fileName) => fileName.endsWith('.mdx'))
    .sort()
    .map((fileName) => readPhaseSource(path.join(phasesDirectory, fileName)));
  const generatedDocuments = generateComponentDocuments(phaseEntries, {
    outputDirectory,
  });

  writeGeneratedDocuments(generatedDocuments);

  console.log(
    JSON.stringify(
      {
        generatedCount: generatedDocuments.length,
        generatedSlugs: generatedDocuments.map((document) => document.slug),
        outputDirectory,
      },
      null,
      2,
    ),
  );
}

run();
