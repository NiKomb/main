export function caseRouteComment(tile: Element, comments: Readonly<Record<string, string>>) {
  const key = tile.closest('[data-mascot-comment]')?.getAttribute('data-mascot-comment');
  return key ? comments[key] : undefined;
}

export function metricCommentRightEdge(stopTile: Element, grid: Element | null, check: Element | null) {
  return (grid ? stopTile : check)?.getBoundingClientRect().right;
}
