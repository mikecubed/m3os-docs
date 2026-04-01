import path from 'node:path';

import { inferComponentFromPath } from './phase-generation';

export interface PhaseComponentSource {
  components: string[];
  keyFiles: {
    path: string;
    summary: string;
  }[];
  phase: number;
  slug: string;
  summary: string;
  title: string;
}

export interface GeneratedComponentDocument {
  slug: string;
  outputPath: string;
  content: string;
}

export interface GenerateComponentDocumentsOptions {
  outputDirectory: string;
}

interface ComponentMetadata {
  responsibilities: string[];
  summary: string;
  title: string;
}

const COMPONENT_METADATA: Record<string, ComponentMetadata> = {
  'boot-path': {
    responsibilities: [
      'Build and launch the bootable image.',
      'Transfer control into the kernel entry point.',
      'Provide the first reliable diagnostics channel.',
    ],
    summary:
      'The boot path moves the system from firmware and build tooling into a running kernel with visible early diagnostics.',
    title: 'Boot Path',
  },
  'interrupt-router': {
    responsibilities: [
      'Install interrupt and exception handlers.',
      'Route hardware interrupts to the correct kernel entry points.',
      'Preserve enough fault context for debugging and recovery.',
    ],
    summary:
      'The interrupt router connects CPU exceptions and hardware IRQs to the kernel handlers that keep the system responsive.',
    title: 'Interrupt Router',
  },
  ipc: {
    responsibilities: [
      'Move messages between isolated tasks.',
      'Represent communication rights through explicit capabilities.',
      'Wake and block tasks around rendezvous points.',
    ],
    summary:
      'The IPC engine is the microkernel core: it turns isolated tasks into cooperating services through message passing.',
    title: 'IPC Engine',
  },
  'memory-manager': {
    responsibilities: [
      'Allocate and reclaim physical frames.',
      'Manage kernel and userspace mappings.',
      'Provide the memory primitives later subsystems build on.',
    ],
    summary:
      'The memory manager owns frame allocation, virtual mappings, and the policies that let later phases isolate work safely.',
    title: 'Memory Manager',
  },
  'network-stack': {
    responsibilities: [
      'Move packets between device drivers, protocols, and userspace.',
      'Expose transport primitives that later tools and services depend on.',
      'Coordinate socket-facing kernel state.',
    ],
    summary:
      'The network stack grows the OS from a local system into one that can talk to other machines and higher-level services.',
    title: 'Network Stack',
  },
  'process-model': {
    responsibilities: [
      'Represent userspace processes and their lifecycle.',
      'Track address spaces, execution state, and process relationships.',
      'Coordinate process creation, exit, and transition to userspace.',
    ],
    summary:
      'The process model defines what a userspace program is in m3OS and how execution moves into and between processes.',
    title: 'Process Model',
  },
  scheduler: {
    responsibilities: [
      'Track runnable tasks.',
      'Select the next unit of work to execute.',
      'Coordinate task switching and reclamation.',
    ],
    summary:
      'The scheduler decides which runnable work executes next and turns a single control flow into a real operating system.',
    title: 'Scheduler',
  },
  terminal: {
    responsibilities: [
      'Translate input and output streams into interactive terminal behavior.',
      'Coordinate line discipline, TTY state, and shell-facing I/O.',
      'Bridge kernel console primitives to userspace interaction.',
    ],
    summary:
      'The terminal stack turns raw console I/O into an interactive environment people can actually use.',
    title: 'Terminal Stack',
  },
  vfs: {
    responsibilities: [
      'Present a single namespace across storage backends.',
      'Dispatch file operations to the correct filesystem implementation.',
      'Keep path resolution and mount behavior consistent.',
    ],
    summary:
      'The virtual filesystem makes multiple storage backends look like one coherent tree to the rest of the OS.',
    title: 'Virtual File System',
  },
};

export function generateComponentDocuments(
  phases: readonly PhaseComponentSource[],
  options: GenerateComponentDocumentsOptions,
): GeneratedComponentDocument[] {
  const groupedComponents = new Map<
    string,
    {
      introducedIn: string;
      keyFiles: PhaseComponentSource['keyFiles'];
      phaseTitle: string;
      summary: string;
      touchedBy: string[];
    }
  >();

  for (const phase of [...phases].sort((left, right) => left.phase - right.phase)) {
    for (const component of phase.components) {
      const existingComponent = groupedComponents.get(component);
      const componentKeyFiles = phase.keyFiles.filter(
        (keyFile) => inferComponentFromPath(keyFile.path) === component,
      );

      if (!existingComponent) {
        groupedComponents.set(component, {
          introducedIn: phase.slug,
          keyFiles: componentKeyFiles,
          phaseTitle: phase.title,
          summary: phase.summary,
          touchedBy: [],
        });
        continue;
      }

      existingComponent.touchedBy.push(phase.slug);
      for (const keyFile of componentKeyFiles) {
        if (!existingComponent.keyFiles.some((existingKeyFile) => existingKeyFile.path === keyFile.path)) {
          existingComponent.keyFiles.push(keyFile);
        }
      }
    }
  }

  return [...groupedComponents.entries()]
    .sort(([leftSlug], [rightSlug]) => leftSlug.localeCompare(rightSlug))
    .map(([slug, component]) => {
      const metadata = COMPONENT_METADATA[slug] ?? createFallbackMetadata(slug, component.summary);
      const content = [
        '---',
        `title: ${yamlString(metadata.title)}`,
        `introducedIn: ${yamlString(component.introducedIn)}`,
        renderStringArrayField('touchedBy', component.touchedBy),
        `summary: ${yamlString(metadata.summary)}`,
        renderStringArrayField('responsibilities', metadata.responsibilities),
        renderKeyFiles(component.keyFiles),
        '---',
        '',
        `The ${metadata.title.toLowerCase()} is introduced in ${component.phaseTitle} and later touched by ${component.touchedBy.length} phase(s).`,
      ].join('\n');

      return {
        slug,
        outputPath: path.join(options.outputDirectory, `${slug}.mdx`),
        content,
      };
    });
}

function createFallbackMetadata(slug: string, phaseSummary: string): ComponentMetadata {
  const title = slug
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

  return {
    responsibilities: ['Coordinate the subsystem work this component represents.'],
    summary: phaseSummary,
    title,
  };
}

function renderStringArrayField(fieldName: string, values: readonly string[]): string {
  if (values.length === 0) {
    return `${fieldName}: []`;
  }

  return [`${fieldName}:`, ...values.map((value) => `  - ${yamlString(value)}`)].join('\n');
}

function renderKeyFiles(
  keyFiles: readonly {
    path: string;
    summary: string;
  }[],
): string {
  if (keyFiles.length === 0) {
    return 'keyFiles: []';
  }

  return [
    'keyFiles:',
    ...keyFiles.map(
      (keyFile) =>
        `  - path: ${yamlString(keyFile.path)}\n    summary: ${yamlString(keyFile.summary)}`,
    ),
  ].join('\n');
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}
