import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // El SDK no cambia con cada mejora del panel; conserva su caché aparte.
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes('/node_modules/') && (
            id.includes('/@firebase/firestore/') ||
            id.includes('/@firebase/webchannel-wrapper/') ||
            id.includes('/firebase/firestore/')
          )) return 'firestore';
        },
      },
    },
  },
});
