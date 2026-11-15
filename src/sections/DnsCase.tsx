import { useState, type CSSProperties, type ReactNode } from 'react';
import { dnsCase, dnsDecisions, type CaseFigure } from '../data/dnsCase';
import type { ProjectImage } from '../data/projects';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
};

function DnsComparison({ frames, headingId, sliderLabel = 'Разделитель «Было / Стало»', renderScreenshot }: Pick<Props, 'renderScreenshot'> & {
  frames: readonly [CaseFigure, CaseFigure];
  headingId: string;
  sliderLabel?: string;
}) {
  const [position, setPosition] = useState(50);
  const [before, after] = frames;
  const style = { '--comparison-position': `${position}%` } as CSSProperties;

  return (
    <figure className="dns-case-figure" aria-labelledby={headingId}>
      <div className="case-cover dns-comparison-tile" data-media-gallery style={style}>
        <input className="dns-comparison-control" type="range" min="0" max="100" value={position}
          aria-label={sliderLabel}
          aria-valuetext={`Было — ${position}%, стало — ${100 - position}%`}
          onChange={(event) => setPosition(event.currentTarget.valueAsNumber)} />
        <div className="dns-comparison-frame" data-side="before" hidden={position === 0}>
          {renderScreenshot(before)}
        </div>
        <div className="dns-comparison-frame" data-side="after" hidden={position === 100}>
          {renderScreenshot(after)}
        </div>
        <span className="dns-comparison-divider" aria-hidden="true" />
        <span className="dns-comparison-handle" aria-hidden="true">
          <span className="pixel-chevron" />
          <span className="pixel-chevron" />
        </span>
      </div>
      <figcaption className="dns-case-frames">
        <span><strong>{before.label}</strong>{before.caption}</span>
        <span><strong>{after.label}</strong>{after.caption}</span>
      </figcaption>
    </figure>
  );
}

export function DnsCase({ jumpToHeading, renderScreenshot }: Props) {
  const { research, summary, comparison, scenario, test } = dnsCase;
  const [started, assembled, saved] = test.stages;

  function renderFigure(figure: CaseFigure) {
    return (
      <figure className="dns-case-figure" key={figure.src}>
        {renderScreenshot(figure)}
        <figcaption>
          {figure.label && <strong>{figure.label}</strong>}
          {figure.caption}
        </figcaption>
      </figure>
    );
  }

  return (
    <>
      <header className="case-text dns-case-overview">
        <p className="dns-case-project">DNS · Конфигуратор ПК</p>
        <h1 id="projects-heading" tabIndex={-1}>{dnsCase.title}</h1>
        <p>{dnsCase.introduction}</p>
        <dl className="dns-case-meta">
          <div><dt>Мой вклад</dt><dd>{dnsCase.role}</dd></div>
          <div><dt>Статус</dt><dd>{dnsCase.status}</dd></div>
        </dl>
        <section className="dns-case-summary" aria-labelledby="dns-summary">
          <h2 id="dns-summary">Кейс за минуту</h2>
          <dl>
            <div><dt>Задача</dt><dd>{summary.task}</dd></div>
            <div><dt>Решение</dt><dd>{summary.solution}</dd></div>
            <div>
              <dt>Проверка</dt>
              <dd>Из {started.count} начатых прохождений в {assembled.count} подобрали все пять деталей, в {saved.count} — сохранили сборку</dd>
            </div>
            <div>
              <dt>Следующий шаг</dt>
              <dd>Сравнить заметность входа, выяснить роль статей и разобрать прохождения без сохранения</dd>
            </div>
          </dl>
          <button className="dns-case-jump" type="button" onClick={() => jumpToHeading('dns-results')}>
            К результатам UX-теста <span aria-hidden="true">↓</span>
          </button>
        </section>
      </header>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-research">
        <h2 id="dns-research" tabIndex={-1}>{research.title}</h2>
        <h3>{research.auditTitle}</h3>
        <p>{research.audit}</p>
        <ol className="dns-case-flow" aria-label="Путь выбора комплектующего">
          {research.flow.map((step, index) => (
            <li key={step}>{index === 2 ? <strong>{step}</strong> : step}</li>
          ))}
        </ol>
        <h3>{research.sessionsTitle}</h3>
        <p>{research.sessions}</p>
        <div className="dns-case-frames" data-media-gallery role="group" aria-label={research.framesTitle}>
          {research.frames.map(renderFigure)}
        </div>
        <h3>{research.conclusionTitle}</h3>
        <ul className="dns-case-points">
          {research.priorities.map(({ title, text }) => <li key={title}><strong>{title}</strong> {text}</li>)}
        </ul>
        <p>{research.deferred}</p>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-hypotheses">
        <h2 id="dns-hypotheses" tabIndex={-1}>{dnsCase.hypothesesTitle}</h2>
        <p>{dnsCase.hypothesesIntro}</p>
        <div className="dns-case-hypotheses">
          {dnsDecisions.map((decision) => (
            <div key={decision.id} className="dns-case-hypothesis">
              <h3>
                <button className="dns-case-jump" type="button" onClick={() => jumpToHeading(decision.id)}>
                  {decision.title}
                </button>
              </h3>
              <p>{decision.hypothesis}</p>
              <p><strong>Что смотрел в тесте.</strong> {decision.signal}</p>
            </div>
          ))}
        </div>
        <p>{dnsCase.hypothesisLimit}</p>
      </section>

      {dnsDecisions.map((decision) => (
        <section className="case-content-section dns-case-section" key={decision.id} aria-labelledby={decision.id}>
          <h2 id={decision.id} tabIndex={-1}>{decision.title}</h2>
          {decision.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {decision.id === 'dns-comparison' && (
            <>
              <h3 id="dns-comparison-changes">{comparison.title}</h3>
              <DnsComparison frames={comparison.frames} headingId="dns-comparison-changes" renderScreenshot={renderScreenshot} />
              <h3 id="dns-comparison-iteration">{comparison.iteration.title}</h3>
              <p>{comparison.iteration.text}</p>
              <DnsComparison frames={comparison.iteration.frames} headingId="dns-comparison-iteration"
                sliderLabel="Разделитель «Было / Стало» для сравнения по наведению" renderScreenshot={renderScreenshot} />
              <p>{comparison.iteration.note}</p>
            </>
          )}
        </section>
      ))}

      <section className="case-content-section dns-case-section" aria-labelledby="dns-scenario">
        <h2 id="dns-scenario" tabIndex={-1}>{scenario.title}</h2>
        <p>{scenario.intro}</p>
        <ol className="dns-case-frames" data-media-gallery aria-labelledby="dns-scenario">
          {scenario.frames.map((frame) => <li key={frame.src}>{renderFigure(frame)}</li>)}
        </ol>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-results">
        <h2 id="dns-results" tabIndex={-1}>{test.title}</h2>
        <p>{test.intro}</p>
        <ol className="dns-case-stages" aria-label="От начала теста до сохранения сборки">
          {test.stages.map(({ count, label }) => <li key={label}><strong>{count}</strong><span>{label}</span></li>)}
        </ol>
        <p>{test.note}</p>
        <table className="dns-case-results">
          <thead><tr><th scope="col">Решение</th><th scope="col">Что зафиксировал журнал</th></tr></thead>
          <tbody>
            {dnsDecisions.map((decision) => (
              <tr key={decision.id}>
                <th scope="row">
                  <button className="dns-case-jump" type="button" onClick={() => jumpToHeading(decision.id)}>
                    {decision.title}
                  </button>
                </th>
                <td>{decision.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>{test.journalTitle}</h3>
        {renderFigure(test.journal)}
        <h3>Что проверю дальше</h3>
        <ul className="dns-case-points">
          {test.next.map((step) => <li key={step}>{step}</li>)}
        </ul>
      </section>
    </>
  );
}
