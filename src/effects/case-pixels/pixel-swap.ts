// Each pixel of the rendered mascot sprite is 2 CSS px.
export const pixelSize = 4;
const viewportInset = { top: 40, bottom: 44 };
export const swapDepth = Math.max(viewportInset.top, viewportInset.bottom) + 2 * pixelSize;

type Bounds = Pick<DOMRectReadOnly, 'left' | 'right' | 'top' | 'bottom'>;
export type ViewportEdge = 'top' | 'bottom';
const spread = 1.25 * pixelSize;

function nearCell(along: number, across: number, position: number) {
  const offset = Math.sin(across * 2.4 + along * 3.7) * spread;
  return (along + .5) * pixelSize < position + offset;
}

function viewportSwapPosition(edge: ViewportEdge, height: number) {
  return edge === 'top' ? viewportInset.top : height - viewportInset.bottom;
}

export function viewportExitCell(column: number, edge: ViewportEdge, height: number) {
  const position = viewportSwapPosition(edge, height);
  // Use the first hidden cell reached by content travelling toward the edge.
  const start = edge === 'top' ? Math.ceil((position + spread) / pixelSize) : Math.floor((position - spread) / pixelSize);
  const step = edge === 'top' ? -1 : 1;
  let row = start;
  while (nearCell(row, column, position) !== (edge === 'top')) row += step;
  return row * pixelSize;
}

function swapClips(bounds: Bounds, axis: 'x' | 'y', position: number, padding = 0) {
  const left = bounds.left - padding;
  const right = bounds.right + padding;
  const top = bounds.top - padding;
  const bottom = bounds.bottom + padding;
  const [start, end, crossStart, crossEnd] = axis === 'x' ? [left, right, top, bottom] : [top, bottom, left, right];
  const bandStart = Math.min(end, Math.max(start, Math.floor((position - spread) / pixelSize) * pixelSize));
  const bandEnd = Math.min(end, Math.ceil((position + spread) / pixelSize) * pixelSize);
  const rect = (from: number, to: number, crossFrom: number, crossTo: number) => {
    const [x0, x1, y0, y1] = axis === 'x' ? [from, to, crossFrom, crossTo] : [crossFrom, crossTo, from, to];
    return `M${(x0 - bounds.left).toFixed(2)} ${(y0 - bounds.top).toFixed(2)}H${(x1 - bounds.left).toFixed(2)}V${(y1 - bounds.top).toFixed(2)}H${(x0 - bounds.left).toFixed(2)}Z`;
  };

  let near = bandStart > start ? rect(start, bandStart, crossStart, crossEnd) : '';
  for (let row = Math.floor(crossStart / pixelSize); row < Math.ceil(crossEnd / pixelSize); row++) {
    const rowTop = Math.max(crossStart, row * pixelSize);
    const rowBottom = Math.min(crossEnd, (row + 1) * pixelSize);
    for (let column = Math.floor(bandStart / pixelSize); column < Math.ceil(bandEnd / pixelSize); column++) {
      const from = Math.max(bandStart, column * pixelSize);
      const to = Math.min(bandEnd, (column + 1) * pixelSize);
      if (to > from && nearCell(column, row, position)) {
        near += rect(from, to, rowTop, rowBottom);
      }
    }
  }
  const full = rect(start, end, crossStart, crossEnd);
  return {
    near: near ? `path("${near}")` : 'inset(50%)',
    far: near ? `path(evenodd, "${full}${near}")` : 'none',
  };
}

export function viewportSwapClip(bounds: Bounds, edge: ViewportEdge, height: number) {
  const clips = swapClips(bounds, 'y', viewportSwapPosition(edge, height), 8);
  return edge === 'top' ? clips.far : clips.near;
}

export function comparisonSwapClips(width: number, height: number, percent: number) {
  if (!width || !height || percent <= 0 || percent >= 100) return;
  return swapClips({ left: 0, right: width, top: 0, bottom: height }, 'x', width * percent / 100);
}

export function comparisonExitCells(width: number, height: number, previous: number, current: number) {
  if (previous === current || width <= 0 || height <= 0) return [];
  const cells: {column: number; row: number}[] = [];
  const from = width * previous / 100;
  const to = width * current / 100;
  // For a large slider jump, emit only around the destination of the divider.
  const nearby = Math.max(to - 3 * pixelSize, Math.min(from, to + 3 * pixelSize));
  const left = Math.max(0, Math.floor((Math.min(nearby, to) - spread) / pixelSize));
  const right = Math.ceil(Math.min(width, Math.max(nearby, to) + spread) / pixelSize);
  const showsBefore = (column: number, row: number, position: number) =>
    position >= width || (position > 0 && nearCell(column, row, position));
  for (let row = 0; row < Math.ceil(height / pixelSize); row++) {
    for (let column = left; column < right; column++) {
      if (showsBefore(column, row, from) !== showsBefore(column, row, to)) cells.push({column, row});
    }
  }
  return cells;
}
