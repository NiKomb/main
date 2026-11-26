import assert from 'node:assert/strict';
import test from 'node:test';
import { reactToHomeScroll, selectHomeRoute } from '../src/effects/mascot/narrow-cover.ts';

const dns = { top: 120, bottom: 300 };
const vseinstrumenti = { top: 320, bottom: 480 };
const preview = { top: 500, bottom: 610 };
const covers = [dns, vseinstrumenti, preview];

test('home scroll reacts to a third of the new input and catches up in either direction', () => {
  const forward = reactToHomeScroll(120, 0, 0, 16);
  assert.ok(Math.abs(forward - 40) < 1e-10);
  const catchingUp = reactToHomeScroll(120, 120, forward, 70);
  assert.ok(catchingUp > forward && catchingUp < 120);
  assert.equal(reactToHomeScroll(120, 120, catchingUp, 500), 120);
  const backward = reactToHomeScroll(60, 120, 120, 16);
  assert.ok(Math.abs(backward - 100) < 1e-10);
  assert.equal(reactToHomeScroll(60, 60, backward, 500), 60);
});

test('the filtered home position guides intermediate stops while the real end takes priority', () => {
  assert.equal(selectHomeRoute(covers, 700, 90, 200, 45).cover, dns);
  assert.equal(selectHomeRoute(covers, 700, 90, 200, 90).cover, vseinstrumenti);
  assert.deepEqual(selectHomeRoute(covers, 700, 200, 200, 100), { cover: preview, atBottom: true });
});

test('home stops divide a short scroll range at 40 and 75 percent in both directions', () => {
  assert.equal(selectHomeRoute(covers, 700, 0, 200).cover, dns);
  assert.equal(selectHomeRoute(covers, 700, 79, 200).cover, dns);
  assert.equal(selectHomeRoute(covers, 700, 80, 200).cover, vseinstrumenti);
  assert.equal(selectHomeRoute(covers, 700, 149, 200).cover, vseinstrumenti);
  assert.deepEqual(selectHomeRoute(covers, 700, 150, 200), { cover: preview, atBottom: false });
  assert.equal(selectHomeRoute(covers, 700, 120, 200).cover, vseinstrumenti);
  assert.deepEqual(selectHomeRoute(covers, 700, 0, 0), { cover: dns, atBottom: false });
  assert.deepEqual(selectHomeRoute(covers, 700, 0, 1), { cover: dns, atBottom: false });
});

test('jumping straight to the end targets the viewport floor on desktop and without a preview', () => {
  assert.deepEqual(selectHomeRoute(covers, 700, 200, 200), { cover: preview, atBottom: true });
  assert.deepEqual(selectHomeRoute(covers.slice(0, 2), 700, 200, 200), { cover: vseinstrumenti, atBottom: true });
  assert.deepEqual(selectHomeRoute(covers, 700, 199, 200), { cover: preview, atBottom: true });
});

test('a section keeps its stop as soon as the top of its cover becomes visible on mobile', () => {
  const mobileSections = (scrollY) => [756, 1200].map((top) => ({ top: top - scrollY, bottom: top + 180 - scrollY }));
  const before = mobileSections(310);
  const after = mobileSections(375);

  assert.deepEqual(selectHomeRoute(before, 844, 310, 607), { cover: before[0], atBottom: false });
  assert.deepEqual(selectHomeRoute(after, 844, 375, 607), { cover: after[1], atBottom: false });
  const nearBottom = mobileSections(540);
  assert.deepEqual(selectHomeRoute(nearBottom, 844, 540, 607), { cover: nearBottom[1], atBottom: false });
});

test('the mascot uses the nearest earlier visible cover if the preview is outside the viewport', () => {
  assert.equal(selectHomeRoute(covers, 400, 150, 200).cover, vseinstrumenti);
  assert.equal(selectHomeRoute([{ top: -200, bottom: -20 }, vseinstrumenti], 400, 1, 200).cover, vseinstrumenti);
  assert.equal(selectHomeRoute([preview], 400, 150, 200).cover, undefined);
});
