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

  it('never redirects off-site, whatever the path contains', () => {
    expect(at('https://tymultiverse.cc/tymultiverse//evil.example/x')).toBe('https://tymultiverse.cc/evil.example/x');
  });
});
