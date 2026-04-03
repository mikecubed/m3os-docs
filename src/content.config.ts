import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'zod';

const phaseStatusSchema = z.enum(['complete', 'planned', 'in-progress']);
const phaseCategorySchema = z.enum([
  'foundations',
  'userspace',
  'infrastructure',
  'productivity',
  'showcase',
]);

const keyFileSchema = z.object({
  path: z.string(),
  summary: z.string(),
});

const codeSpotlightSchema = z.object({
  title: z.string(),
  file: z.string(),
  lines: z.string(),
  summary: z.string(),
  githubUrl: z.url().optional(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string(),
        lines: z.string().optional(),
      }),
    )
    .default([]),
  snippet: z.string().optional(),
  snippetLanguage: z.string().optional(),
});

const phaseCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/phases' }),
  schema: z.object({
    phase: z.number().int().positive(),
    title: z.string(),
    status: phaseStatusSchema,
    category: phaseCategorySchema,
    summary: z.string(),
    learningGoal: z.string(),
    buildsOn: z.array(z.string()).default([]),
    extends: z.array(z.string()).default([]),
    replaces: z.array(z.string()).default([]),
    components: z.array(z.string()).default([]),
    learningObjectives: z.array(z.string()).default([]),
    keyFiles: z.array(keyFileSchema).default([]),
    codeSpotlights: z.array(codeSpotlightSchema).default([]),
    realOsDifferences: z.array(z.string()).default([]),
    successCriteria: z.array(z.string()).default([]),
  }),
});

const componentCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/components' }),
  schema: z.object({
    title: z.string(),
    introducedIn: z.string(),
    touchedBy: z.array(z.string()).default([]),
    summary: z.string(),
    responsibilities: z.array(z.string()).default([]),
    keyFiles: z.array(keyFileSchema).default([]),
  }),
});

export const collections = {
  components: componentCollection,
  phases: phaseCollection,
};
