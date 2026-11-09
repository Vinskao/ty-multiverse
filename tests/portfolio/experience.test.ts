import { describe, expect, it } from 'vitest';
import about from '../../src/storages/about.json';
import { experienceMonths } from '../../src/scripts/portfolio/experience';

describe('employment experience months', () => {
  it('counts the confirmed EY 7 months and Tarobo 4 months as 11 months', () => {
    const jobs = about.experience.filter(job => ['Auditor', 'Macro Associate'].includes(job.title));
    expect(experienceMonths(jobs)).toBe(11);
  });

  it('keeps month-only durations and Present behavior unless a duration is confirmed', () => {
    expect(experienceMonths([{ title: 'PM', period: '2021/8~2022/5' }])).toBe(9);
    expect(experienceMonths([{ title: 'Engineer', period: '2025/12~Present' }], new Date(2026, 9, 19))).toBe(10);
  });

  it('does not double count overlapping employment or adjacent ranges', () => {
    expect(experienceMonths([
      { title: 'A', period: '2023/3~2024/12' },
      { title: 'B', period: '2024/3~2025/12' },
      { title: 'C', period: '2025/12~2026/10' },
    ])).toBe(43);
    expect(experienceMonths([])).toBe(0);
  });

  it('rejects malformed months rather than silently rolling dates forward', () => {
    expect(() => experienceMonths([{ title: 'A', period: '2023/13~2024/1' }])).toThrow('Invalid employment month');
  });

  it('validates confirmed durations and merges their occupied months', () => {
    expect(experienceMonths([
      { title: 'A', period: '2019/9~2020/3', durationMonths: 7 },
      { title: 'B', period: '2020/3~2020/5' },
    ])).toBe(8);
    expect(() => experienceMonths([{ title: 'A', period: '2019/9~2020/3', durationMonths: 70 }])).toThrow('Invalid confirmed duration');
  });
});

describe('about.json project periods', () => {
  it('does not mark projects as Present under a job that already ended', () => {
    const ended = about.experience.filter(job => !/Present/i.test(job.period));
    expect(ended.length).toBeGreaterThan(0);
    for (const job of ended) {
      const entries = Object.values(job.projectExperience ?? {}).flat() as string[];
      const stale = entries.filter(entry => /~\s*Present/i.test(entry));
      expect(stale, `${job.company} (${job.period})`).toEqual([]);
    }
  });
});
