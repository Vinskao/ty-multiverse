import { currentPageKey } from '../navigation/menu';

export function showsPublisherAds(pathname: string): boolean {
  const page = currentPageKey(pathname);
  return page !== null && page !== 'nav.palais' && page !== 'nav.login'
    && !/^\/work\/manage(?:\/|$)/.test(pathname);
}
