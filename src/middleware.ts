import { defineMiddleware } from 'astro:middleware';
import { legacyRedirect } from './scripts/site/legacyRedirect';

export const onRequest = defineMiddleware((context, next) => {
  const headers = context.request.headers;
  const target = legacyRedirect(context.url, headers.get('x-forwarded-host') ?? headers.get('host'));
  if (target) return new Response(null, { status: 301, headers: { Location: target } });
  return next();
});
