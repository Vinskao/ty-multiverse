import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  base: '/tymultiverse',
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    remarkPlugins: []
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'favicon.ico') {
              return 'favicon.ico';
            }
            // 保持 CSS 檔案的 hash 用於 cache busting
            if (assetInfo.name?.endsWith('.css')) {
              return '_astro/[name].[hash][extname]';
            }
            return assetInfo.name;
          }
        }
      }
    }
  }
});