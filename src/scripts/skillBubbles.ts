// Category scores for the skills bubble chart: each skill's shade becomes points, summed per category.
type Skill = { name: string; level?: string };
type Category = { name: string; skills?: Skill[]; subcategories?: Array<{ name: string; skills: Skill[] }> };
export type SkillBubble = { id: string; name: string; value: number; category: string };

const SHADE_SCORES: Record<string, number> = { shade1: 5, shade2: 4, shade3: 3, shade4: 2, shade5: 1 };

export function skillBubbles(categories: readonly Category[]): SkillBubble[] {
    return categories.map((category) => {
        const skills = category.subcategories ? category.subcategories.flatMap((sub) => sub.skills) : category.skills ?? [];
        const value = skills.reduce((sum, skill) => sum + (SHADE_SCORES[skill.level ?? ''] ?? 0), 0);
        return { id: category.name, name: category.name, value, category: category.name };
    });
}
