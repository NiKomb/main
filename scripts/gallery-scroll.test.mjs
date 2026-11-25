import assert from 'node:assert/strict';
import test from 'node:test';
import { galleryScrollFrame } from '../src/components/gallery-scroll.ts';
import { trackCaseGalleryScroll } from '../src/effects/mascot/case-route.ts';

const frameDuration = 1000 / 60;

test('dragging eases toward the pointer without applying release velocity', () => {
  const frame = galleryScrollFrame(100, 150, 12, 400, frameDuration, true);
  assert.equal(frame.target, 150);
  assert.equal(frame.velocity, 12);
  assert.ok(frame.scrollLeft > 100 && frame.scrollLeft < 150);
});

test('release coasts in the drag direction and stops at either edge', () => {
  for (const direction of [-1, 1]) {
    const limit = 400;
    const position = direction === 1 ? 350 : 50;
    let frame = galleryScrollFrame(position, position, 24 * direction, limit, frameDuration, false);
    assert.ok((frame.scrollLeft - position) * direction > 0);
    assert.ok(Math.abs(frame.velocity) < 24);
    for (let index = 0; index < 100 && !frame.settled; index++) {
      frame = galleryScrollFrame(frame.scrollLeft, frame.target, frame.velocity, limit, frameDuration, false);
    }
    assert.equal(frame.scrollLeft, direction === 1 ? limit : 0);
    assert.equal(frame.velocity, 0);
    assert.equal(frame.settled, true);
  }
});

test('subpixel easing settles even when the browser rounds scroll positions', () => {
  let position = 98;
  for (let index = 0; index < 3; index++) {
    position = Math.round(galleryScrollFrame(position, 100, 0, 400, frameDuration / 2, false).scrollLeft);
  }
  assert.equal(position, 100);
});

test('the mascot waits through a held drag, a reversal and release inertia', () => {
  let dragging = true;
  const gallery = { scrollLeft: 0, clientWidth: 350, hasAttribute: (name) => name === 'data-dragging' && dragging };
  const scroll = trackCaseGalleryScroll(gallery);

  gallery.scrollLeft = 180;
  assert.deepEqual(scroll.read(0), { changed: true, fast: true, dragging: true, settled: false });
  assert.equal(scroll.read(200).settled, false);

  gallery.scrollLeft = 70;
  assert.equal(scroll.read(215).fast, false);
  dragging = false;
  gallery.scrollLeft = 35;
  assert.equal(scroll.read(240).settled, false);
  assert.equal(scroll.read(339).settled, false);
  assert.equal(scroll.read(340).settled, true);

  gallery.scrollLeft = 0;
  scroll.reset();
  assert.deepEqual(scroll.read(350), { changed: false, fast: false, dragging: false, settled: true });
});
