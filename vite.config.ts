import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/Prisma/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "icons/prisma.svg",
        "icons/prisma-192.png",
        "icons/prisma-512.png",
        "icons/prisma-maskable-512.png"
      ],
      manifest: {
        id: "/Prisma/",
        name: "Prisma",
        short_name: "Prisma",
        description: "Tu espacio cinematográfico personal.",
        lang: "es",
        start_url: "/Prisma/#/discover",
        scope: "/Prisma/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0E1117",
        theme_color: "#0E1117",
        icons: [
          { src: "icons/prisma-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/prisma-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/prisma-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "icons/prisma.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,ico,png,webp,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://image.tmdb.org" && url.pathname.startsWith("/t/p/"),
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
