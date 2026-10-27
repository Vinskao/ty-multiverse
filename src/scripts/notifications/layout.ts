type Anchor = { top: number; bottom: number; right: number };
type Viewport = { width: number; height: number };

/** Keep an anchored notification panel inside the visible screen, including a low mobile-menu bell. */
export function notificationPanelLayout(anchor: Anchor, viewport: Viewport, contentHeight: number) {
  const gutter = 16;
  const gap = 10;
  const width = Math.min(420, Math.max(0, viewport.width - gutter * 2));
  const left = Math.max(gutter, Math.min(anchor.right - width, viewport.width - width - gutter));
  const below = Math.max(0, viewport.height - anchor.bottom - gap - gutter);
  const above = Math.max(0, anchor.top - gap - gutter);
  const opensAbove = below < 240 && above > below;
  const maxHeight = Math.min(560, opensAbove ? above : below);
  const top = opensAbove ? anchor.top - gap - Math.min(contentHeight, maxHeight) : anchor.bottom + gap;
  return { left, top: Math.max(gutter, top), width, maxHeight };
}
