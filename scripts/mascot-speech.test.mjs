import assert from 'node:assert/strict';
import test from 'node:test';
import { caseRouteComment } from '../src/effects/mascot/case-comments.ts';
import { caseMascotDropZone, caseMascotParking, routeViewportLimits, caseRowRoute, caseSurfacesInJumpRange,
  nextCaseSurfaceToRight, recordCaseScrollStep,
  rightmostCaseSurface, sameCaseRow, selectRouteSurface } from '../src/effects/mascot/case-route.ts';
import { speechAvoidanceOffset, speechPlacement, speechPosition, speechSides, speechWasInterrupted } from '../src/effects/mascot/speech-position.ts';
import movement from '../src/effects/mascot/sprite-fusion-movement.ts';

test('drop zones use both axes of the current case column', () => {
  const column = { left: 240, right: 980, top: 240, bottom: 450 };
  assert.equal(caseMascotDropZone(239, 100, column), 'left');
  assert.equal(caseMascotDropZone(981, 800, column), 'right');
  assert.equal(caseMascotDropZone(500, 345, column), 'route');
  assert.equal(caseMascotDropZone(500, 239, column), undefined);
  assert.equal(caseMascotDropZone(500, 451, column), undefined);
  assert.equal(caseMascotDropZone(500, 239, { ...column, top: 100 }), 'route');
});

test('parking centers in wide fields and clears contacts when the left field is narrow', () => {
  const desktop = { left: 240, right: 980 };
  assert.deepEqual(caseMascotParking('left', desktop, 1220, 900, 72, 15), { point: { x: 84, y: 828 }, step: 8 });
  assert.deepEqual(caseMascotParking('right', desktop, 1220, 900, 72, 15), { point: { x: 1064, y: 828 }, step: 8 });
  const wideContacts = { left: 20, top: 840, right: 102, bottom: 880 };
  assert.deepEqual(caseMascotParking('left', desktop, 1220, 900, 72, 15, wideContacts), { point: { x: 117, y: 828 }, step: 0 });
  const mobile = { left: 20, right: 370 };
  const contacts = { left: 20, top: 760, right: 60, bottom: 860 };
  assert.deepEqual(caseMascotParking('left', mobile, 390, 880, 72, 15, contacts), { point: { x: 0, y: 673 }, step: 0 });
  assert.deepEqual(caseMascotParking('right', mobile, 390, 880, 72, 15, contacts), { point: { x: 318, y: 808 }, step: 0 });
});

test('speech grows toward the grid from a mascot near the right edge', () => {
  const position = speechPosition({ x: 896, top: 510, bottom: 578 }, { top: 48, width: 944 }, 900);
  assert.equal(position.above, true);
  assert.equal(position.y, 502);
  for (const width of [24, 640, 944]) {
    const left = (944 - width) * position.alignment / 100;
    assert.ok(left >= 0 && left + width <= 944);
  }
});

test('speech prefers a close right-side placement whenever the whole message fits', () => {
  const mascot = { left: 800, right: 872 };
  assert.deepEqual(speechSides(mascot, 160, 1048)[0], { anchor: 876, alignment: 0, maxWidth: 160 });
  assert.deepEqual(speechSides(mascot, 160, 1000)[0], { anchor: 796, alignment: 100, maxWidth: 784 });
  assert.deepEqual(speechSides({ left: 100, right: 172 }, 244, 390)[0],
    { anchor: 176, alignment: 0, maxWidth: 202 });
});

test('speech uses the left side when visible text occupies the space to the right', () => {
  const mascot = { left: 350, right: 422, top: 200, bottom: 272 };
  const columns = speechSides(mascot, 180, 900).map((column) => ({ ...column, width: 180, height: 60 }));
  assert.deepEqual(speechPlacement(columns, mascot, 600, []), { ...columns[0], top: 206 });
  assert.deepEqual(speechPlacement(columns, mascot, 600, [
    { left: 480, right: 560, top: 202, bottom: 275 },
  ]), { ...columns[1], top: 206 });
});

test('speech finds a nearby row when metric text blocks both centered placements', () => {
  const mascot = { left: 678, right: 750, top: 168, bottom: 250 };
  const columns = speechSides(mascot, 244, 1100).map((column) => ({ ...column, width: 244, height: 80 }));
  assert.deepEqual(speechPlacement(columns, mascot, 900, [
    { left: 746, right: 980, top: 145, bottom: 240 },
    { left: 430, right: 670, top: 150, bottom: 245 },
    { left: 430, right: 670, top: 260, bottom: 460 },
  ]), { ...columns[0], top: 244 });
});

test('speech can reject a blocked placement without moving away from the mascot', () => {
  const mascot = { left: 350, right: 422, top: 200, bottom: 272 };
  const columns = speechSides(mascot, 180, 900).map((column) => ({ ...column, width: 180, height: 60 }));
  const obstacles = [{ left: 0, right: 900, top: 180, bottom: 350 }];
  assert.equal(speechPlacement(columns, mascot, 600, obstacles).top, 206);
  assert.equal(speechPlacement(columns, mascot, 600, obstacles, false), undefined);
});

test('speech opens below a mascot near the top and stays hidden outside the viewport', () => {
  const anchor = { x: 175, top: 56, bottom: 124 };
  assert.deepEqual(speechPosition(anchor, { top: -24, width: 350 }, 600), {
    y: 132, alignment: 50, above: false,
  });
  assert.equal(speechPosition(anchor, { top: -140, width: 350 }, 600), null);
  assert.equal(speechPosition(anchor, { top: 600, width: 350 }, 600), null);
});

test('a narrow layout puts speech over the cover when it fits below the mascot', () => {
  const anchor = { x: 175, top: -68, bottom: 0 };
  assert.equal(speechPosition(anchor, { top: 500, width: 350 }, 844, true).above, false);
  assert.equal(speechPosition(anchor, { top: 500, width: 350 }, 600, true).above, true);
});

test('scroll censors replaced or hidden speech only while it is typing', () => {
  assert.equal(speechWasInterrupted(undefined, 'Next reply'), false);
  assert.equal(speechWasInterrupted('Reply', 'Reply'), false);
  assert.equal(speechWasInterrupted('Reply', 'Next reply'), true);
  assert.equal(speechWasInterrupted('Reply', undefined), true);
});

test('speech flips to the opposite side only when that clears a control and fits the viewport', () => {
  const mascot = { top: 200, bottom: 272 };
  const above = { left: 20, right: 120, top: 162, bottom: 192 };
  const below = { ...above, top: 280, bottom: 310 };
  assert.equal(speechAvoidanceOffset(above, above, mascot, true, 500), 118);
  assert.equal(speechAvoidanceOffset(below, below, mascot, false, 500), -118);
  assert.equal(speechAvoidanceOffset(above, { ...above, left: 125 }, mascot, true, 500), 0);
  assert.equal(speechAvoidanceOffset(above, { ...above, bottom: 295 }, mascot, true, 500), 0);
  assert.equal(speechAvoidanceOffset(above, above, mascot, true, 300), 0);
});

test('hovered text moves speech only when the pointer is inside the covered area', () => {
  const mascot = { top: 200, bottom: 272 };
  const bubble = { left: 20, right: 120, top: 162, bottom: 192 };
  const text = { left: 10, right: 250, top: 172, bottom: 190 };
  assert.equal(speechAvoidanceOffset(bubble, text, mascot, true, 500, { x: 45, y: 180 }), 118);
  assert.equal(speechAvoidanceOffset(bubble, text, mascot, true, 500, { x: 180, y: 180 }), 0);
});

test('a case comment follows the current stop and its closest marked group', () => {
  function tile(comment, parent) {
    return {
      closest(selector) {
        assert.equal(selector, '[data-mascot-comment]');
        return comment ? this : parent?.closest(selector);
      },
      getAttribute() { return comment; },
    };
  }
  const intro = tile('intro');
  const journal = tile('journal');
  const labelledCard = tile('details', journal);
  const silent = tile();
  const comments = { intro: 'Intro', journal: 'Journal', details: 'Details' };
  assert.deepEqual(
    [intro, tile(undefined, journal), labelledCard, silent, intro].map(stop => caseRouteComment(stop, comments)),
    ['Intro', 'Journal', 'Details', undefined, 'Intro'],
  );
});

test('the case route uses the middle seventy percent of the viewport and leaves room for the contents', () => {
  assert.deepEqual(routeViewportLimits(900), { top: 135, bottom: 765 });
  assert.deepEqual(routeViewportLimits(2160), { top: 324, bottom: 1836 });
  assert.deepEqual(routeViewportLimits(844, 168), { top: 168, bottom: 717.4 });
});

test('fast scroll exceeds half the viewport in either direction and discards stale steps or reversals', () => {
  for (const direction of [-1, 1]) {
    const steps = [];
    assert.equal(recordCaseScrollStep(steps, direction * 225, 0, 900), false);
    assert.equal(recordCaseScrollStep(steps, direction * 225, 140, 900), false);
    assert.equal(recordCaseScrollStep(steps, direction * 224, 180, 900), false);
    assert.equal(recordCaseScrollStep(steps, direction, 190, 900), false);
    assert.equal(recordCaseScrollStep(steps, direction, 195, 900), true);
    assert.equal(recordCaseScrollStep(steps, 0, 200, 900), false);
    assert.equal(recordCaseScrollStep(steps, -direction * 225, 205, 900), false);
    assert.equal(recordCaseScrollStep(steps, -direction * 226, 220, 900), true);
    assert.equal(recordCaseScrollStep(steps, -direction * 451, 325, 900), true);
  }
});

test('vertical transitions can jump a wider horizontal gap than tiles on the same level', () => {
  const gallery = { left: 942, right: 1042, y: 460 };
  const row = { left: 575, right: 793, y: 168 };

  assert.equal(caseSurfacesInJumpRange(gallery, row, 900), true);
  assert.equal(caseSurfacesInJumpRange(row, gallery, 900), true);
  assert.equal(caseSurfacesInJumpRange(gallery, { ...row, y: 460 }, 900), false);
  assert.equal(caseSurfacesInJumpRange(gallery, { ...row, right: 781 }, 900), false);
  assert.equal(caseSurfacesInJumpRange(gallery, row, 550), false);
});

test('case movement selects the topmost row in the band or holds its visible target', () => {
  const limits = routeViewportLimits(900);
  const group = {};
  const screen = { tile: {}, group, kind: 'screen', top: 360, left: 10, right: 280 };
  const adjacent = { tile: {}, group, kind: 'screen', top: 360.5, left: 304, right: 580 };
  const distant = { ...adjacent, left: 400, right: 650 };
  const card = { tile: {}, group: {}, kind: 'card', top: 765, left: 10, right: 280 };
  const upperCard = { ...card, top: 135 };
  const aboveBand = { ...upperCard, top: 134 };
  const belowBand = { ...card, top: 766 };
  assert.equal(selectRouteSurface([card, screen], limits, card), screen);
  assert.equal(selectRouteSurface([card, screen, upperCard], limits, screen), upperCard);
  assert.equal(selectRouteSurface([aboveBand, card, belowBand], limits, aboveBand), card);
  assert.equal(selectRouteSurface([aboveBand, belowBand], limits, aboveBand), aboveBand);
  assert.equal(selectRouteSurface([aboveBand, belowBand], limits), undefined);
  assert.equal(selectRouteSurface([screen, adjacent, card], limits, adjacent), adjacent);
  const labelled = { ...adjacent, hasOwnComment: true };
  assert.equal(selectRouteSurface([screen, labelled, card], limits, screen), labelled);
  assert.equal(sameCaseRow(screen, adjacent), true);
  assert.equal(sameCaseRow(screen, { ...adjacent, top: 390 }), false);
  assert.equal(nextCaseSurfaceToRight(screen, [card, distant, adjacent]), adjacent);
  assert.equal(nextCaseSurfaceToRight(screen, [card, distant]), undefined);
  assert.equal(rightmostCaseSurface(screen, [card, distant, adjacent]), distant);
});

test('metric rows traverse adjacent tiles to the right and stop on their own last tile', () => {
  const group = {};
  const tile = (left, top) => ({ tile: {}, group, kind: 'card', left, right: left + 250, top });
  const left = tile(320, 180);
  const middle = tile(578, 180);
  const right = tile(836, 180);
  const nextLeft = tile(320, 340);
  const nextRight = tile(578, 340);
  const tiles = [left, right, middle, nextLeft, nextRight];

  assert.equal(nextCaseSurfaceToRight(left, tiles), middle);
  assert.equal(nextCaseSurfaceToRight(middle, tiles), right);
  assert.equal(nextCaseSurfaceToRight(right, tiles), undefined);
  assert.equal(rightmostCaseSurface(nextLeft, tiles), nextRight);
  assert.equal(nextCaseSurfaceToRight(nextLeft, tiles), nextRight);
  assert.equal(nextCaseSurfaceToRight(nextRight, tiles), undefined);
});

test('a full row keeps the chosen comment and progresses to the last card on the same line', () => {
  const group = { hasAttribute: (name) => name === 'data-mascot-row' };
  const tile = (left, top, hasOwnComment = false) => ({ tile: {}, group, kind: 'card', left, right: left + 250, top, hasOwnComment });
  const first = tile(320, 180);
  const commented = tile(578, 180, true);
  const last = tile(836, 180);
  const wrapped = tile(320, 340);
  const tiles = [first, commented, last, wrapped];

  assert.equal(selectRouteSurface(tiles, routeViewportLimits(900), last), commented);
  assert.deepEqual(caseRowRoute(commented, tiles, last), {
    current: last, finish: last, comment: commented.tile, stopAtComment: false,
  });
  assert.equal(caseRowRoute(commented, tiles, first).current, first);
  assert.equal(caseRowRoute(commented, tiles, wrapped).current, undefined);
  assert.equal(caseRowRoute(wrapped, tiles, last).finish, wrapped);

  group.hasAttribute = () => false;
  assert.deepEqual(caseRowRoute(commented, tiles, last), {
    current: undefined, finish: commented, comment: undefined, stopAtComment: true,
  });
});

test('blink vanishes at the origin and cues arrival on a different row', () => {
  const cues = [];
  const effect = movement({ kind: 'blink', x: 140, y: 420, to: 580, toY: 180,
    cue: (name, point) => cues.push([name, point]),
  });
  effect.update(0.31);
  assert.deepEqual(cues, [['vanish', undefined]]);
  effect.update(0.25);
  assert.deepEqual(cues[1], ['appear', { x: 580, y: 180 }]);
});

test('departure-only blink vanishes and finishes without a return cue', () => {
  const cues = [];
  const effect = movement({ kind: 'blink', departureOnly: true, cue: (name) => cues.push(name) });
  for (let frame = 0; frame < 180; frame++) effect.update(1 / 60);
  assert.deepEqual(cues, ['vanish']);
  assert.equal(effect.done(), true);
});
