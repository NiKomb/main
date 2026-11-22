import type { ReactNode } from 'react';
import { CaseSection } from '../components/CaseSection';
import { GridIcon } from '../components/GridIcon';
import type { CaseFigure } from '../data/dnsCase';
import type { ProjectImage } from '../data/projects';
import { viCase, viDecisions, viFollowupFigures, viScenario } from '../data/vseinstrumentiCase';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
};

export function VseinstrumentiCase({ jumpToHeading, renderScreenshot }: Props) {
  const { audit, followup, scenario, summary, test } = viCase;
  const ratio = (count: number) => `${count} из ${test.runs}`;

  function renderFigure(frame: CaseFigure) {
    return (
      <figure className="dns-case-figure" data-mascot-comment={frame.comment}>
        {renderScreenshot(frame)}
        <figcaption>
          {frame.label && <strong>{frame.label}</strong>}
          {frame.caption}
        </figcaption>
      </figure>
    );
  }

  return (
    <>
      <header className="case-text dns-case-overview">
        <p className="dns-case-project">ВсеИнструменты · Мобильное оформление</p>
        <h1 id="projects-heading" tabIndex={-1}>{viCase.title}</h1>
        <p>{viCase.introduction}</p>
        <dl className="dns-case-meta">
          <div><dt>Мой вклад</dt><dd>{viCase.role}</dd></div>
          <div><dt>Статус</dt><dd>{viCase.status}</dd></div>
          <div className="dns-case-meta-results">
            <dt>Немодерируемый UX-тест</dt>
            <dd>{ratio(test.success)} участников выбрали подходящее получение для всех товаров</dd>
          </div>
        </dl>
        <section className="dns-case-summary" aria-labelledby="vi-summary" data-mascot-comment="intro">
          <h2 id="vi-summary">Кейс за минуту</h2>
          <dl>
            <div><dt>Задача</dt><dd>{summary.task}</dd></div>
            <div><dt>Решение</dt><dd>{summary.solution}</dd></div>
            <div><dt>Проверка</dt><dd>{summary.check}</dd></div>
            <div><dt>Следующий шаг</dt><dd>{summary.next}</dd></div>
          </dl>
          <div className="project-links">
            <button className="dns-case-jump" type="button" onClick={() => jumpToHeading('vi-solutions')}>К решениям<GridIcon name="link" /></button>
            <button className="dns-case-jump" type="button" onClick={() => jumpToHeading('vi-test')}>К результатам UX-теста<GridIcon name="link" /></button>
          </div>
        </section>
      </header>

      <CaseSection id="vi-audit" title="Условия приходилось выяснять по ходу оформления" dividerLabel="Погружение">
        <div className="dns-case-subsections">
          <div className="dns-case-block">
            <p>{audit.introduction}</p>
            <ul className="dns-case-stages dns-case-results">
              {audit.findings.map(({ title, detail }) => (
                <li className="dns-case-fact" key={title}>
                  <p className="dns-case-fact-title">{title}</p>
                  <p>{detail}</p>
                </li>
              ))}
            </ul>
          </div>
          <section className="dns-case-block" aria-labelledby="vi-competitors">
            <h3 id="vi-competitors" tabIndex={-1}>Как показывают условия в других сервисах</h3>
            <p>{audit.competitors.introduction}</p>
            <ul className="dns-case-stages dns-case-results">
              {audit.competitors.findings.map(({ title, detail }) => (
                <li className="dns-case-fact" key={title}>
                  <p className="dns-case-fact-title">{title}</p>
                  <p>{detail}</p>
                </li>
              ))}
            </ul>
            <p>{audit.competitors.takeaway}</p>
          </section>
        </div>
      </CaseSection>

      <CaseSection id="vi-solutions" title="Решения">
        <div className="dns-case-subsections">
          {viDecisions.map(({ id, title, hypothesis, solution, frames }) => (
            <section className="dns-case-group" key={id} aria-labelledby={id}>
              <div className="dns-case-block">
                <h3 id={id}>{title}</h3>
                <p><strong>Гипотеза.</strong> {hypothesis}</p>
                <p>{solution}</p>
              </div>
              <div className="dns-case-frames" data-media-gallery>
                {frames.map((frame) => <div key={frame.src}>{renderFigure(frame)}</div>)}
              </div>
            </section>
          ))}
        </div>
      </CaseSection>

      <CaseSection id="vi-scenario" title="От генератора в корзине до запроса расчёта" dividerLabel="Сценарий">
        <div className="dns-case-block">
          <p>{scenario.intro}</p>
          <ol className="dns-case-frames" data-media-gallery>
            {viScenario.map((frame) => <li key={frame.src}>{renderFigure(frame)}</li>)}
          </ol>
        </div>
      </CaseSection>

      <CaseSection id="vi-test" title="Как участники оформляли доставку" dividerLabel="Немодерируемый UX-тест">
        <div className="dns-case-group">
          <div className="dns-case-block">
            <p>{test.introduction}</p>
            <p>{test.criteria}</p>
          </div>
          <ul className="dns-case-stages dns-case-results" aria-label={`Результаты на ${test.date}`}>
            <li className="dns-case-fact dns-case-metric">
              <p className="dns-case-metric-value">{ratio(test.success)}</p>
              <p>Оформили все товары с подходящим способом получения</p>
            </li>
            <li className="dns-case-fact dns-case-metric" data-mascot-comment="test-lifting">
              <p className="dns-case-metric-value">{ratio(test.critical)}</p>
              <p>Подтвердили курьера, хотя для заказа был недоступен необходимый подъём</p>
            </li>
            <li className="dns-case-fact dns-case-metric">
              <p className="dns-case-metric-value">{ratio(test.unresolved)}</p>
              <p>Оставил одну единицу товара без оформления</p>
            </li>
          </ul>
          <div className="dns-case-block">
            <p>{test.limitations}</p>
          </div>
        </div>
      </CaseSection>

      <CaseSection id="vi-followup" title="Уточнил подсказки про подъём и согласование" dividerLabel="После теста">
        <div className="dns-case-subsections">
          <div className="dns-case-block">
            <p>{followup.introduction}</p>
            <div className="dns-case-frames" data-media-gallery data-mascot-comment="followup">
              {viFollowupFigures.map((frame) => <div key={frame.src}>{renderFigure(frame)}</div>)}
            </div>
          </div>
          <div className="dns-case-block">
            <h3>Что проверю дальше</h3>
            <p>{followup.next}</p>
          </div>
        </div>
      </CaseSection>
    </>
  );
}
