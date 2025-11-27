import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // Fix: Cast process to any to avoid type error if @types/node is missing or conflicting
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Polyfill process.env to prevent "ReferenceError: process is not defined" in the browser
      // and inject the API_KEY env var securely.
      'process.env': {
        API_KEY: env.API_KEY || ''
      }
    }
  };
});