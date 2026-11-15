import assert from 'node:assert/strict';
import test from 'node:test';
import { readScroll } from '../src/effects/rocket-shot/reading-scroll.ts';

const visit = (previous, time, top, visibleRatio = 1) =>
  readScroll(previous, { time, top, scroll: 500 - top }, visibleRatio, 750);

test('the shot becomes eligible at one third of the reading height', () => {
  const reading = visit(undefined, 0, 275);
  const approach = visit(reading, 2000, 251);
  assert.equal(approach.atEdgeSince, undefined);
  const edge = visit(approach, 2050, 250);
  assert.equal(edge.fire, false);
  assert.equal(visit(edge, 2229, 250).fire, false);
  assert.equal(visit(edge, 2230, 250).fire, true);
});

test('a wheel step can cross the trigger line after a pause', () => {
  const reading = visit(undefined, 0, 315);
  const edge = visit(reading, 2000, 215);
  assert.equal(edge.fire, false);
  assert.equal(visit(edge, 2180, 215).fire, true);
});

test('brief pauses while scrolling past headings do not add up to reading', () => {
  const reading = visit(undefined, 0, 315);
  const smallMove = visit(reading, 700, 307);
  const drift = visit(smallMove, 1400, 298);
  const edge = visit(drift, 2000, 215);
  assert.equal(visit(edge, 2180, 215).fire, false);
});

test('a short pause or a mostly obscured block cannot arm the shot', () => {
  const shortPause = visit(undefined, 0, 315);
  const edge = visit(shortPause, 1999, 215);
  assert.equal(visit(edge, 2190, 215).fire, false);
  const obscured = visit(undefined, 0, 315, .79);
  const entered = visit(obscured, 2000, 215);
  assert.equal(visit(entered, 2190, 215).fire, false);
});

test('continued scrolling restarts the pause and passing the block cancels the shot', () => {
  const reading = visit(undefined, 0, 110);
  const edge = visit(reading, 2000, 50);
  const next = visit(edge, 2130, -20, .8);
  assert.equal(visit(next, 2180, -20, .8).fire, false);
  const passed = visit(next, 2210, -120, 0);
  assert.equal(visit(passed, 2450, -120, 0).fire, false);
});

test('a fly-by, a large jump, and a reversal do not launch Rocket', () => {
  const reading = visit(undefined, 0, 410);
  const unread = visit(visit(undefined, 0, 290), 400, 190);
  assert.equal(visit(unread, 1600, 190).fire, false);
  const jumped = visit(reading, 2000, 40);
  assert.equal(visit(jumped, 2250, 40).fire, false);
  const approached = visit(visit(undefined, 0, 260), 2000, 195);
  const reversed = visit(approached, 2050, 198);
  assert.equal(visit(reversed, 2250, 198).fire, false);
});
