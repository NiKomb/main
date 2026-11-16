export function caseRouteComment(tile: Element, comments: Readonly<Record<string, string>>) {
  const key = tile.closest('[data-mascot-comment]')?.getAttribute('data-mascot-comment');
  return key ? comments[key] : undefined;
}
