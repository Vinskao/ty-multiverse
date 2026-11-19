import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { chatUserLabel } from '../../src/scripts/qabot/chatUserLabel';

describe('chat identity and send control', () => {
  it('shows the signed-in full name and keeps anonymous sessions readable', () => {
    expect(chatUserLabel('token', ' 高天逸 ', 'user_123456')).toBe('高天逸');
    expect(chatUserLabel(null, 'stale name', 'user_123456')).toBe('ID: user_123...');
    expect(chatUserLabel('token', '', 'user_123456')).toBe('ID: user_123...');
  });
  it('uses theme-aware contrasting text for the send icon', () => {
    expect(readFileSync('src/styles/qabot-flat.css', 'utf8')).toMatch(/\.send-button\s*\{[^}]*color:\s*var\(--accent-text-over\)/s);
  });
});
