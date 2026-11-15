// Pixel bounds of the switch in dns-hover-modal-after.webp.
export const switchCrop = { x: 2034, y: 582, width: 825, height: 108 };
const sourceWidth = 4140;

export function projectSwitch(image: Pick<DOMRectReadOnly, 'left' | 'top' | 'width'>, divider: number) {
  const scale = image.width / sourceWidth;
  const left = image.left + switchCrop.x * scale;
  const width = Math.min(switchCrop.width * scale, divider - left);
  if (width <= 0) return;
  return { left, top: image.top + switchCrop.y * scale, width, height: switchCrop.height * scale, sourceWidth: width / scale };
}
