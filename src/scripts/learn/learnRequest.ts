import { publicLearnHeaders } from './guestIdentity';

/** Choose the isolated anonymous API namespace while leaving account and mentor APIs private. */
export function learningRequest(path: string, token: string | null, guestId: string) {
  const privatePath = path === '/learn/profile' || path.startsWith('/learn/mentor/');
  const anonymous = !token && path.startsWith('/learn/') && !privatePath;
  return anonymous
    ? { path: path.replace('/learn/', '/learn/public/'), headers: publicLearnHeaders(guestId) }
    : { path, headers: {} as Record<string, string> };
}
