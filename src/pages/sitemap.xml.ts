import type { APIRoute } from 'astro';
import { readBlog } from '../services/server/blog';
import { buildSitemapXml } from '../scripts/seo/siteMetadata';

export const prerender = false;

const publicPaths = ['/', '/about', '/work', '/learn', '/api-reference'];
// Last article list that loaded: a slow or restarting Maya must not drop every article from the sitemap (2026-11-14).
let lastArticlePaths: string[] = [];

export const GET: APIRoute = async () => {
  const paths = [...publicPaths];
  try {
    const articles = await readBlog();
    if (Array.isArray(articles)) {
      lastArticlePaths = articles
        .filter(article => typeof article?.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.id))
        .map(article => `/work/${article.id}`);
    }
  } catch {
    // Article service unavailable: fall back to the last list that loaded.
  }
  paths.push(...lastArticlePaths);

  return new Response(buildSitemapXml(paths), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
