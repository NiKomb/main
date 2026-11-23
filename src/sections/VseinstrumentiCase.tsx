import type { ReactNode } from 'react';
import { CaseHeading } from '../components/CaseHeading';
import { CaseSection } from '../components/CaseSection';
import { GridIcon } from '../components/GridIcon';
import { iconTilePress } from '../components/icon-tile-press';
import type { CaseFact } from '../data/dnsCase';
import type { ProjectImage } from '../data/projects';
import { viCase, viContents, viDecisions } from '../data/vseinstrumentiCase';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
  renderScenario: (images: readonly ProjectImage[], label: string) => ReactNode;
  scenarioMedia: ReactNode;
};

function ViHeading({ id, as, children }: { id: string; as?: 'h2' | 'h3'; children: ReactNode }) {
  const note = viContents.find((item) => item.id === id)?.note;
  return <CaseHeading id={id} as={as} note={note}>{children}</CaseHeading>;
}

function renderHypothesis([before, emphasis, after]: readonly [string, string, string]) {
  return <p>{before}<span className="dns-copy-emphasis">{emphasis}</span>{after}</p>;
}

export function VseinstrumentiCase({ jumpToHeading, renderScreenshot, renderScenario, scenarioMedia }: Props) {
  const { audit, reflection, reviews, scenario, summary, test } = viCase;
  const reflectionHeading = viContents.find((item) => item.id === 'vi-followup');
  const ratio = (count: number) => `${count} из ${test.runs}`;

  function renderFact({ title, detail }: CaseFact) {
    return (
      <li className="dns-case-fact" key={title}>
        <p className="dns-case-fact-title">{title}</p>
        <p>{detail}</p>
      </li>
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
        <section className="dns-case-summary" aria-labelledby="vi-summary" data-mascot-comment="intro">
          <ViHeading id="vi-summary" as="h2">Контекст</ViHeading>
          <p className="dns-summary-context">{summary.context}</p>
          <dl>
            <div><dt>Проблема</dt><dd>{summary.problem}</dd></div>
            <div><dt>Решение</dt><dd>{summary.solution}</dd></div>
            <div>
              <dt>UX-тест</dt>
              <dd>{ratio(test.success)} участников оформили все товары с подходящим способом получения</dd>
            </div>
            <div><dt>Ограничения</dt><dd>{summary.limits}</dd></div>
          </dl>
          <div className="dns-summary-actions">
            <button className="icon-tile icon-tile--labeled dns-brand-button" {...iconTilePress} type="button" onClick={() => jumpToHeading('vi-solutions')}>
              <span className="dns-brand-button-label">К решениям<GridIcon name="link" /></span>
            </button>
            <button className="icon-tile icon-tile--labeled dns-brand-button" {...iconTilePress} type="button" onClick={() => jumpToHeading('vi-test')}>
              <span className="dns-brand-button-label">К результатам UX-теста<GridIcon name="link" /></span>
            </button>
          </div>
        </section>
      </header>

      <CaseSection id="vi-research" title="Исследование">
        <section className="dns-case-block" aria-labelledby="vi-reviews">
          <ViHeading id="vi-reviews">Что покупатели выясняли после заказа</ViHeading>
          <p>{reviews.introduction}</p>
          <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения из отзывов">
            {reviews.findings.map(renderFact)}
          </ul>
        </section>
        <section className="dns-case-group" aria-labelledby="vi-audit">
          <div className="dns-case-block">
            <ViHeading id="vi-audit">Что было видно при выборе способа получения</ViHeading>
            <p>{audit.introduction}</p>
            <p>{audit.available}</p>
          </div>
          <div className="dns-case-block">
            <h4 id="vi-audit-problems">Где приходилось искать условия</h4>
            <ul className="dns-case-stages dns-case-results" aria-labelledby="vi-audit-problems">
              {audit.problems.map(renderFact)}
            </ul>
          </div>
        </section>
        <section className="dns-case-block" aria-labelledby="vi-competitors">
          <ViHeading id="vi-competitors">Как показывают условия в других сервисах</ViHeading>
          <p>{audit.competitors}</p>
        </section>
        <section className="dns-case-block" aria-labelledby="vi-hypotheses">
          <ViHeading id="vi-hypotheses">Какие гипотезы взял в прототип</ViHeading>
          <ol className="dns-case-stages dns-case-results vi-hypotheses" aria-labelledby="vi-hypotheses">
            {viDecisions.map(({ id, hypothesis }) => (
              <li className="dns-case-fact" key={id}>
                {renderHypothesis(hypothesis)}
              </li>
            ))}
          </ol>
        </section>
      </CaseSection>

      <CaseSection id="vi-solutions" title="Проектирование">
        {viDecisions.map(({ id, title, hypothesis, solution: [before, emphasis, after], comparison, scenario: steps, testObservation }, index) => (
          <section className="dns-case-group" key={id} aria-labelledby={id}>
            <ViHeading id={id}>{title}</ViHeading>
            <div className="dns-case-frames" data-media-gallery>
              {comparison.map((frame, frameIndex) => (
                <figure className="dns-case-figure" key={frame.src} data-mascot-comment={frame.comment}>
                  {renderScreenshot(frame)}
                  <figcaption><strong>{frameIndex === 0 ? 'Было' : 'Стало'}</strong>{frame.caption}</figcaption>
                </figure>
              ))}
            </div>
            <div className="dns-decision-copy">
              <div className="dns-case-block">
                <h4>Гипотеза {index + 1}</h4>
                {renderHypothesis(hypothesis)}
              </div>
              <div className="dns-case-block">
                <h4>Решение</h4>
                <p>{before}<strong className="dns-copy-emphasis">{emphasis}</strong>{after}</p>
              </div>
            </div>
            <figure className="dns-case-figure">
              {renderScenario(steps, title)}
              <figcaption className="vi-scenario-captions">
                {steps.map(({ src, label, caption, comment }) => (
                  <span key={src} data-mascot-comment={comment}>
                    <strong>{label}</strong>{caption}
                  </span>
                ))}
              </figcaption>
            </figure>
            {testObservation && (
              <div className="dns-case-block">
                <h4 id={`${id}-result`}>Результат</h4>
                <ul className="dns-case-stages dns-case-results" aria-labelledby={`${id}-result`}>
                  <li className="dns-case-fact dns-case-metric" data-mascot-comment="test-lifting">
                    <p className="dns-case-metric-value vi-case-critical">{ratio(testObservation.count)}</p>
                    <p>{testObservation.detail}</p>
                  </li>
                </ul>
              </div>
            )}
          </section>
        ))}
      </CaseSection>

      <CaseSection id="vi-validation" title="Немодерируемый UX-тест">
        <section className="dns-case-group" aria-labelledby="vi-scenario">
          <div className="dns-case-block">
            <ViHeading id="vi-scenario">От выбора доставки до запроса расчёта</ViHeading>
            {scenarioMedia}
          </div>
          <div className="dns-decision-copy">
            <div className="dns-case-block">
              <h4>Шаг покупателя</h4>
              <p>{scenario.action}</p>
            </div>
            <div className="dns-case-block">
              <h4>Результат</h4>
              <p>{scenario.result}</p>
            </div>
          </div>
        </section>
        <section className="dns-case-block" aria-labelledby="vi-test">
          <ViHeading id="vi-test">Как участники оформляли доставку</ViHeading>
          <p>{test.introduction}</p>
          <p>{test.criteria}</p>
          <p>{test.accounting}</p>
          <ul className="dns-case-stages dns-case-results" aria-label={`Результаты на ${test.date}`}>
            <li className="dns-case-fact dns-case-metric">
              <p className="dns-case-metric-value">{ratio(test.success)}</p>
              <p>Оформили все товары с подходящим способом получения</p>
            </li>
            <li className="dns-case-fact dns-case-metric">
              <p className="dns-case-metric-value vi-case-critical">{ratio(test.critical)}</p>
              <p>Подтвердили курьера, хотя нужный подъём был недоступен</p>
            </li>
            <li className="dns-case-fact dns-case-metric">
              <p className="dns-case-metric-value">{ratio(test.unresolved)}</p>
              <p>Одна единица товара осталась без оформления</p>
            </li>
          </ul>
        </section>
      </CaseSection>
      <CaseSection id="vi-followup" title={reflectionHeading?.label ?? 'Рефлексия'}
        variant="labeled" note={reflectionHeading?.note}>
        <div className="dns-case-block">
          <p>{reflection.summary}</p>
          <h3 id="vi-next-checks">Что проверю дальше</h3>
          <ul className="dns-case-stages dns-case-results" aria-labelledby="vi-next-checks">
            {reflection.nextChecks.map(renderFact)}
          </ul>
        </div>
      </CaseSection>
    </>
  );
}
