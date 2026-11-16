import { describe, expect, it } from 'vitest';
import { articleTopic } from '../../src/scripts/work/articleTopic';

describe('article topics', () => {
  it.each([
    ['React', [], '前端開發'],
    ['Angular', [], '前端開發'],
    ['Java', [], '後端開發'],
    ['Kubernetes', [], '部署與維運'],
    ['Data Science', ['Python'], 'AI 與資料科學'],
    ['Other', ['System Architecture', 'Banking', 'Microservices', 'Cloud Native'], '系統架構'],
    ['Other', ['Astro', 'FastAPI', 'Data Engineering'], 'AI 與資料科學'],
    ['Unmapped Tool', [], '軟體工程'],
  ])('groups %s into %s', (category, tags, topic) => {
    expect(articleTopic({ category, tags })).toBe(topic);
  });
});
