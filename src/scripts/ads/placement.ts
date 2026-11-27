// Monetag runs on every page except the owner's pages (/palais), sign-in, the article editor and the privacy / cookie page.
// 2026-11-16: it used to be an allow-list of the pages the navigation knows (so /blog, /api and any new page had no ad); now
// a new public page gets the ad without anyone remembering to add it.
const AD_FREE = /^\/(?:palais|login|privacy|contact)(?:\/|$)|^\/work\/manage(?:\/|$)/;

export function showsPublisherAds(pathname: string): boolean {
  return !AD_FREE.test(pathname);
}
