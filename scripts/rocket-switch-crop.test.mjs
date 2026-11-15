import assert from 'node:assert/strict';
import test from 'node:test';
import { projectSwitch, switchCrop } from '../src/effects/rocket-shot/switch-crop.ts';

test('the divider at 50 percent exposes part of the switch on narrow and wide previews', () => {
  for (const width of [290, 350, 800]) {
    const preview = { left: width * .03, top: 80, width: width * .94 };
    const full = projectSwitch(preview, width * .70);
    assert.ok(Math.abs(full.sourceWidth - switchCrop.width) < .01);
    const partial = projectSwitch(preview, width * .50);
    assert.ok(partial.width > 0 && partial.width < full.width);
    assert.equal(partial.left + partial.width, width * .50);
    assert.equal(projectSwitch(preview, width * .45), undefined);
  }
});

test('the crop follows the displayed frame as it moves and scales', () => {
  const preview = { left: 10, top: 30, width: 2070 };
  assert.deepEqual(projectSwitch(preview, 2070), {
    left: preview.left + switchCrop.x / 2,
    top: preview.top + switchCrop.y / 2,
    width: switchCrop.width / 2,
    height: switchCrop.height / 2,
    sourceWidth: switchCrop.width,
  });
  assert.equal(projectSwitch({ ...preview, width: 0 }, 2070), undefined);
});
