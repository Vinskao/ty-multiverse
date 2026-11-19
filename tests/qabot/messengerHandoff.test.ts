import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isMayaBusyAnswer } from '../../src/scripts/qabot/mayaBusyAnswer';
import english from '../../src/storages/literalEn.json';

describe('Messenger handoff for Maya’s unavailable reply', () => {
  const zh = 'Maya 目前還沒上班，今天的額度暫時用完了。先去逛逛站上的文章與市場頁，晚點或明天再來找我聊，我會在的。';
  const en = "Maya is not on shift yet: today's AI allowance has run out for now. Look around the articles and market pages, and come back a little later or tomorrow.";

  it.each([zh, en])('recognizes the deployed fallback: %s', (answer) => {
    expect(isMayaBusyAnswer(answer)).toBe(true);
  });

  it('does not attach a handoff to ordinary answers or quotations', () => {
    expect(isMayaBusyAnswer('Here are the latest articles.')).toBe(false);
    expect(isMayaBusyAnswer(`You asked about "${en}"`)).toBe(false);
  });

  it('adds no Messenger link inside the reply: the header icon is the only entry', () => {
    const platform = readFileSync('src/components/QAPlatform.astro', 'utf8');
    expect(platform).not.toContain('mayaMessengerHandoff');
    expect(platform.match(/m\.me\/61596064529255/g)).toHaveLength(1);
    expect(english).not.toHaveProperty(['改用 Messenger 留言給真人']);
  });
});
