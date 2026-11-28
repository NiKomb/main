import assert from 'node:assert/strict';
import test from 'node:test';
import { clampParachute, createParachuteGlide, createParachuteTrack, createParachuteTrigger, noteParachuteScrollInput,
  parachuteFrame, parachuteGlideArea, stepParachuteGlide, visibleParachuteEdge } from '../src/effects/mascot/parachute-flight.ts';

test('the third click launches once per case opening', () => {
  const track = createParachuteTrack({ x: 100, y: 200 }, 740, 1280, 900, 900);

  for (const thirdClickCanLaunch of [true, false]) {
    const onClick = createParachuteTrigger();
    for (let click = 0; click < 2; click++) assert.equal(onClick(() => track), undefined);

    if (!thirdClickCanLaunch) assert.equal(onClick(() => undefined), undefined);
    assert.equal(onClick(() => track), track);
    assert.equal(onClick(() => track), undefined);
  }
});

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

test('one ordinary scroll banks into a descending arc and settles at the new position', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const glide = createParachuteGlide();
  const start = stepParachuteGlide(glide, area, 90, 16);
  const arc = Array.from({ length: 90 }, () => stepParachuteGlide(glide, area, 0, 16));
  const end = arc.at(-1);

  assert.ok(arc[8].x > start.x && arc[8].tilt > 7);
  assert.ok(arc[8].y > start.y && arc[8].y < end.y);
  assert.ok(arc.every(({ x, y, tilt }, i) => i === 0 ||
    (x >= arc[i - 1].x && y >= arc[i - 1].y && tilt >= 0)));
  assert.ok(end.x - start.x >= 20 && end.x - start.x <= 30);
  assert.ok(end.y - start.y > 12);
  assert.ok(Math.abs(end.tilt) < .1);
  assert.ok(Math.hypot(end.x - arc[79].x, end.y - arc[79].y) < .1);
});

test('a sustained swipe extends the same descending arc within the gutter', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const glide = createParachuteGlide();
  const arc = Array.from({ length: 90 }, (_, frame) => {
    if (frame < 12) noteParachuteScrollInput(glide, 'touch');
    return stepParachuteGlide(glide, area, frame < 12 ? 48 : 0, 16);
  });
  const end = arc.at(-1);

  assert.ok(end.x > area.center.x + 50 && end.y > area.center.y + 35);
  assert.ok(arc.every(({ x, y, tilt }, i) => i === 0 ||
    (x >= arc[i - 1].x && y >= arc[i - 1].y && tilt >= 0)));
  assert.ok(arc.every(({ x }) => x - 36 >= 1090 && x + 108 <= 1440));
  assert.ok(Math.abs(end.tilt) < .1);
});

test('a touch swipe still widens the drift when scroll events arrive at a lower frame rate', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const glide = createParachuteGlide();
  for (let frame = 0; frame < 7; frame++) {
    noteParachuteScrollInput(glide, 'touch');
    stepParachuteGlide(glide, area, 36, 50);
  }
  const end = stepParachuteGlide(glide, area, 0, 1500);
  assert.ok(end.x > area.center.x + 50 && end.y > area.center.y + 35);
});

test('reversing scroll carries the previous drift and bank, then steers back while descending', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const glide = createParachuteGlide();
  stepParachuteGlide(glide, area, 90, 16);
  for (let frame = 0; frame < 7; frame++) stepParachuteGlide(glide, area, 0, 16);
  const reversal = stepParachuteGlide(glide, area, -90, 16);
  const carry = stepParachuteGlide(glide, area, 0, 16);
  assert.ok(carry.x > reversal.x && carry.tilt > 0);

  const returnArc = Array.from({ length: 30 }, () => stepParachuteGlide(glide, area, 0, 16));
  assert.ok(returnArc[12].x < reversal.x && returnArc[12].tilt < 0);
  assert.ok(returnArc.every(({ y }, i) => y >= (returnArc[i - 1]?.y ?? carry.y)));
});

test('a large wheel notch or short pixel scroll moves less than a sustained trackpad swipe', () => {
  const area = parachuteGlideArea(320, 1090, 1440, 900);
  const finish = (kind, samples) => {
    const glide = createParachuteGlide();
    for (let frame = 0; frame < samples; frame++) {
      noteParachuteScrollInput(glide, kind);
      stepParachuteGlide(glide, area, kind === 'wheel-step' ? 350 : 52, 16);
    }
    return stepParachuteGlide(glide, area, 0, 1500).x - area.center.x;
  };

  assert.ok(finish('wheel-step', 1) < 30);
  assert.ok(finish('pixel-wheel', 3) < 30);
  assert.ok(finish('pixel-wheel', 5) > 50);
});

test('a tight gutter retains the bank without needing horizontal space', () => {
  const area = parachuteGlideArea(260, 246, 390, 740);
  const glide = createParachuteGlide();
  stepParachuteGlide(glide, area, -90, 16);
  const arc = Array.from({ length: 90 }, () => stepParachuteGlide(glide, area, 0, 16));
  assert.ok(arc.every(({ x }) => x === area.center.x));
  assert.ok(arc[8].tilt < -7);
  assert.ok(arc.at(-1).y > area.center.y + 12);
  assert.ok(Math.abs(arc.at(-1).tilt) < .1);
});
