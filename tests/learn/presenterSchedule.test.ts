import { describe, it, expect } from 'vitest';
import { presenterForAudio } from '../../src/scripts/learn/presenterSchedule';
import { marketClipUrl } from '../../src/scripts/learn/marketAudioPlayback';

describe('presenter schedule', () => {
  it('selects duo on Tuesday and Sunday Taipei time, Uiobbeci on Thursday and Saturday', () => {
    expect(['2026-11-02T12:00:00Z','2026-11-03T12:00:00Z','2026-11-04T12:00:00Z','2026-11-05T12:00:00Z','2026-11-06T12:00:00Z','2026-11-07T12:00:00Z','2026-11-08T12:00:00Z'].map(presenterForAudio)).toEqual(['maya','duo','maya','uiobbeci','maya','uiobbeci','duo']);
    expect(presenterForAudio('2026-11-02T16:30:00Z')).toBe('duo');
  });
  it('keeps each presenter on their own clips', () => {
    expect(marketClipUrl(1, 'uiobbeci')).toContain('reporterUiobbeci.mp4');
    expect(marketClipUrl(1, 'duo')).toContain('reporterDuo.mp4');
    expect(marketClipUrl(2, 'maya')).toContain('reporter3.mp4');
  });
});
