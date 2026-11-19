import assert from 'node:assert/strict';
import test from 'node:test';
import { paintDnsButtonGradient } from '../src/sections/dns-button-gradient.ts';

test('the DNS button blends five shades from left to right with dithered boundaries', () => {
  const width = 101;
  const height = 22;
  const dark = '#fc8507';
  const light = '#ffa218';
  const palette = [dark, ...[25, 50, 75].map(percent => `color-mix(in srgb, ${dark}, ${light} ${percent}%)`), light];
  const rows = Array.from({ length: height }, () => []);
  const context = {
    canvas: { width, height },
    fillRect(x, y, w, h) {
      assert.deepEqual([w, h], [1, 1]);
      rows[y][x] = this.fillStyle;
    },
  };
  paintDnsButtonGradient(context, dark, light);
  for (const row of rows) {
    assert.equal(row.length, width);
    assert.deepEqual([row[0], row[25], row[50], row[75], row[100]], palette);
  }
  for (const [column, lowerShade] of [[12, 0], [37, 1], [62, 2], [87, 3]]) {
    assert.deepEqual(new Set(rows.map(row => row[column])), new Set(palette.slice(lowerShade, lowerShade + 2)));
  }
});
