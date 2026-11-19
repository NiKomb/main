import assert from 'node:assert/strict';
import test from 'node:test';
import { runnerImport } from 'vite';

const { module: { finishPreloader } } = await runnerImport(
  './src/effects/preloader/finish.ts', { configFile: false },
);

const progress = '--site-preloader-progress';

function setup({ reducedMotion = false, hidden = false, shown = true } = {}) {
  const animation = Promise.withResolvers();
  const starts = [];
  let removed = false;
  let inert = true;
  let reveals = 0;
  const motion = Object.assign(new EventTarget(), { matches: reducedMotion });
  const preloader = {
    dataset: {},
    querySelector: () => null,
    remove: () => { removed = true; },
    animate(keyframes) {
      starts.push(keyframes);
      return { finished: animation.promise, cancel() {} };
    },
  };
  const root = { removeAttribute: () => { inert = false; } };
  const page = Object.assign(new EventTarget(), {
    hidden,
    createElement: () => ({}),
    defaultView: Object.assign(new EventTarget(), {
      matchMedia: () => motion,
      getComputedStyle: () => ({ visibility: shown ? 'visible' : 'hidden', getPropertyValue: () => '83' }),
    }),
    getElementById(id) {
      if (id === 'site-preloader') return removed ? null : preloader;
      if (id === 'root') return root;
    },
  });
  return { page, motion, animation, starts, onReveal: () => { reveals++; }, state: () => ({ removed, inert, reveals }) };
}

test('the visible preloader goes from the current value to 100% before enabling the page', async () => {
  const { page, animation, starts, onReveal, state } = setup();
  finishPreloader(onReveal, page);

  assert.equal(starts.length, 1);
  assert.equal(starts[0].at(0)[progress], 83);
  assert.equal(starts[0].at(-1)[progress], 100);
  assert.deepEqual(state(), { removed: false, inert: true, reveals: 0 });

  animation.resolve();
  await animation.promise;
  assert.deepEqual(state(), { removed: true, inert: false, reveals: 1 });
});

test('a fast start, reduced motion or a hidden tab reveals the page immediately', () => {
  for (const options of [{ shown: false }, { reducedMotion: true }, { hidden: true }]) {
    const { page, starts, onReveal, state } = setup(options);
    finishPreloader(onReveal, page);
    assert.deepEqual(state(), { removed: true, inert: false, reveals: 1 });
    assert.equal(starts.length, 0);
  }
});

test('hiding the tab during the final run reveals the page once', async () => {
  const { page, animation, onReveal, state } = setup();
  finishPreloader(onReveal, page);
  page.hidden = true;
  page.dispatchEvent(new Event('visibilitychange'));
  animation.reject(new Error('Animation cancelled'));
  await assert.rejects(animation.promise);
  assert.deepEqual(state(), { removed: true, inert: false, reveals: 1 });
});
