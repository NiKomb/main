import type { ReactNode } from 'react';
import { CaseEvidence } from '../components/CaseEvidence';
import { CaseCard } from '../components/CaseCard';
import { CaseCardList, CaseResults } from '../components/CaseCardList';
import { CaseDecisionCopy } from '../components/CaseDecisionCopy';
import { CaseHeading } from '../components/CaseHeading';
import { CaseSection } from '../components/CaseSection';
import { CaseTestAccounting } from '../components/CaseTestAccounting';
import { GridIcon } from '../components/GridIcon';
import { iconTilePress } from '../components/icon-tile-press';
import { renderCaseText } from '../components/renderCaseText';
import type { CaseFact } from '../data/dnsCase';
import { viAfterLink, viJournalLink, viPrototypeLink, type ProjectImage } from '../data/projects';
import { viCase, viContents, viDecisions } from '../data/vseinstrumentiCase';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
  renderScenario: (images: readonly ProjectImage[], label: string) => ReactNode;
  scenarioMedia: ReactNode;
};

function ViHeading({ id, as }: { id: string; as?: 'h2' | 'h3' }) {
  const entry = viContents.find((item) => item.id === id);
  if (!entry) return null;

  return <CaseHeading id={id} as={as} note={entry.note}>{entry.label}</CaseHeading>;
}

function renderHypothesis([before, emphasis, after]: readonly [string, string, string]) {
  return <p>{before}<span className="dns-copy-emphasis">{emphasis}</span>{after}</p>;
}

export function VseinstrumentiCase({ jumpToHeading, renderScreenshot, renderScenario, scenarioMedia }: Props) {
  const { audit, competitors, reflection, reviews, scenario, summary, test } = viCase;
  const reflectionHeading = viContents.find((item) => item.id === 'vi-followup');
  const ratio = (count: number) => `${count} из ${test.runs}`;

  function renderFact({ title, detail, highlight }: CaseFact) {
    return (
      <CaseCard as="li" className="dns-case-fact" key={title} highlight={highlight}>
        <p className="dns-case-fact-title">{title}</p>
        <p>{renderCaseText(detail)}</p>
      </CaseCard>
    );
  }

  return (
    <>
      <header className="case-text dns-case-overview">
        <p className="dns-case-project">ВсеИнструменты · Мобильное оформление</p>
        <h1 id="projects-heading" tabIndex={-1}>{viCase.title}</h1>
        <dl className="dns-case-meta">
          <div><dt>Мой вклад</dt><dd>{viCase.role}</dd></div>
          <div><dt>Статус</dt><dd>{viCase.status}</dd></div>
        </dl>
        <CaseCard as="section" className="dns-case-summary" aria-labelledby="vi-summary" comment="intro">
          <ViHeading id="vi-summary" as="h2" />
          <p className="dns-summary-context">{renderCaseText(summary.context)}</p>
          <dl>
            <div><dt>Проблема</dt><dd>{renderCaseText(summary.problem)}</dd></div>
            <div><dt>Решение</dt><dd>{renderCaseText(summary.solution)}</dd></div>
            <div>
              <dt>UX-тест</dt>
              <dd>{ratio(test.success)} участников оформили все товары с подходящим способом получения</dd>
            </div>
            <div><dt>Ограничения</dt><dd>{summary.limits}</dd></div>
          </dl>
          <div className="dns-summary-actions">
            <button className="icon-tile icon-tile--labeled icon-tile--secondary" {...iconTilePress} type="button" onClick={() => jumpToHeading('vi-solutions')}>
              <span className="icon-tile-label">К решениям</span>
            </button>
            <button className="icon-tile icon-tile--labeled icon-tile--secondary" {...iconTilePress} type="button" onClick={() => jumpToHeading('vi-test')}>
              <span className="icon-tile-label">К результатам UX-теста</span>
            </button>
            <a className="icon-tile icon-tile--labeled icon-tile--lit dns-summary-configurator" {...iconTilePress}
              href={viAfterLink.href} target="_blank" rel="noopener" data-track-id={viAfterLink.id}>
              <span className="icon-tile-label">{viPrototypeLink.label}<GridIcon name="link" /></span>
            </a>
          </div>
        </CaseCard>
      </header>

      <CaseSection id="vi-research" title={viCase.researchTitle}>
        <CaseEvidence headingId="vi-reviews" heading={<ViHeading id="vi-reviews" />}
          introduction={reviews.introduction} panelId="vi-review-quotes" panelTitle="Фрагменты пяти отзывов"
          evidence={reviews.quotes.map(({ title, quote }) => (
            <div className="case-evidence-entry" key={title}>
              <h5>{title}</h5>
              <blockquote><p>{quote}</p></blockquote>
            </div>
          ))}>
          <div className="dns-case-block">
            <CaseCardList aria-label="Наблюдения из отзывов">
              {reviews.findings.map(renderFact)}
            </CaseCardList>
            <p>{renderCaseText(reviews.conclusion)}</p>
          </div>
        </CaseEvidence>
        <section className="dns-case-group" aria-labelledby="vi-audit">
          <div className="dns-case-block">
            <ViHeading id="vi-audit" />
            <p>{audit.introduction}</p>
          </div>
          <div className="dns-case-block">
            <h4 id="vi-audit-problems">Где приходилось искать условия</h4>
            <CaseCardList aria-labelledby="vi-audit-problems">
              {audit.problems.map(renderFact)}
            </CaseCardList>
            <p>{renderCaseText(audit.conclusion)}</p>
          </div>
        </section>
        <section className="dns-case-group" aria-labelledby="vi-competitors">
          <div className="dns-case-block">
            <ViHeading id="vi-competitors" />
            <p>{competitors.introduction}</p>
          </div>
          <div className="dns-case-block">
            <CaseCardList aria-label="Наблюдения по конкурентам">
              {competitors.findings.map(renderFact)}
            </CaseCardList>
            <p>{renderCaseText(competitors.conclusion)}</p>
          </div>
        </section>
        <section className="dns-case-block" aria-labelledby="vi-hypotheses">
          <ViHeading id="vi-hypotheses" />
          <p>{viCase.prioritization}</p>
          <CaseCardList as="ol" className="vi-hypotheses" aria-labelledby="vi-hypotheses">
            {viDecisions.map(({ id, label, hypothesis, highlightHypothesis }) => (
              <CaseCard as="li" className="dns-case-fact" key={id} highlight={highlightHypothesis}>
                <p className="dns-case-fact-title">{label}</p>
                {renderHypothesis(hypothesis)}
              </CaseCard>
            ))}
          </CaseCardList>
        </section>
      </CaseSection>

      <CaseSection id="vi-solutions" title={viCase.decisionsTitle}>
        {viDecisions.map(({ id, title, hypothesis, highlightHypothesis, solution: [before, emphasis, after],
          comparison, scenario: steps, scenarioComment, testObservation }, index) => (
          <section className="dns-case-group" key={id} aria-labelledby={id}>
            <ViHeading id={id} />
            <div className="dns-case-frames" data-media-gallery>
              {comparison.map((frame, frameIndex) => (
                <figure className="dns-case-figure" key={frame.src} data-mascot-comment={frame.comment}>
                  {renderScreenshot(frame)}
                  <figcaption><strong>{frameIndex === 0 ? 'Было' : 'Стало'}</strong>{frame.caption}</figcaption>
                </figure>
              ))}
            </div>
            <figure className="dns-case-figure" data-mascot-comment={scenarioComment}>
              {renderScenario(steps, title)}
              <figcaption className="vi-scenario-captions">
                {steps.map(({ src, label, caption }) => (
                  <span key={src}>
                    <strong>{label}</strong>{caption}
                  </span>
                ))}
              </figcaption>
            </figure>
            <CaseDecisionCopy hypothesisNumber={index + 1} hypothesis={renderHypothesis(hypothesis)} highlightHypothesis={highlightHypothesis}
              solution={<p>{before}<strong className="dns-copy-emphasis">{emphasis}</strong>{after}</p>} />
            {testObservation && (
              <div className="dns-case-block">
                <h4 id={`${id}-result`}>Результат</h4>
                <CaseResults aria-labelledby={`${id}-result`}>
                  <CaseCard as="li" className="dns-case-fact dns-case-metric" comment="test-lifting" highlight>
                    <p className="dns-case-metric-value vi-case-critical">{ratio(testObservation.count)}</p>
                    <p>{testObservation.detail}</p>
                  </CaseCard>
                </CaseResults>
              </div>
            )}
          </section>
        ))}
      </CaseSection>

      <CaseSection id="vi-validation" title={test.title}>
        <section className="dns-case-group" aria-labelledby="vi-scenario">
          <div className="dns-case-block">
            <ViHeading id="vi-scenario" />
            {scenarioMedia}
          </div>
          <div className="dns-decision-copy">
            <div className="dns-case-block">
              <h4>Шаг покупателя</h4>
              <p>{scenario.action}</p>
            </div>
            <div className="dns-case-block">
              <h4>Результат</h4>
              <CaseCard as="p" highlight>{scenario.result}</CaseCard>
            </div>
          </div>
        </section>
        <section className="dns-case-block" aria-labelledby="vi-test">
          <ViHeading id="vi-test" />
          <p>{test.introduction}</p>
          <CaseCardList aria-label={`Результаты на ${test.date}`}>
            <CaseCard as="li" className="dns-case-fact dns-case-metric">
              <p className="dns-case-metric-value">{ratio(test.success)}</p>
              <p>Оформили все товары с подходящим способом получения</p>
            </CaseCard>
            <CaseCard as="li" className="dns-case-fact dns-case-metric" highlight>
              <p className="dns-case-metric-value vi-case-critical">{ratio(test.critical)}</p>
              <p>Подтвердили курьера, хотя нужный подъём был недоступен</p>
            </CaseCard>
            <CaseCard as="li" className="dns-case-fact dns-case-metric">
              <p className="dns-case-metric-value">{ratio(test.unresolved)}</p>
              <p>Одна единица товара осталась без оформления</p>
            </CaseCard>
          </CaseCardList>
          <p>{renderCaseText(test.conclusion)}</p>
          <p>{test.criteria}</p>
          <CaseTestAccounting text={test.accounting} journalHref={viJournalLink.href} />
        </section>
        <CaseSection id="vi-followup" as="h3" title={reflectionHeading?.label ?? 'Рефлексия'}
          variant="labeled" note={reflectionHeading?.note}>
          <div className="dns-case-block">
            <p>{reflection.summary}</p>
            <h4 id="vi-next-checks">Что проверю дальше</h4>
            <CaseCardList aria-labelledby="vi-next-checks">
              {reflection.nextChecks.map(renderFact)}
            </CaseCardList>
          </div>
        </CaseSection>
      </CaseSection>
    </>
  );
}
