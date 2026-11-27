import assert from 'node:assert/strict';
import test from 'node:test';
import { selectHomeRoute } from '../src/effects/mascot/case-route.ts';

const dns = { tile: {}, group: {} };
const vseinstrumenti = { tile: {}, group: {} };
const preview = { tile: {}, group: {} };
const coversAt = (scroll) => [
  { ...dns, top: 180 - scroll },
  { ...vseinstrumenti, top: 680 - scroll },
  { ...preview, top: 1180 - scroll },
];

test('home scrolling selects the uppermost cover in the same viewport band in both directions', () => {
  const viewportHeight = 800;
  const bottom = 1000;
  assert.equal(selectHomeRoute(coversAt(59), viewportHeight, 59, bottom, dns.tile).cover.tile, dns.tile);
  assert.equal(selectHomeRoute(coversAt(61), viewportHeight, 61, bottom, dns.tile).cover.tile, vseinstrumenti.tile);
  assert.equal(selectHomeRoute(coversAt(580), viewportHeight, 580, bottom, vseinstrumenti.tile).cover.tile, preview.tile);
  assert.equal(selectHomeRoute(coversAt(500), viewportHeight, 500, bottom, preview.tile).cover.tile, vseinstrumenti.tile);
});

test('home keeps a visible target when the band is empty and drops a target once its top leaves the viewport', () => {
  const covers = [{ ...dns, top: 70 }, { ...vseinstrumenti, top: 740 }];
  assert.equal(selectHomeRoute(covers, 800, 100, 500, vseinstrumenti.tile).cover, covers[1]);
  assert.equal(selectHomeRoute(covers, 800, 100, 500).cover, covers[0]);
  assert.equal(selectHomeRoute([{ ...dns, top: -1 }], 800, 100, 500, dns.tile).cover, undefined);
});

test('home preserves its first and last stops on screens with and without a preview', () => {
  const start = coversAt(0);
  assert.deepEqual(selectHomeRoute(start, 100, 0, 1000), { cover: start[0], atBottom: false });
  assert.deepEqual(selectHomeRoute(start, 1400, 0, 0), { cover: start[0], atBottom: false });

  const end = coversAt(999);
  assert.deepEqual(selectHomeRoute(end, 800, 999, 1000), { cover: end[2], atBottom: true });
  assert.deepEqual(selectHomeRoute(end.slice(0, 2), 800, 1000, 1000), { cover: end[1], atBottom: true });

  const narrowEnd = [{ ...dns, top: 201 }, { ...vseinstrumenti, top: 591 }];
  assert.equal(selectHomeRoute(narrowEnd, 844, 477, 479, dns.tile).cover, narrowEnd[0]);
  assert.deepEqual(selectHomeRoute(narrowEnd, 844, 479, 479, dns.tile), { cover: narrowEnd[1], atBottom: true });
});
