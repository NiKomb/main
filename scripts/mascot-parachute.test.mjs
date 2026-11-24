import assert from 'node:assert/strict';
import test from 'node:test';
import { clampParachute, createParachuteGlide, createParachuteTrack, noteParachuteScrollInput, parachuteFrame, parachuteGlideArea,
  stepParachuteGlide, visibleParachuteEdge } from '../src/effects/mascot/parachute-flight.ts';

test('a clipped right edge cannot launch the parachute', () => {
  const gallery = { left: 20, right: 370, top: 100, bottom: 280 };
  assert.equal(visibleParachuteEdge({ right: 420, top: 100 }, gallery, 390, 800), undefined);
  assert.equal(visibleParachuteEdge({ right: 360, top: 99 }, gallery, 390, 800), undefined);
  assert.equal(visibleParachuteEdge({ right: 370, top: 100 }, gallery, 390, 800), 370);
  assert.equal(visibleParachuteEdge({ right: 390, top: 100 }, undefined, 390, 800), 390);
});

test('the flip carries the mascot toward the middle of the gutter and falls under gravity', () => {
  const start = { x: 460, y: 180 };
  const track = createParachuteTrack(start, 740, 1280, 900, 900);
  assert.deepEqual(track.position(0), start);
  const takeoffTime = track.frames.slice(0, track.frames.findIndex(({ row, column }) => row === 0 && column === 1))
    .reduce((sum, { hold }) => sum + hold, 0);
  const openTime = track.frames.slice(0, track.frames.findIndex(({ row }) => row === 1))
    .reduce((sum, { hold }) => sum + hold, 0);
  const takeoff = track.position(takeoffTime);
  const open = track.position(openTime);
  assert.equal(takeoff.x + 36, 740);
  assert.ok(track.position(takeoffTime + 125).y < start.y);
  assert.ok(track.position(openTime - 50).y < open.y);
  assert.equal(track.hover.x + 36, (900 + 1280) / 2);
  assert.ok((open.x - takeoff.x) / (track.hover.x - takeoff.x) > .7);
  const previous = track.position(openTime - 1);
  const next = track.position(openTime + 1);
  assert.ok(Math.abs((next.x - open.x) - (open.x - previous.x)) < .002);
  assert.ok(Math.abs((next.y - open.y) - (open.y - previous.y)) < .002);
  const duration = track.frames.reduce((total, { hold }) => total + hold, 0);
  const end = parachuteFrame(track, duration - 1);
  assert.ok(Math.hypot(end.x - track.hover.x, end.y - track.hover.y) < .001);
  assert.equal(parachuteFrame(track, duration), undefined);
});

test('a viewport-edge takeoff still finishes with the entire canopy in view', () => {
  const track = createParachuteTrack({ x: 318, y: 680 }, 390, 390, 760, 370);
  assert.ok(track.position(110).x > 318);
  assert.deepEqual(track.hover, { x: 258, y: 632 });
  assert.deepEqual(clampParachute(track.hover, 320, 420), { x: 212, y: 340 });
});

test('a button takeoff pushes off from a single point and opens the parachute inside the viewport', () => {
  for (const [x, width, contentRight] of [[1034, 1440, 1090], [314, 390, 370]]) {
    const start = { x, y: 167 };
    const track = createParachuteTrack(start, x + 36, width, 844, contentRight);

    assert.deepEqual(track.frames[0], { hold: 56, column: 0, row: 0 });
    assert.deepEqual(track.position(55), start);
    assert.ok(track.position(120).y < start.y);
    assert.ok(track.hover.x - 36 >= 0 && track.hover.x + 108 <= width);
  }
});

test('one ordinary scroll produces a banked arc that continues after input stops', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const glide = createParachuteGlide();
  stepParachuteGlide(glide, area, 90, 16);
  assert.equal(glide.maneuver.kind, 'arc');
  const arc = Array.from({ length: 50 }, () => stepParachuteGlide(glide, area, 0, 16));
  assert.ok(arc[16].x > area.center.x + 25 && arc[16].tilt > 8);
  assert.ok(arc[24].y > area.center.y + 40);
  assert.ok(arc[33].x < area.center.x - 15);
  assert.ok(Math.abs(arc.at(-1).y - area.center.y) < 5);
  stepParachuteGlide(glide, area, -80, 16);
  const uphill = Array.from({ length: 23 }, () => stepParachuteGlide(glide, area, 0, 16)).at(-1);
  assert.ok(uphill.y < area.center.y - 38);
});

test('a sustained fast swipe starts one wider loop inside the gutter', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const glide = createParachuteGlide();
  for (let frame = 0; frame < 5; frame++) {
    noteParachuteScrollInput(glide, 'touch');
    stepParachuteGlide(glide, area, 48, 16);
  }
  assert.equal(glide.maneuver.kind, 'turn');
  const loop = Array.from({ length: 75 }, (_, frame) => stepParachuteGlide(glide, area, frame < 20 ? 40 : 0, 16));
  assert.ok(loop[17].y > area.center.y + 60);
  assert.ok(Math.min(...loop.slice(30, 45).map(({ x }) => x)) < area.center.x - 52);
  assert.ok(loop[53].y < area.center.y - 60);
  assert.ok(loop.every(({ x }) => x - 36 >= 1090 && x + 108 <= 1440));
  assert.equal(glide.maneuver, undefined);
  const exit = glide.offset.x;
  stepParachuteGlide(glide, area, 0, 16);
  assert.ok(glide.offset.x > 0 && glide.offset.x < exit);
  for (let frame = 0; frame < 20; frame++) stepParachuteGlide(glide, area, 0, 16);
  assert.ok(Math.hypot(glide.offset.x, glide.offset.y, glide.offset.tilt) < .1);
});

test('reversing scroll carries the previous movement and bank before bending back', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const glide = createParachuteGlide();
  stepParachuteGlide(glide, area, 90, 16);
  for (let frame = 0; frame < 14; frame++) stepParachuteGlide(glide, area, 0, 16);
  stepParachuteGlide(glide, area, -90, 16);
  const atReversal = { ...glide.offset };
  assert.equal(glide.maneuver.direction, -1);
  stepParachuteGlide(glide, area, 0, 16);
  assert.ok(glide.offset.y > atReversal.y && glide.offset.tilt > atReversal.tilt);
  for (let frame = 0; frame < 14; frame++) stepParachuteGlide(glide, area, 0, 16);
  assert.ok(glide.offset.y < 0 && glide.offset.tilt < 0);
});

test('large wheel notches and short pixel scrolls keep the ordinary arc', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const glide = createParachuteGlide();
  noteParachuteScrollInput(glide, 'wheel-step');
  stepParachuteGlide(glide, area, 350, 16);
  assert.equal(glide.maneuver.kind, 'arc');
  noteParachuteScrollInput(glide, 'wheel-step');
  for (let frame = 0; frame < 7; frame++) stepParachuteGlide(glide, area, -55, 16);
  assert.equal(glide.maneuver.kind, 'arc');
  assert.equal(glide.maneuver.direction, -1);
  for (let frame = 0; frame < 3; frame++) {
    noteParachuteScrollInput(glide, 'pixel-wheel');
    stepParachuteGlide(glide, area, 52, 16);
  }
  assert.equal(glide.maneuver.kind, 'arc');
  for (let frame = 0; frame < 2; frame++) {
    noteParachuteScrollInput(glide, 'pixel-wheel');
    stepParachuteGlide(glide, area, 52, 16);
  }
  assert.equal(glide.maneuver.kind, 'turn');
});
