import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { createAvatarImageResponse, resolveAvatarImageBaseUrl } from '../../../services/server/avatarImage';

const IMAGE_BASE_URL = resolveAvatarImageBaseUrl({
  privateUrl: process.env.PEOPLE_IMAGE_INTERNAL_URL,
  publicUrl: process.env.PUBLIC_PEOPLE_IMAGE_URL || import.meta.env.PUBLIC_PEOPLE_IMAGE_URL,
  inCluster: !!process.env.KUBERNETES_SERVICE_HOST,
});
const AUTH_URL_BASE = process.env.TYMG_INTERNAL_URL || process.env.PUBLIC_TYMG_URL ||
  import.meta.env.PUBLIC_TYMG_URL || process.env.PUBLIC_API_BASE_URL || import.meta.env.PUBLIC_API_BASE_URL || '';
const AUTH_URL = AUTH_URL_BASE ? `${AUTH_URL_BASE.replace(/\/+$/, '')}/auth/user` : undefined;

export const GET: APIRoute = async ({ request, url }) => {
  const name = url.searchParams.get('name') ?? '';
  return createAvatarImageResponse(name, request.headers.get('authorization'), {
    imageBaseUrl: IMAGE_BASE_URL,
    authUrl: AUTH_URL,
    blur: async (source) => new Uint8Array(await sharp(source).resize(320, 320, { fit: 'inside', withoutEnlargement: true }).blur(18).webp({ quality: 58 }).toBuffer()),
  });
};
