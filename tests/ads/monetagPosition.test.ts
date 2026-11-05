import { beforeEach, describe, expect, it } from 'vitest';
import { observeMonetagFloatingAds, positionMonetagFloatingAds } from '../../src/scripts/ads/monetagPosition';

describe('Monetag floating ad placement', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('moves the high-z-index floating iframe above the bottom controls', () => {
    document.body.innerHTML = '<iframe style="width:100% !important;height:190px !important;position:fixed !important;z-index:2147483647 !important;inset:15px 0 auto auto !important"></iframe>';
    positionMonetagFloatingAds(document);
    const frame = document.querySelector('iframe')!;
    expect(frame.style.getPropertyValue('top')).toBe('auto');
    expect(frame.style.getPropertyValue('bottom')).toBe('calc(112px + env(safe-area-inset-bottom))');
    expect(frame.style.getPropertyPriority('bottom')).toBe('important');
  });

  it('leaves regular fixed frames and inline banner frames unchanged', () => {
    document.body.innerHTML = '<iframe style="position:fixed;z-index:1000;inset:15px 0 auto"></iframe><iframe src="about:blank" style="width:320px;height:50px"></iframe>';
    const frames = [...document.querySelectorAll('iframe')];
    const before = frames.map(frame => frame.getAttribute('style'));
    positionMonetagFloatingAds(document);
    expect(frames.map(frame => frame.getAttribute('style'))).toEqual(before);
  });

  it('is safe to run repeatedly after provider style updates', () => {
    document.body.innerHTML = '<iframe style="width:100% !important;height:190px !important;position:fixed !important;z-index:2147483647 !important;inset:15px 0 auto auto !important"></iframe>';
    const frame = document.querySelector('iframe')!;
    positionMonetagFloatingAds(document);
    frame.style.setProperty('top', '15px', 'important');
    frame.style.setProperty('bottom', 'auto', 'important');
    positionMonetagFloatingAds(document);
    expect(frame.style.getPropertyValue('bottom')).toContain('112px');
  });

  it('repositions a floating iframe injected after the Learn page loads', async () => {
    observeMonetagFloatingAds(document);
    const frame = document.createElement('iframe');
    frame.setAttribute('style', 'width:100% !important;height:190px !important;position:fixed !important;z-index:2147483647 !important;inset:15px 0 auto auto !important');
    document.body.append(frame);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(frame.style.getPropertyValue('bottom')).toContain('112px');
  });
});
