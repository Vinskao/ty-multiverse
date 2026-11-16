import { beforeEach, describe, expect, it } from 'vitest';
import { observeMonetagFloatingAds, positionMonetagFloatingAds } from '../../src/scripts/ads/monetagPosition';

describe('Monetag floating ad placement', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('places the ad in normal flow below the page content', () => {
    document.body.innerHTML = '<div data-monetag-zone="12196776" data-loaded="true"></div><iframe style="width:100% !important;height:190px !important;position:fixed !important;z-index:2147483647 !important;inset:15px 0 auto auto !important"></iframe>';
    positionMonetagFloatingAds(document);
    const frame = document.querySelector('iframe')!;
    expect(frame.style.getPropertyValue('top')).toBe('auto');
    expect(frame.style.getPropertyValue('bottom')).toBe('auto');
    expect(frame.style.getPropertyPriority('bottom')).toBe('important');
    expect(frame.style.getPropertyValue('width')).toBe('360px');
    expect(frame.style.getPropertyValue('max-width')).toBe('100%');
  });

  it('leaves regular fixed frames and inline banner frames unchanged', () => {
    document.body.innerHTML = '<div data-monetag-zone="12196776" data-loaded="true"></div><iframe style="position:fixed;z-index:1000;inset:15px 0 auto"></iframe><iframe src="about:blank" style="width:320px;height:50px"></iframe>';
    const frames = [...document.querySelectorAll('iframe')];
    const before = frames.map(frame => frame.getAttribute('style'));
    positionMonetagFloatingAds(document);
    expect(frames.map(frame => frame.getAttribute('style'))).toEqual(before);
  });

  it('is safe to run repeatedly after provider style updates', () => {
    document.body.innerHTML = '<div data-monetag-zone="12196776" data-loaded="true"></div><iframe style="width:100% !important;height:190px !important;position:fixed !important;z-index:2147483647 !important;inset:15px 0 auto auto !important"></iframe>';
    const frame = document.querySelector('iframe')!;
    positionMonetagFloatingAds(document);
    frame.style.setProperty('top', '15px', 'important');
    frame.style.setProperty('bottom', 'auto', 'important');
    positionMonetagFloatingAds(document);
    expect(frame.style.getPropertyValue('bottom')).toBe('auto');
  });

  it('repositions a floating iframe injected after the Learn page loads', async () => {
    document.body.innerHTML = '<div data-monetag-zone="12196776" data-loaded="true"></div>';
    observeMonetagFloatingAds(document);
    const frame = document.createElement('iframe');
    frame.setAttribute('style', 'width:100% !important;height:190px !important;position:fixed !important;z-index:2147483647 !important;inset:15px 0 auto auto !important');
    document.body.append(frame);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(frame.style.getPropertyValue('bottom')).toBe('auto');
  });
});

it('places the Monetag frame in the document flow inside its slot', () => {
  document.body.innerHTML = '<div data-monetag-zone="12196776" data-loaded="true"></div><iframe style="position:fixed;width:100%;height:190px;z-index:2147483647"></iframe>';
  positionMonetagFloatingAds(document);
  const frame = document.querySelector('iframe')!;
  expect(frame.parentElement?.hasAttribute('data-monetag-zone')).toBe(true);
  expect(frame.style.position).toBe('relative');
});
