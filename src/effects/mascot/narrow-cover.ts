export function selectNarrowCover<T extends { top: number; bottom: number }>(
  covers: readonly T[], viewportHeight: number, atBottom: boolean,
): T | undefined {
  const visible = covers.filter(({ top, bottom }) => top < viewportHeight && bottom > 0);
  if (atBottom) return visible.at(-1);
  return visible.find(({ top }) => top >= Math.min(96, viewportHeight / 3)) ?? visible[0];
}

export const secondCaseId = 'project-vseinstrumenti';

export function selectMascotStop<T extends { id: string | null; top: number }>(
  routes: readonly T[], target: T, secondCaseCommentClosed: boolean, footOffset: number,
) {
  const pendingCase = target.id === 'project-preview' && !secondCaseCommentClosed
    ? routes.find(({ id }) => id === secondCaseId) : undefined;
  return {
    stop: pendingCase && pendingCase.top >= footOffset ? pendingCase : target,
    commentId: (pendingCase ?? target).id,
  };
}
