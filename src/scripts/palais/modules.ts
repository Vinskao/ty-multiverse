// Palais entry cards; covered by tests/palais/modules.test.ts. Text comes from i18n.json "palaisModules".
export type PalaisModule = { key: string; href: string };
export type PalaisTool = { key: 'admin' | 'clutches'; href: string };

const KEYS = ['fight', 'group', 'dance', 'party', 'live', 'levels'];

export function palaisTools(): PalaisTool[] {
  return [
    { key: 'admin', href: 'https://tymultiverse.cc/sso/admin/master/console/' },
    { key: 'clutches', href: '#palais-file-tools' },
  ];
}

export function palaisModules(username: string): PalaisModule[] {
  const query = new URLSearchParams({ username }).toString();
  return KEYS.map((key) => ({ key, href: `/palais/${key}?${query}` }));
}

/** Inline display NavScript gives a Palais link: hidden without access; module cards drop the override so their CSS grid applies. */
export function palaisLinkDisplay(show: boolean, isModuleCard: boolean): string {
  if (!show) return 'none';
  return isModuleCard ? '' : 'block';
}
