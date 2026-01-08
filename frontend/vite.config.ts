import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime - loads on every page
          'vendor-react': ['react', 'react-dom'],
          // Router - loads on every page
          'vendor-router': ['react-router-dom'],
          // HTTP client - used by most pages
          'vendor-axios': ['axios'],
          // Radix UI components - used across UI
          'vendor-radix': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
          ],
          // Icons - many icons bundled
          'vendor-icons': ['lucide-react'],
          // Chat-specific - only needed on /chat
          'vendor-chat': ['socket.io-client'],
          // Utilities
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'dompurify', 'uuid'],
        },
      },
    },
  },
});
