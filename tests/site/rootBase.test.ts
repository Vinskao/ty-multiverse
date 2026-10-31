import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// 2026-10-31: the site moved from https://peoplesystem.tatdvsonorth.com/tymultiverse/
// to the root of https://tymultiverse.cc/. Old URLs are 301-redirected by the Ingress,
// so the app itself must not emit the legacy prefix or host anywhere.
const root = resolve(__dirname, '../..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(astro|ts|tsx|js|mjs|css|md|mdx|json|txt)$/.test(name) ? [path] : [];
  });
}

describe('site served at the domain root', () => {
  it('builds with base "/"', () => {
    const config = readFileSync(join(root, 'astro.config.ts'), 'utf8');
    expect(config).not.toMatch(/base:\s*['"]\/tymultiverse/);
  });

  it('has no hard-coded legacy base path or host in src and public', () => {
    // legacyRedirect.ts is the one place that must recognise old URLs.
    const allowed = join(root, 'src', 'scripts', 'site', 'legacyRedirect.ts');
    const offenders = [...sourceFiles(join(root, 'src')), ...sourceFiles(join(root, 'public'))]
      .filter((file) => file !== allowed)
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, i) => ({ file: file.slice(root.length + 1), line: i + 1, text: line }))
          .filter(({ text }) => /\/tymultiverse(?![.\w])|peoplesystem\.tatdvsonorth\.com/.test(text)),
      )
      .map(({ file, line }) => `${file}:${line}`);
    expect(offenders).toEqual([]);
  });
});
