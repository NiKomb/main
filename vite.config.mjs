import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveBasePath } from './scripts/base-path.mjs';

export default defineConfig({
  plugins: [react()],
  base: resolveBasePath(process.env),
  build: { manifest: true },
});
