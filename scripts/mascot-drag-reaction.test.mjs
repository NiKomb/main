import assert from 'node:assert/strict';
import test from 'node:test';
import { runnerImport } from 'vite';

const { module: { dampDragReaction, dragPull } } = await runnerImport(
  './src/effects/mascot/drag-reaction.ts', { configFile: false },
);

const rest = { x: 0, y: 0 };

test('drag reaction trails both axes and grows with pointer speed up to its limit', () => {
  const start = { ...rest, time: 0 };
  assert.deepEqual(dragPull(start, { x: 10, y: -5, time: 20 }), { x: -.4, y: .2 });
  assert.deepEqual(dragPull(start, { x: 10, y: -5, time: 40 }), { x: -.2, y: .1 });
  assert.deepEqual(dragPull(start, { x: -100, y: 100, time: 0 }), { x: 1, y: -1 });
});

test('drag reaction eases through a direction change and settles once the pointer stops', () => {
  const pull = { x: -1, y: .5 };
  const first = dampDragReaction(rest, pull, 0, 16);
  assert.ok(first.x > -1 && first.x < 0);
  assert.ok(first.y > 0 && first.y < .5);

  const reversed = { x: 1, y: -.5 };
  let reaction = dampDragReaction(first, reversed, 0, 4);
  assert.ok(reaction.x > first.x && reaction.x < 0);
  for (let step = 0; step < 6; step++) reaction = dampDragReaction(reaction, reversed, 0, 16);
  assert.ok(reaction.x > 0 && reaction.y < 0);

  for (let age = 16; reaction && age <= 640; age += 16) {
    reaction = dampDragReaction(reaction, reversed, age, 16);
  }
  assert.equal(reaction, undefined);
});
