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
  // Enable view transitions for SPA-like navigation
  // @ts-ignore
  viewTransitions: true, // Note: viewTransitions is deprecated in newer Astro versions in favor of <ViewTransitions /> component or other config, but if it works in current version, keep it. The property might not be in the type definition if updated.
  markdown: {
    remarkPlugins: []
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    server: {
      proxy: {
        // 原有的本地後端代理
        '/maya-sawa': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        // 新增：代理遠端 API
        '/maya-v2': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false, // 如果是自簽證書可設為 false
          rewrite: (path) => path, // 保持路徑不變
          // 不設置 credentials，讓前端控制
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // 移除可能存在的 cookie 標頭，因為我們使用 token 認證
              proxyReq.removeHeader('cookie');
              proxyReq.removeHeader('Cookie');
              console.log('Proxying to:', req.url);
            });
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err);
            });
          },
        }
      }
    },
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
            return assetInfo.name || '';
          }
        }
      }
    }
  }
});
