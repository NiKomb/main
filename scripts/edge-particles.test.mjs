import assert from 'node:assert/strict';
import test from 'node:test';
import { particleFrame, releasedScrollCell } from '../src/effects/case-pixels/particles.ts';

test('slow scrolling staggers the release of squares across columns', () => {
  assert.equal(releasedScrollCell(5, 5, 3, 4), undefined);
  assert.equal(releasedScrollCell(4, 5, 0, 4), undefined);
  assert.deepEqual(releasedScrollCell(4, 5, 3, 4), { index: 2, distance: 0 });
  assert.deepEqual(releasedScrollCell(8, 7, 1, 4), { index: 2, distance: 0 });
});

test('detached squares keep shrinking, moving and fading as time advances', () => {
  assert.deepEqual(particleFrame(100, 100, 300, 4, -8), { size: 4, opacity: 1, offset: -0 });
  assert.deepEqual(particleFrame(250, 100, 300, 4, -8), { size: 2, opacity: .5, offset: -4 });
  assert.deepEqual(particleFrame(400, 100, 300, 4, -8), { size: 0, opacity: 0, offset: -8 });
  assert.deepEqual(particleFrame(400, 100, 600, 4, 8), { size: 2, opacity: .5, offset: 4 });
});
