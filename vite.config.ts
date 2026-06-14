import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Registered manually in main.tsx via `virtual:pwa-register` so no inline
      // <script> is injected — keeps it compatible with the strict CSP.
      injectRegister: false,
      manifest: {
        id: "/",
        name: "Photo Sorter — Sortir Foto & Video Lokal",
        short_name: "Photo Sorter",
        description:
          "Sortir foto dan video lokal ke folder dengan cepat lewat shortcut keyboard. Berjalan sepenuhnya di browser tanpa upload.",
        lang: "id",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        theme_color: "#0a0f1a",
        background_color: "#0a0f1a",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm,svg,png,ico,woff2}"],
        // libraw wasm is ~1.3 MB; raise the precache size limit to cover it.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["mediainfo.js"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
