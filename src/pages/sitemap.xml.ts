import type { APIRoute } from 'astro';
import { readBlog } from '../services/server/blog';
import { buildSitemapXml } from '../scripts/seo/siteMetadata';

export const prerender = false;

const publicPaths = ['/', '/about', '/work', '/learn', '/api-reference'];

export const GET: APIRoute = async () => {
  const paths = [...publicPaths];
  try {
    const articles = await readBlog();
    if (Array.isArray(articles)) {
      for (const article of articles) {
        if (typeof article?.id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.id)) {
          paths.push(`/work/${article.id}`);
        }
      }
    }
  } catch {
    // Keep the core public sitemap useful while the article service is unavailable.
  }

  return new Response(buildSitemapXml(paths), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
