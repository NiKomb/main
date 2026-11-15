import { particleFrame, particleSeed } from '../case-pixels/particles';
import { switchCrop } from './switch-crop';

export const fragmentDuration = 520;

function sampleFragments(bounds: Pick<DOMRectReadOnly, 'width' | 'height'>, scale: number,
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(bounds.width / scale);
  canvas.height = Math.ceil(bounds.height / scale);
  const { width, height } = canvas;
  const context = canvas.getContext('2d');
  const pixels: { x: number; y: number; color: string; lifetime: number; drift: number }[] = [];
  if (!context || !width || !height) return pixels;

  draw(context, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 96) continue;
    const pixel = index / 4;
    const column = pixel % width;
    const row = Math.floor(pixel / width);
    const seed = particleSeed(column, row);
    pixels.push({
      x: column - width / 2,
      y: row - height / 2,
      color: `rgb(${data[index]} ${data[index + 1]} ${data[index + 2]})`,
      lifetime: 300 + seed % 220,
      drift: seed % 23 - 11,
    });
  }
  return pixels;
}

export function sampleText(element: HTMLElement, bounds: DOMRectReadOnly, scale: number) {
  const style = getComputedStyle(element);
  return sampleFragments(bounds, scale, (context, width, height) => {
    context.font = `${style.fontWeight} ${parseFloat(style.fontSize) / scale}px ${style.fontFamily}`;
    context.fillStyle = style.color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(element.textContent?.trim() ?? '', width / 2, height / 2, width);
  });
}

export function sampleSwitch(image: HTMLImageElement, bounds: { width: number; height: number; sourceWidth: number }, scale: number) {
  return sampleFragments(bounds, scale, (context, width, height) => {
    context.drawImage(image, switchCrop.x, switchCrop.y, bounds.sourceWidth, switchCrop.height, 0, 0, width, height);
  });
}

export function drawFragments(context: CanvasRenderingContext2D, fragments: ReturnType<typeof sampleFragments>,
  center: { x: number; y: number }, elapsed: number) {
  for (const { x, y, color, lifetime, drift } of fragments) {
    const { size, opacity, offset } = particleFrame(elapsed, 0, lifetime, 1, 1);
    if (!size) continue;
    context.fillStyle = color;
    context.globalAlpha = opacity;
    const left = center.x + x + (x * .7 + drift) * offset;
    const top = center.y + y + (y * 2 - 9 + drift) * offset;
    context.fillRect(Math.round(left), Math.round(top), 1, 1);
  }
  context.globalAlpha = 1;
}
