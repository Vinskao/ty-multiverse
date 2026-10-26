import { expect, it } from 'vitest';
import skillsData from '../../src/storages/skills.json';
import { skillBubbles } from '../../src/scripts/skillBubbles';

// The D3 bubble chart was dropped from the homepage in f254ee1; it comes back inside the
// "查看完整技術能力與工具" section with the same scores (shade1 = 5 … shade5 = 1, summed per category).
it('scores each category by summing its skills, with or without subcategories', () => {
    expect(skillBubbles([
        { name: 'A', subcategories: [{ name: 'x', skills: [{ name: 'a', level: 'shade1' }] }, { name: 'y', skills: [{ name: 'b', level: 'shade5' }] }] },
        { name: 'B', skills: [{ name: 'c', level: 'shade3' }, { name: 'd', level: 'unknown' }] },
        { name: 'C' },
    ])).toEqual([
        { id: 'A', name: 'A', value: 6, category: 'A' },
        { id: 'B', name: 'B', value: 3, category: 'B' },
        { id: 'C', name: 'C', value: 0, category: 'C' },
    ]);
});

it('matches the scores of the current skills.json', () => {
    const scores = Object.fromEntries(skillBubbles(skillsData.categories as any).map((b) => [b.name, b.value]));
    expect(scores['Backend Development']).toBe(216);
    expect(scores['AI']).toBe(81);
    expect(scores['CI/CD']).toBe(7);
});
