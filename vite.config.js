import { defineConfig } from 'vite';

// Production builds (and `vite preview` of them) are served from GitHub Pages at /switchboard-designer/.
// The dev server (npm run dev, E2E) keeps serving from the root.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/switchboard-designer/' : '/',
}));
