import type { Point } from './mascot-movement';

export type DragSample = Point & { time: number };

export function dragPull(previous: DragSample, next: DragSample): Point {
  const elapsed = Math.min(64, Math.max(8, next.time - previous.time));
  const fullPull = elapsed * 1.25;
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  return {
    x: clamp((previous.x - next.x) / fullPull),
    y: clamp((previous.y - next.y) / fullPull),
  };
}

export function dampDragReaction(reaction: Point, pull: Point, sampleAge: number, elapsed: number): Point | undefined {
  const coast = Math.exp(-Math.max(0, sampleAge - 24) / 48);
  const blend = 1 - Math.exp(-Math.max(0, elapsed) / 42);
  const target = { x: pull.x * coast, y: pull.y * coast };
  const x = reaction.x + (target.x - reaction.x) * blend;
  const y = reaction.y + (target.y - reaction.y) * blend;
  if (Math.max(Math.abs(x), Math.abs(y), Math.abs(target.x), Math.abs(target.y)) < .002) return;
  return { x, y };
}
