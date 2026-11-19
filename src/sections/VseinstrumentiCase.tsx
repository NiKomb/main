import type { ReactNode } from 'react';
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
            <button className="dns-case-jump" type="button" onClick={() => jumpToHeading('vi-solutions')}>К решениям</button>
            <button className="dns-case-jump" type="button" onClick={() => jumpToHeading('vi-test')}>К результатам UX-теста</button>
          </div>
        </section>
      </header>

      <section className="case-content-section dns-case-section" aria-labelledby="vi-audit">
        <p className="dns-case-divider">Погружение</p>
        <div className="vi-case-group">
          <div className="dns-case-block">
            <h2 id="vi-audit" tabIndex={-1}>Условия приходилось выяснять по ходу оформления</h2>
            <p>{audit.introduction}</p>
          </div>
          <ul className="dns-case-stages dns-case-results">
            {audit.findings.map(({ title, detail }) => (
              <li className="dns-case-fact" key={title}>
                <h3 className="dns-case-fact-title">{title}</h3>
                <p>{detail}</p>
              </li>
            ))}
          </ul>
          <div className="dns-case-block vi-case-subtopic">
            <h3 id="vi-competitors" tabIndex={-1}>Как показывают условия в других сервисах</h3>
            <ul className="dns-case-stages dns-case-results">
              {audit.competitors.map(({ title, detail }) => (
                <li className="dns-case-fact" key={title}>
                  <h4 className="dns-case-fact-title">{title}</h4>
                  <p>{detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="vi-solutions">
        <h2 id="vi-solutions" className="dns-case-divider" tabIndex={-1}>Решения</h2>
        <div className="dns-case-subsections">
          {viDecisions.map(({ id, title, hypothesis, solution, frames }) => (
            <section className="vi-case-group" key={id} aria-labelledby={id}>
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
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="vi-scenario">
        <p className="dns-case-divider">Сценарий</p>
        <div className="vi-case-group">
          <div className="dns-case-block">
            <h2 id="vi-scenario" tabIndex={-1}>От генератора в корзине до запроса расчёта</h2>
            <p>{scenario.intro}</p>
          </div>
          <ol className="dns-case-frames" data-media-gallery>
            {viScenario.map((frame) => <li key={frame.src}>{renderFigure(frame)}</li>)}
          </ol>
        </div>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="vi-test">
        <p className="dns-case-divider">Немодерируемый UX-тест</p>
        <div className="vi-case-group">
          <div className="dns-case-block">
            <h2 id="vi-test" tabIndex={-1}>Как участники оформляли доставку</h2>
            <p>{test.introduction}</p>
            <p>{test.criteria}</p>
          </div>
          <ul className="dns-case-stages dns-case-results" aria-label={`Результаты на ${test.date}`}>
            <li className="dns-case-fact dns-case-metric">
              <h3>{ratio(test.success)}</h3>
              <p>Оформили все товары с подходящим способом получения</p>
            </li>
            <li className="dns-case-fact dns-case-metric" data-mascot-comment="test-lifting">
              <h3>{ratio(test.critical)}</h3>
              <p>Подтвердили курьера, хотя для заказа был недоступен необходимый подъём</p>
            </li>
            <li className="dns-case-fact dns-case-metric">
              <h3>{ratio(test.unresolved)}</h3>
              <p>Оставил одну единицу товара без оформления</p>
            </li>
          </ul>
          <div className="dns-case-block">
            <p>{test.limitations}</p>
          </div>
        </div>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="vi-followup">
        <p className="dns-case-divider">После теста</p>
        <div className="vi-case-group">
          <div className="dns-case-block">
            <h2 id="vi-followup" tabIndex={-1}>Уточнил подсказки про подъём и согласование</h2>
            <p>{followup.introduction}</p>
          </div>
          <div className="dns-case-frames" data-media-gallery data-mascot-comment="followup">
            {viFollowupFigures.map((frame) => <div key={frame.src}>{renderFigure(frame)}</div>)}
          </div>
          <div className="dns-case-block vi-case-subtopic">
            <h3>Что проверю дальше</h3>
            <p>{followup.next}</p>
          </div>
        </div>
      </section>
    </>
  );
}
