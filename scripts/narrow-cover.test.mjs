import assert from 'node:assert/strict';
import test from 'node:test';
import { secondCaseId, selectMascotStop, selectNarrowCover } from '../src/effects/mascot/narrow-cover.ts';

test('the mascot moves to the next visible cover after scrolling past the upper threshold', () => {
  const first = { top: 132, bottom: 328 };
  const second = { top: 402, bottom: 598 };
  assert.equal(selectNarrowCover([first, second], 700, false), first);

  const scrolledFirst = { top: 35, bottom: 231 };
  const scrolledSecond = { top: 305, bottom: 501 };
  assert.equal(selectNarrowCover([scrolledFirst, scrolledSecond], 700, false), scrolledSecond);
  assert.equal(selectNarrowCover([first, second], 700, false), first);
});

test('a short page can reach the last visible cover and ignores covers outside the viewport', () => {
  const first = { top: 118, bottom: 314 };
  const second = { top: 388, bottom: 584 };
  const beyond = { top: 660, bottom: 856 };
  assert.equal(selectNarrowCover([first, second, beyond], 600, true), second);
  assert.equal(selectNarrowCover([beyond], 600, false), undefined);
});

test('a fast scroll to the preview gives the second case its full stop before the preview reply', () => {
  const first = { id: 'project-dns', top: -224 };
  const second = { id: secondCaseId, top: 144 };
  const preview = { id: 'project-preview', top: 512 };
  const routes = [first, second, preview];

  assert.deepEqual(selectMascotStop(routes, preview, false, 68), { stop: second, commentId: second.id });
  assert.deepEqual(selectMascotStop(routes, preview, true, 68), { stop: preview, commentId: preview.id });
  assert.deepEqual(selectMascotStop(routes, first, false, 68), { stop: first, commentId: first.id });
});

test('the mascot shows an outstanding comment at the preview if the second stop is too high', () => {
  const second = { id: secondCaseId, top: 12 };
  const preview = { id: 'project-preview', top: 380 };

  assert.deepEqual(selectMascotStop([second, preview], preview, false, 68), { stop: preview, commentId: second.id });
  assert.deepEqual(selectMascotStop([preview], preview, false, 68), { stop: preview, commentId: preview.id });
  assert.deepEqual(selectMascotStop([second], second, false, 68), { stop: second, commentId: second.id });
});
