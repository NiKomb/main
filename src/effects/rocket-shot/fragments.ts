import { particleSeed } from '../case-pixels/particles';
import { fragmentDuration, type Fragment } from './fragment-motion';

function sampleFragments(bounds: Pick<DOMRectReadOnly, 'width' | 'height'>, scale: number,
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(bounds.width / scale);
  canvas.height = Math.ceil(bounds.height / scale);
  const { width, height } = canvas;
  const context = canvas.getContext('2d');
  const pixels: Fragment[] = [];
  if (!context || !width || !height) return pixels;

  draw(context, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 96) continue;
    const pixel = index / 4;
    const column = pixel % width;
    const row = Math.floor(pixel / width);
    const seed = particleSeed(column, row);
    const x = column - width / 2;
    const y = row - height / 2;
    pixels.push({
      x,
      y,
      color: `rgb(${data[index]} ${data[index + 1]} ${data[index + 2]})`,
      size: seed % 3 === 0 ? 2 : 1,
      lifetime: fragmentDuration - seed % 201,
      travelX: (x / width * 156 + seed % 49 - 24) / scale,
      travelY: (y / height * 72 - 56 + seed % 41 - 20) / scale,
    });
  }
  return pixels;
}

export function sampleText(element: HTMLElement, bounds: DOMRectReadOnly, scale: number) {
  return sampleFragments(bounds, scale, (context) => {
    context.textBaseline = 'middle';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node instanceof Text) || !node.parentElement) continue;
      const style = getComputedStyle(node.parentElement);
      context.font = `${style.fontWeight} ${parseFloat(style.fontSize) / scale}px ${style.fontFamily}`;
      context.fillStyle = style.color;

      for (const word of node.data.matchAll(/\S+/gu)) {
        range.setStart(node, word.index);
        range.setEnd(node, word.index + word[0].length);
        const box = range.getBoundingClientRect();
        const x = (box.left - bounds.left) / scale;
        const y = (box.top - bounds.top + box.height / 2) / scale;
        const text = style.textTransform === 'uppercase' ? word[0].toUpperCase() : word[0];
        context.fillText(text, x, y);
      }
    }
  });
}
