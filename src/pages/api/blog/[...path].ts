import type { APIRoute } from 'astro';
import { proxyBlog } from '../../../services/server/blog';
export const ALL: APIRoute = ({ request, params }) => proxyBlog(request, params.path || '');
