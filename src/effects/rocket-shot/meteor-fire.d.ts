import type { Effect } from 'pixelfx';

export function createMeteorFire(
  rocks: readonly { x: number; y: number; size: number }[],
  x: number,
  y: number,
): { effect: Effect; left: number; right: number; top: number; bottom: number } | undefined;
