export const blogBase = () => `${(process.env.MAYA_SAWA_INTERNAL_URL || 'http://maya-sawa/maya-sawa').replace(/\/$/, '')}/blog`;

export async function readBlog(path = 'articles') {
  const response = await fetch(`${blogBase()}/${path}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

export async function proxyBlog(request: Request, path: string, fetcher: typeof fetch = fetch): Promise<Response> {
  if (!/^(?:articles(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?|admin\/(?:import|upload|articles(?:\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/(?:publish|unpublish|restore|trigger|revisions\/[a-f0-9]{32}))?)?))$/.test(path)) {
    return Response.json({ detail: 'Not found' }, { status: 404 });
  }
  const headers = new Headers({ Accept: 'application/json' });
  const authorization = request.headers.get('Authorization');
  if ((path.startsWith('admin/') || request.method !== 'GET') && !authorization?.toLowerCase().startsWith('bearer ')) {
    return Response.json({ detail: 'Bearer token required' }, { status: 401 });
  }
  for (const name of ['Authorization', 'If-Match', 'Content-Type']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetcher(`${blogBase()}/${path}`, {
      method: request.method, headers,
      ...(!['GET', 'HEAD'].includes(request.method) ? { body: await request.arrayBuffer() } : {}),
      signal: AbortSignal.timeout(60000), redirect: 'error',
    });
    return new Response(upstream.body, { status: upstream.status, headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store',
    } });
  } catch {
    return Response.json({ detail: 'Article service unavailable' }, { status: 503 });
  }
}
