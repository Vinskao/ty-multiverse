export interface AdsterraBanner {
  key: string;
  width: number;
  height: number;
}

const banners = {
  mobile: { key: '1c16df172e64502192c1e6d4dbcb55b3', width: 320, height: 50 },
  tablet: { key: 'b482bf45e63c94a7960024db3bf6cfe1', width: 468, height: 60 },
  desktop: { key: '09456a5c69d10772fefff66284e73aef', width: 728, height: 90 },
} satisfies Record<string, AdsterraBanner>;

export function responsiveBannerForWidth(width: number): AdsterraBanner {
  if (width < 600) return banners.mobile;
  if (width < 1000) return banners.tablet;
  return banners.desktop;
}
