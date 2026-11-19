export function paintDnsButtonGradient(context: CanvasRenderingContext2D, dark: string, light: string) {
  const { width, height } = context.canvas;
  const palette = [dark, ...[25, 50, 75].map((percent) => `color-mix(in srgb, ${dark}, ${light} ${percent}%)`), light];
  // The DNS gradient runs at 90 degrees, so only the column sets the base color.
  const colorStep = (palette.length - 1) / Math.max(1, width - 1);
  let seed = 42;
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const color = Math.floor(column * colorStep + seed / 0x100000000);
      context.fillStyle = palette[color];
      context.fillRect(column, row, 1, 1);
    }
  }
}
