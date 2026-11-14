import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveBasePath } from './base-path.mjs';

test('local and GitHub user sites use the root', () => {
  assert.equal(resolveBasePath(), '/');
  assert.equal(resolveBasePath({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'nikomb/nikomb.github.io' }), '/');
});
test('project sites use the repository path', () => {
  assert.equal(resolveBasePath({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'nikomb/portfolio' }), '/portfolio/');
});
test('explicit path supports a custom domain and normalizes trailing slash', () => {
  assert.equal(resolveBasePath({ PAGES_BASE_PATH: '/', GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'nikomb/portfolio' }), '/');
  assert.equal(resolveBasePath({ PAGES_BASE_PATH: '/portfolio' }), '/portfolio/');
});
test('invalid paths fail before publishing broken URLs', () => {
  for (const value of ['', 'portfolio', '//example.org/', '/a/../', '/a?b/', 'https://example.org/']) {
    assert.throws(() => resolveBasePath({ PAGES_BASE_PATH: value }));
  }
});
