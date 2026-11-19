import assert from 'node:assert/strict';
import test from 'node:test';
import { caseRouteComment, metricCommentRightEdge } from '../src/effects/mascot/case-comments.ts';
import { caseRouteViewportLimits, nextCaseSurfaceToRight, rightmostCaseSurface, sameCaseRow, selectCaseSurface } from '../src/effects/mascot/case-route.ts';
import { speechPosition } from '../src/effects/mascot/speech-position.ts';
import movement from '../src/effects/mascot/sprite-fusion-movement.ts';

test('speech grows toward the grid from a mascot near the right edge', () => {
  const position = speechPosition({ x: 896, top: 510, bottom: 578 }, { top: 48, width: 944 }, 900);
  assert.equal(position.above, true);
  assert.equal(position.y, 502);
  for (const width of [24, 640, 944]) {
    const left = (944 - width) * position.alignment / 100;
    assert.ok(left >= 0 && left + width <= 944);
  }
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

test('the case route uses five percent of the viewport per edge and leaves room for the contents', () => {
  assert.deepEqual(caseRouteViewportLimits(900), { top: 45, bottom: 855 });
  assert.deepEqual(caseRouteViewportLimits(2160), { top: 108, bottom: 2052 });
  assert.deepEqual(caseRouteViewportLimits(844, 168), { top: 168, bottom: 801.8 });
});

test('the top gallery can host the mascot when the tall viewport puts it inside the opening margin', () => {
  assert.deepEqual(caseRouteViewportLimits(2160, 0, 80), { top: 80, bottom: 2052 });
  assert.deepEqual(caseRouteViewportLimits(900, 0, 80), { top: 45, bottom: 855 });
});

test('case movement selects a single row above the viewport midpoint', () => {
  const group = {};
  const screen = { tile: {}, group, kind: 'screen', top: 360, left: 10, right: 280 };
  const adjacent = { tile: {}, group, kind: 'screen', top: 360.5, left: 304, right: 580 };
  const distant = { ...adjacent, left: 400, right: 650 };
  const card = { tile: {}, group: {}, kind: 'card', top: 450, left: 10, right: 280 };
  const upperCard = { ...card, top: 120 };
  assert.equal(selectCaseSurface([card, screen], card, 900), screen);
  assert.equal(selectCaseSurface([card, screen, upperCard], screen, 900), upperCard);
  assert.equal(selectCaseSurface([upperCard, screen, card], screen, 900, true), card);
  assert.equal(selectCaseSurface([screen, adjacent, card], adjacent, 900), adjacent);
  const labelled = { ...adjacent, hasOwnComment: true };
  assert.equal(selectCaseSurface([screen, labelled, card], screen, 900), labelled);
  assert.equal(selectCaseSurface([labelled, screen, card], screen, 900, true), card);
  assert.equal(selectCaseSurface([{ ...screen, top: 451 }, card], undefined, 900), card);
  assert.equal(selectCaseSurface([{ ...screen, top: 451 }], undefined, 900), undefined);
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

test('a metric grid comment uses the last tile edge even when the row leaves an empty column', () => {
  const edge = (right) => ({ getBoundingClientRect: () => ({ right }) });
  const grid = edge(1120);
  const tile = edge(851);
  const check = edge(940);

  assert.equal(metricCommentRightEdge(tile, grid, null), 851);
  assert.equal(metricCommentRightEdge(edge(1120), grid, null), 1120);
  assert.equal(metricCommentRightEdge(tile, null, check), 940);
  assert.equal(metricCommentRightEdge(tile, null, null), undefined);
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
