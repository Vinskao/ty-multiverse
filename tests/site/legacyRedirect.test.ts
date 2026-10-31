import { describe, expect, it } from 'vitest';
import { legacyRedirect } from '../../src/scripts/site/legacyRedirect';

const at = (url: string) => legacyRedirect(new URL(url));

describe('old site URLs move to the root of tymultiverse.cc', () => {
  it('strips the /tymultiverse prefix on the old host and keeps the query string', () => {
    expect(at('https://peoplesystem.tatdvsonorth.com/tymultiverse/work/thread-pool?lang=en'))
      .toBe('https://tymultiverse.cc/work/thread-pool?lang=en');
    expect(at('https://peoplesystem.tatdvsonorth.com/tymultiverse/')).toBe('https://tymultiverse.cc/');
    expect(at('https://peoplesystem.tatdvsonorth.com/tymultiverse')).toBe('https://tymultiverse.cc/');
  });

  it('strips the prefix on the new host too', () => {
    expect(at('https://tymultiverse.cc/tymultiverse/about/')).toBe('https://tymultiverse.cc/about/');
    expect(at('https://tymultiverse.cc/tymultiverse/brief.md?lang=en')).toBe('https://tymultiverse.cc/brief.md?lang=en');
  });

  it('sends the old host root to the new home page', () => {
    expect(at('https://peoplesystem.tatdvsonorth.com/')).toBe('https://tymultiverse.cc/');
  });

  it('leaves current URLs and look-alike paths alone', () => {
    expect(at('https://tymultiverse.cc/')).toBeNull();
    expect(at('https://tymultiverse.cc/work/abc')).toBeNull();
    expect(at('https://tymultiverse.cc/tymultiverseX')).toBeNull();
    expect(at('http://localhost:4321/about/')).toBeNull();
  });

  it('recognises the old host from the proxy header when Astro reports localhost', () => {
    // Astro does not trust the Host header by default, so behind the Ingress context.url is localhost.
    const url = new URL('http://localhost:4321/');
    expect(legacyRedirect(url, 'peoplesystem.tatdvsonorth.com')).toBe('https://tymultiverse.cc/');
    expect(legacyRedirect(new URL('http://localhost:4321/about/?x=1'), 'peoplesystem.tatdvsonorth.com:443'))
      .toBe('https://tymultiverse.cc/about/?x=1');
    expect(legacyRedirect(url, 'tymultiverse.cc')).toBeNull();
    expect(legacyRedirect(url, 'evil.example')).toBeNull();
  });

  it('never redirects off-site, whatever the path contains', () => {
    expect(at('https://tymultiverse.cc/tymultiverse//evil.example/x')).toBe('https://tymultiverse.cc/evil.example/x');
  });
});
