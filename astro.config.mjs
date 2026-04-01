// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.SITE_URL?.trim() ? process.env.SITE_URL : undefined;
const base = process.env.BASE_PATH?.trim() || '/';

// https://astro.build/config
export default defineConfig({
  base,
  output: 'static',
  integrations: [mdx(), react()],
  site,
  vite: {
    plugins: [tailwindcss()],
  },
});
