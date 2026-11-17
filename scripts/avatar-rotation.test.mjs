import assert from 'node:assert/strict';
import test from 'node:test';
import { connectAvatarRotation } from '../src/effects/profile-avatar/rotation.ts';

test('clicks switch immediately and restart the 30-second countdown', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const document = Object.assign(new EventTarget(), { hidden: false });
  let switches = 0;
  const rotation = connectAvatarRotation(document, () => switches++);

  t.mock.timers.tick(29_999);
  assert.equal(switches, 0);
  rotation.rotate();
  rotation.rotate();
  assert.equal(switches, 2);
  t.mock.timers.tick(29_999);
  assert.equal(switches, 2);
  t.mock.timers.tick(1);
  assert.equal(switches, 3);
  t.mock.timers.tick(30_000);
  assert.equal(switches, 4);
  rotation.disconnect();
});

test('hidden tabs and disconnected avatars leave no active timer', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const document = Object.assign(new EventTarget(), { hidden: false });
  let switches = 0;
  const rotate = () => switches++;
  const previous = connectAvatarRotation(document, rotate);
  previous.disconnect();
  const current = connectAvatarRotation(document, rotate);

  t.mock.timers.tick(30_000);
  assert.equal(switches, 1);
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(60_000);
  assert.equal(switches, 1);
  document.hidden = false;
  document.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(29_999);
  assert.equal(switches, 1);
  t.mock.timers.tick(1);
  assert.equal(switches, 2);
  current.disconnect();
  document.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(30_000);
  assert.equal(switches, 2);
});

test('the mascot can select the helmet, return to the default, and restart ordinary rotation', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const document = Object.assign(new EventTarget(), { hidden: false });
  const selections = [];
  const rotation = connectAvatarRotation(document, (target) => selections.push(target));

  t.mock.timers.tick(1_000);
  rotation.rotate(1);
  assert.deepEqual(selections, [1]);
  t.mock.timers.tick(500);
  rotation.rotate(0);
  assert.deepEqual(selections, [1, 0]);
  t.mock.timers.tick(29_999);
  assert.deepEqual(selections, [1, 0]);
  t.mock.timers.tick(1);
  assert.deepEqual(selections, [1, 0, undefined]);
  rotation.disconnect();
});
