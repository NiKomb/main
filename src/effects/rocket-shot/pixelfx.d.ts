declare module 'pixelfx' {
  interface Frame {
    w: number;
    h: number;
    color: Uint32Array;
    light: Uint32Array;
  }

  export interface Effect {
    update(seconds: number): void;
    draw(frame: Frame): void;
  }

  export function createFrame(width: number, height: number, x?: number, y?: number): Frame;
  export function clearFrame(frame: Frame): Frame;
  export function composite(frame: Frame, output: Uint8ClampedArray): Uint8ClampedArray;
  export function createFx(effect: typeof import('pixelfx/fx/impacts/ground-slam'), options: {
    x: number;
    y: number;
    stone: string;
    onRocksSettled?: (rocks: { x: number; y: number; size: number }[]) => void;
  }): Effect;
}

declare module 'pixelfx/fx/impacts/ground-slam' {
  export const meta: { size: [number, number]; origin: [number, number]; fps: number; duration: number };
  export function create(options: unknown): unknown;
}
