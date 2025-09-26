import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Detect environment
const isProd = process.env.NODE_ENV === "production";
const isReplitDev = process.env.REPL_ID !== undefined && !isProd;

export default defineConfig({
  plugins: [
    react(),
    // Solo en desarrollo en Replit
    ...(isReplitDev
      ? [
          // Plugins de Replit cargados dinámicamente
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default()
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer()
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner()
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve("./client/src"),
      "@shared": path.resolve("./shared"),
      "@assets": path.resolve("./attached_assets"),
    },
  },
  root: path.resolve("./client"),
  build: {
    outDir: path.resolve("./dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
