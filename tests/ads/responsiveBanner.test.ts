import { describe, expect, it } from 'vitest';
import { responsiveBannerForWidth } from '../../src/scripts/ads/responsiveBanner';

describe('Adsterra responsive banner selection', () => {
  it('uses the generated mobile, tablet, and desktop units at their intended widths', () => {
    expect(responsiveBannerForWidth(390)).toEqual({ key: '1c16df172e64502192c1e6d4dbcb55b3', width: 320, height: 50 });
    expect(responsiveBannerForWidth(768)).toEqual({ key: 'b482bf45e63c94a7960024db3bf6cfe1', width: 468, height: 60 });
    expect(responsiveBannerForWidth(1280)).toEqual({ key: '09456a5c69d10772fefff66284e73aef', width: 728, height: 90 });
  });

  it('switches to a mobile unit at the narrow breakpoint', () => {
    expect(responsiveBannerForWidth(599).width).toBe(320);
    expect(responsiveBannerForWidth(600).width).toBe(468);
    expect(responsiveBannerForWidth(999).width).toBe(468);
    expect(responsiveBannerForWidth(1000).width).toBe(728);
  });
});
