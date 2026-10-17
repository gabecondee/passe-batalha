import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const storageOrigin = env.VITE_SUPABASE_URL
    ? new URL(env.VITE_SUPABASE_URL).origin
    : null;
  const escapedOrigin = storageOrigin?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return ({
  // Keep small WebP icons out of the initial JavaScript so lazy loading works.
  build: { assetsInlineLimit: 0 },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // Artwork is cached when viewed, rather than all downloaded at installation.
        globIgnores: ['**/*.webp'],
        runtimeCaching: [{
          urlPattern: ({ request, url, sameOrigin }) => sameOrigin &&
            request.destination === 'image' &&
            /\.(?:webp|png|jpe?g|svg)$/i.test(url.pathname) &&
            (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/images/optimized/')),
          handler: 'CacheFirst',
          options: {
            cacheName: 'local-artwork-v1',
            cacheableResponse: { statuses: [200] },
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60,
              purgeOnQuotaError: true,
            },
          },
        }, ...(escapedOrigin ? [{
          // Only public portraits from this project; API/auth responses are excluded.
          urlPattern: new RegExp(`^${escapedOrigin}/storage/v1/object/public/(?:avatars|boss-portraits)/`),
          handler: 'CacheFirst' as const,
          options: {
            cacheName: 'supabase-public-portraits-v1',
            cacheableResponse: { statuses: [0, 200] },
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 7 * 24 * 60 * 60,
              purgeOnQuotaError: true,
            },
          },
        }] : [])],
      },
      manifest: {
        name: 'Passe de Batalha',
        short_name: 'Passe de Batalha',
        description: 'Gamifique sua vida e evolua em 5 áreas.',
        theme_color: '#0f172a', // Cor de fundo principal
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  });
});
