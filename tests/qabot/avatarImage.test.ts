import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAvatarImageResponse, resolveAvatarImageBaseUrl } from '../../src/services/server/avatarImage';

it('keeps the QABot browser away from the public image origin', () => {
  const component = readFileSync(resolve(process.cwd(), 'src/components/QABot.astro'), 'utf8');
  expect(component).toContain("'/api/people/avatar'");
  expect(component).not.toContain('PUBLIC_PEOPLE_IMAGE_URL');
  expect(component).not.toContain('thumbnailService');
});

describe('QABot avatar image access', () => {
  it('uses the in-cluster image service for server-side retrieval when running in Kubernetes', () => {
    expect(resolveAvatarImageBaseUrl({ inCluster: true, publicUrl: 'https://public.example/images/people' }))
      .toBe('http://image-server-service/images/people');
    expect(resolveAvatarImageBaseUrl({ inCluster: false, publicUrl: 'https://public.example/images/people' }))
      .toBe('https://public.example/images/people');
    expect(resolveAvatarImageBaseUrl({ inCluster: true, privateUrl: 'http://private-images/custom', publicUrl: 'https://public.example' }))
      .toBe('http://private-images/custom');
  });

  it('returns a blurred rendition when no bearer token is provided', async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } }));
    const blur = vi.fn(async () => new Uint8Array([9, 8, 7]));
    const response = await createAvatarImageResponse('Maya', null, {
      imageBaseUrl: 'http://image-server-service/images/people', authUrl: 'http://backend/auth/user', fetcher, blur,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([9, 8, 7]);
    expect(blur).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('recognizes a PNG when the image server incorrectly labels it as text/plain', async () => {
    const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const fetcher = vi.fn(async () => new Response(pngSignature, { headers: { 'Content-Type': 'text/plain' } }));
    const blur = vi.fn(async () => new Uint8Array([9, 8, 7]));
    const response = await createAvatarImageResponse('Maya', null, {
      imageBaseUrl: 'http://image-server-service/images/people', authUrl: 'http://backend/auth/user', fetcher, blur,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(blur).toHaveBeenCalledOnce();
  });

  it('returns the original bytes only after the backend validates the bearer token', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } }));
    const blur = vi.fn(async () => new Uint8Array([9, 8, 7]));
    const response = await createAvatarImageResponse('Maya', 'Bearer valid-token', {
      imageBaseUrl: 'http://image-server-service/images/people', authUrl: 'http://backend/auth/user', fetcher, blur,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(fetcher.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer valid-token' });
    expect(blur).not.toHaveBeenCalled();
  });

  it('fails closed to a blurred image when token validation is rejected', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } }));
    const blur = vi.fn(async () => new Uint8Array([9, 8, 7]));
    const response = await createAvatarImageResponse('Maya', 'Bearer expired-token', {
      imageBaseUrl: 'http://image-server-service/images/people', authUrl: 'http://backend/auth/user', fetcher, blur,
    });

    expect(response.headers.get('content-type')).toBe('image/webp');
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([9, 8, 7]);
  });

  it('rejects unsafe names without requesting the image server', async () => {
    const fetcher = vi.fn();
    const response = await createAvatarImageResponse('../secrets', null, {
      imageBaseUrl: 'http://image-server-service/images/people', authUrl: 'http://backend/auth/user', fetcher, blur: vi.fn(),
    });

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
