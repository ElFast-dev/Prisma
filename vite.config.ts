import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ViteWorkboxPWAPlugin } from "@vite-pwa/workbox-build/build/vite/plugin";

export default defineConfig({
  base: "/Prisma/",
  plugins: [
    react(),
    ViteWorkboxPWAPlugin({
      strategy: "generate-sw",
      generateSW: {
        baseUrl: "/Prisma/",
        swDest: "sw.js",
        // Static files, the Vite entry points and the manifest are all precached.
        globPatterns: ["**/*.{js,css,html,svg,ico,png,webmanifest}"],
        clientsClaim: true,
        // Keep the update in the waiting state until the person accepts it.
        skipWaiting: false,
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === "https://image.tmdb.org" && url.pathname.startsWith("/t/p/"),
            handler: "CacheFirst",
            options: {
              cacheName: "prisma-tmdb-images",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 90,
                purgeOnQuotaError: true
              }
            }
          }
        ]
      }
    })
  ]
});
