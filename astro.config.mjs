// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.SITE_URL;
const base = process.env.BASE_PATH ?? '/';

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
