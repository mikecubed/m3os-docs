import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  discoverSourceDocuments,
  resolveSourceRepository,
  type SourceDocumentKind,
} from '../src/lib/content-pipeline';

interface DiscoverContentArguments {
  sourcePath?: string;
  repoSlug?: string;
  ref?: string;
  outputPath?: string;
}

function parseArguments(argv: readonly string[]): DiscoverContentArguments {
  const parsedArguments: DiscoverContentArguments = {};

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

function summarizeDocuments(
  documents: readonly { kind: SourceDocumentKind }[],
): Record<SourceDocumentKind, number> {
  return documents.reduce<Record<SourceDocumentKind, number>>(
    (counts, document) => {
      counts[document.kind] += 1;
      return counts;
    },
    {
      'phase-doc': 0,
      reference: 0,
      'roadmap-entry': 0,
      'task-list': 0,
    },
  );
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
  const manifest = discoverSourceDocuments(repository);
  const output = JSON.stringify(
    {
      source: {
        repoSlug: manifest.source.repoSlug,
        ref: manifest.source.ref,
        repoUrl: manifest.source.repoUrl,
        sourcePath: manifest.source.sourcePath,
        docsPath: manifest.source.docsPath,
      },
      summary: {
        documentCount: manifest.documents.length,
        byKind: summarizeDocuments(manifest.documents),
      },
      documents: manifest.documents,
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
  console.log(`Wrote discovery manifest to ${absoluteOutputPath}`);
}

run();
