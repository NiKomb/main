import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runnerImport } from 'vite';

const { module: { CaseCard } } = await runnerImport('./src/components/CaseCard.tsx');
const { module: { CaseCardList, CaseResults } } = await runnerImport('./src/components/CaseCardList.tsx');
const { module: { CaseDecisionCopy } } = await runnerImport('./src/components/CaseDecisionCopy.tsx');
const { module: { CaseEvidence } } = await runnerImport('./src/components/CaseEvidence.tsx');

test('the shared evidence toggle is marked as a row finish outside the ordinary surfaces', () => {
  const markup = renderToStaticMarkup(createElement(CaseEvidence, {
    headingId: 'research', heading: 'Research', introduction: 'Interviews',
    panelId: 'quotes', panelTitle: 'Quotes', evidence: 'Interview quotes',
  }));

  assert.match(markup, /<section[^>]*data-mascot-finish-group=""/);
  assert.match(markup, /<button[^>]*aria-expanded="false"[^>]*aria-controls="quotes"[^>]*data-mascot-finish-button=""/);
  assert.doesNotMatch(markup, /<button[^>]*data-mascot-surface/);
});

test('decision cards mark both surfaces through their shared component', () => {
  const markup = renderToStaticMarkup(createElement(CaseDecisionCopy, {
    hypothesisNumber: 1,
    hypothesis: createElement('blockquote', null, 'Hypothesis'),
    solution: createElement('p', null, 'Solution'),
  }));

  assert.match(markup, /<div[^>]*data-mascot-row=""/);
  assert.match(markup, /<div[^>]*data-mascot-surface="card"><blockquote>Hypothesis/);
  assert.match(markup, /<div[^>]*data-mascot-surface="card"><p>Solution/);
});

test('results automatically continue to the end of the row', () => {
  const card = createElement(CaseCard, { as: 'li', comment: 'sample', highlight: true }, 'Metric');
  const results = renderToStaticMarkup(createElement(CaseResults, { 'aria-label': 'Results' }, card));
  const list = renderToStaticMarkup(createElement(CaseCardList, { as: 'ol' }, card));

  assert.match(results, /<ul[^>]*data-mascot-row=""[^>]*data-mascot-group=""/);
  assert.match(results, /<li[^>]*data-mascot-surface="card"[^>]*data-mascot-comment="sample"[^>]*data-mascot-highlight=""/);
  assert.match(list, /<ol[^>]*data-mascot-group=""/);
  assert.doesNotMatch(list, /data-mascot-row/);
});
