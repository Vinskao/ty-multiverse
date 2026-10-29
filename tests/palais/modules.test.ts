import { describe, expect, it } from 'vitest';
import { palaisLinkDisplay, palaisModules, palaisTools } from '../../src/scripts/palais/modules';
import i18n from '../../src/storages/i18n.json';

describe('palais module cards', () => {
  it('lists the six modules in order with links that keep the username', () => {
    const modules = palaisModules('chiaki');
    expect(modules.map((m) => m.key)).toEqual(['fight', 'group', 'dance', 'party', 'live', 'levels']);
    expect(modules[0].href).toBe('/tymultiverse/palais/fight?username=chiaki');
  });

  it('encodes the username instead of letting it rewrite the link', () => {
    expect(palaisModules('a&redirect=//evil.example')[1].href).toBe('/tymultiverse/palais/group?username=a%26redirect%3D%2F%2Fevil.example');
  });

  it('has an English and Chinese title and description for every card', () => {
    const strings = (i18n as Record<string, Record<string, { en: string; zh: string }>>).palaisModules;
    for (const { key } of palaisModules('x')) {
      for (const suffix of ['', 'Desc']) {
        expect(strings[`${key}${suffix}`]?.en, `${key}${suffix}`).toBeTruthy();
        expect(strings[`${key}${suffix}`]?.zh, `${key}${suffix}`).toBeTruthy();
      }
    }
  });
});

describe('palais link visibility', () => {
  it('hides every Palais link without access, and lets module cards keep their own grid layout when shown', () => {
    expect(palaisLinkDisplay(false, true)).toBe('none');
    expect(palaisLinkDisplay(false, false)).toBe('none');
    expect(palaisLinkDisplay(true, true)).toBe('');  // inline "block" broke the card grid
    expect(palaisLinkDisplay(true, false)).toBe('block');  // nav links unchanged
  });
});

describe('palais page placement', () => {
  it('shows the character wall on the Levels page, not on the Palais landing page', async () => {
    const { readFileSync } = await import('node:fs');
    const palais = readFileSync('src/pages/palais.astro', 'utf8');
    const levels = readFileSync('src/pages/palais/levels.astro', 'utf8');
    expect(palais).not.toMatch(/<Galwall\b/);
    expect(levels).toMatch(/<Galwall\b/);
    expect(levels).toMatch(/galwall\.css\?url/);
  });
});

describe('palais tools', () => {
  it('includes the admin console and file converter, with monitoring and Jenkins removed', () => {
    expect(palaisTools()).toEqual([
      { key: 'admin', href: 'https://peoplesystem.tatdvsonorth.com/sso/admin/master/console/' },
      { key: 'clutches', href: '#palais-file-tools' },
    ]);
  });
});
