import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Avoid watching generated and dependency folders. This helps prevent
      // Windows EBUSY/EPERM watcher errors when these folders are locked.
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/supabase/.temp/**',
      ],
    },
  },
});
