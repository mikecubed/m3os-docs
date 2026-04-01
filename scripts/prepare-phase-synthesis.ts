import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildPhaseSynthesisWorklist,
  discoverSourceDocuments,
  resolveSourceRepository,
} from '../src/lib/content-pipeline';

interface PreparePhaseSynthesisArguments {
  sourcePath?: string;
  repoSlug?: string;
  ref?: string;
  outputPath?: string;
}

function parseArguments(argv: readonly string[]): PreparePhaseSynthesisArguments {
  const parsedArguments: PreparePhaseSynthesisArguments = {};

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

    if (argument === '--output' && value) {
      parsedArguments.outputPath = value;
      index += 1;
      continue;
    }

    throw new Error(
      `Unknown or incomplete argument "${argument}". Supported flags: --source, --repo, --ref, --output.`,
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
  const output = JSON.stringify(
    {
      source: worklist.source,
      summary: {
        phaseCount: worklist.phases.length,
        sharedReferenceCount: worklist.sharedReferences.length,
      },
      sharedReferences: worklist.sharedReferences,
      phases: worklist.phases,
    },
    null,
    2,
  );

  if (!arguments_.outputPath) {
    console.log(output);
    return;
  }

  const absoluteOutputPath = path.resolve(arguments_.outputPath);
  mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  writeFileSync(absoluteOutputPath, `${output}\n`, 'utf8');
  console.log(`Wrote phase synthesis worklist to ${absoluteOutputPath}`);
}

run();
