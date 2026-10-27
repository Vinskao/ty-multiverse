import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { CREDENTIALS } from '../../src/scripts/credentials';

// The homepage maintainer card linked only one Credly badge; the earlier Skills section had four
// (reported 2026-10-27: "查看技術認證只剩一個"). All four are listed again, each with its own link.
it('lists the four certifications the site showed before, each with a unique https link', () => {
    expect(CREDENTIALS.map((c) => c.id)).toEqual(['redhat-jboss-ad248', 'fcc-javascript-algorithms', 'fcc-data-visualization', 'google-digital-transformation']);
    expect(new Set(CREDENTIALS.map((c) => c.url)).size).toBe(4);
    for (const credential of CREDENTIALS) {
        expect(credential.url).toMatch(/^https:\/\//);
        expect(credential.name.length).toBeGreaterThan(5);
        expect(credential.issuer.length).toBeGreaterThan(0);
    }
    expect(CREDENTIALS[0].url).toContain('credly.com/badges/0584630d-b598-4eba-a6d1-425cb7a997fe');
});

it('renders every credential in the maintainer card instead of a single link', () => {
    const card = readFileSync(resolve(process.cwd(), 'src/components/MaintainerExperience.astro'), 'utf8');
    expect(card).toContain('CREDENTIALS.map');
    expect(card).not.toContain('data-i18n="home.teamCredential"');
    expect(card).toMatch(/rel="noopener noreferrer"[^>]*>\s*\{credential\.name\}/);
});
