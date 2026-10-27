export function retiredArticleSync() {
  return Response.json({ detail: 'Frontend article synchronization is retired. Import Markdown directly through the blog management API.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
