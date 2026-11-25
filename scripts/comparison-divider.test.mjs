import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonCoastTarget } from '../src/effects/comparison-divider/use-comparison-position.ts';

test('release momentum follows the drag and stops at the range limits', () => {
  assert.equal(comparisonCoastTarget(50, .5, 600), 61);
  assert.equal(comparisonCoastTarget(50, -.5, 600), 39);
  assert.equal(comparisonCoastTarget(50, 3, 600), 64);
  assert.equal(comparisonCoastTarget(50, .08, 600), 50);
  assert.equal(comparisonCoastTarget(98, .8, 600), 100);
  assert.equal(comparisonCoastTarget(2, -.8, 600), 0);
});
