import path from 'node:path';

import {
  buildPhaseSynthesisWorklist,
  discoverSourceDocuments,
  resolveSourceRepository,
} from '../src/lib/content-pipeline';
import { generatePhaseDocuments, writeGeneratedPhaseDocuments } from '../src/lib/phase-generation';

interface GeneratePhaseDocsArguments {
  outputDirectory?: string;
  phaseFilter?: string;
  ref?: string;
  repoSlug?: string;
  sourcePath?: string;
}

function parseArguments(argv: readonly string[]): GeneratePhaseDocsArguments {
  const parsedArguments: GeneratePhaseDocsArguments = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (argument === '--source' && value) {
      parsedArguments.sourcePath = value;
      index += 1;
      continue;
    }

    if (argument === '--repo' && value) {
      parsedArguments.repoSlug = value;
      index += 1;
      continue;
    }

    if (argument === '--ref' && value) {
      parsedArguments.ref = value;
      index += 1;
      continue;
    }

    if (argument === '--output-dir' && value) {
      parsedArguments.outputDirectory = value;
      index += 1;
      continue;
    }

    if (argument === '--phase' && value) {
      parsedArguments.phaseFilter = value;
      index += 1;
      continue;
    }

    throw new Error(
      `Unknown or incomplete argument "${argument}". Supported flags: --source, --repo, --ref, --output-dir, --phase.`,
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

function run(): void {
  registerStdoutExitHandling();

  const arguments_ = parseArguments(process.argv.slice(2));
  const repository = resolveSourceRepository({
    sourcePath: arguments_.sourcePath,
    repoSlug: arguments_.repoSlug,
    ref: arguments_.ref,
  });
  const discoveryManifest = discoverSourceDocuments(repository);
  const worklist = buildPhaseSynthesisWorklist(discoveryManifest);
  const filteredWorklist = arguments_.phaseFilter
    ? {
        ...worklist,
        phases: worklist.phases.filter(
          (phase) =>
            phase.slug === arguments_.phaseFilter ||
            phase.phaseId === arguments_.phaseFilter ||
            phase.title === arguments_.phaseFilter,
        ),
      }
    : worklist;
  const outputDirectory = path.resolve(arguments_.outputDirectory ?? 'src/content/phases-generated');
  const generatedDocuments = generatePhaseDocuments(filteredWorklist, {
    outputDirectory,
  });

  writeGeneratedPhaseDocuments(generatedDocuments);

  console.log(
    JSON.stringify(
      {
        outputDirectory,
        generatedCount: generatedDocuments.length,
        generatedSlugs: generatedDocuments.map((document) => document.slug),
      },
      null,
      2,
    ),
  );
}

run();
