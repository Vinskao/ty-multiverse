import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// 2026-11-18: the nav showed the visitor's name and a logout button, but no Palais tab on pages opened without ?username=.
// Login state and the admin role are read in the browser (localStorage / token); the server only knew about the username
// query parameter, so it left the Palais link out and the script had nothing to reveal. The link is now always in the
// markup (hidden by the .admin-only rule) and the script decides.
const nav = readFileSync('src/components/Nav.astro', 'utf8');

it('always renders the Palais link, whatever the URL says, and leaves showing it to the client', () => {
  expect(nav).not.toMatch(/\.\.\.\(isLoggedIn\s*\?\s*\[\s*\{\s*label:\s*"Palais"/);
  expect(nav).toMatch(/label:\s*"Palais"[\s\S]{0,200}adminOnly:\s*true/);
});

it('keeps the Palais item hidden until the script confirms an admin', () => {
  expect(readFileSync('src/styles/nav.css', 'utf8')).toMatch(/\.admin-only\s*\{\s*display:\s*none;?\s*\}/);
});
