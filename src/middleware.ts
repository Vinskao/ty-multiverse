import { defineMiddleware } from 'astro:middleware';
import { legacyRedirect } from './scripts/site/legacyRedirect';

export const onRequest = defineMiddleware((context, next) => {
  const target = legacyRedirect(context.url);
  if (target) return new Response(null, { status: 301, headers: { Location: target } });
  return next();
});
