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

export function viewportSwapClip(bounds: Bounds, edge: ViewportEdge, height: number) {
  const position = viewportSwapPosition(edge, height);
  const padding = 8;
  const left = bounds.left - padding;
  const right = bounds.right + padding;
  const top = bounds.top - padding;
  const bottom = bounds.bottom + padding;
  const bandStart = Math.min(bottom, Math.max(top, Math.floor((position - spread) / pixelSize) * pixelSize));
  const bandEnd = Math.min(bottom, Math.ceil((position + spread) / pixelSize) * pixelSize);
  const rect = (x0: number, x1: number, y0: number, y1: number) => {
    return `M${(x0 - bounds.left).toFixed(2)} ${(y0 - bounds.top).toFixed(2)}H${(x1 - bounds.left).toFixed(2)}V${(y1 - bounds.top).toFixed(2)}H${(x0 - bounds.left).toFixed(2)}Z`;
  };

  let near = bandStart > top ? rect(left, right, top, bandStart) : '';
  for (let column = Math.floor(left / pixelSize); column < Math.ceil(right / pixelSize); column++) {
    const cellLeft = Math.max(left, column * pixelSize);
    const cellRight = Math.min(right, (column + 1) * pixelSize);
    for (let row = Math.floor(bandStart / pixelSize); row < Math.ceil(bandEnd / pixelSize); row++) {
      const cellTop = Math.max(bandStart, row * pixelSize);
      const cellBottom = Math.min(bandEnd, (row + 1) * pixelSize);
      if (cellBottom > cellTop && nearCell(row, column, position)) {
        near += rect(cellLeft, cellRight, cellTop, cellBottom);
      }
    }
  }
  if (edge === 'bottom') return near ? `path("${near}")` : 'inset(50%)';
  return near ? `path(evenodd, "${rect(left, right, top, bottom)}${near}")` : 'none';
}
