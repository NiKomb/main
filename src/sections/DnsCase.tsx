import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { DnsScenario } from '../components/DnsScenario';
import { InterviewGallery } from '../components/InterviewGallery';
import { dnsCase, dnsDecisions, type CaseFact, type CaseFigure } from '../data/dnsCase';
import type { ProjectImage } from '../data/projects';
import { ComparisonParticles } from '../effects/case-pixels/ComparisonParticles';
import { comparisonSwapClips } from '../effects/case-pixels/pixel-swap';
import { ComparisonDivider } from '../effects/comparison-divider/ComparisonDivider';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
  earlyFact: RefObject<HTMLLIElement | null>;
  earlyFactBroken: boolean;
};

function renderCount({ count, label }: { count: number; label: string }) {
  return <li key={label}><strong>{count}</strong><span>{label}</span></li>;
}

function renderFact({ title, detail }: CaseFact) {
  return <li className="dns-case-fact" key={title}><h3>{title}</h3><p>{detail}</p></li>;
}

function DnsComparison({ frames, headingId, sliderLabel = 'Разделитель «Было / Стало»', renderScreenshot }: Pick<Props, 'renderScreenshot'> & {
  frames: readonly [CaseFigure, CaseFigure];
  headingId: string;
  sliderLabel?: string;
}) {
  const [position, setPosition] = useState(50);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const tile = useRef<HTMLDivElement>(null);
  const [before, after] = frames;
  const pixelSwapSupported = CSS.supports('clip-path', 'path(evenodd, "M0 0H1V1Z")');
  const clips = useMemo(
    () => pixelSwapSupported ? comparisonSwapClips(size.width, size.height, position) : undefined,
    [pixelSwapSupported, size, position],
  );
  const style = {
    '--comparison-position': `${position}%`,
    '--comparison-clip-before': clips?.near,
    '--comparison-clip-after': clips?.far,
  } as CSSProperties;

  useLayoutEffect(() => {
    const element = tile.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="dns-case-figure" aria-labelledby={headingId}>
      <div ref={tile} className="case-cover dns-comparison-tile" data-media-gallery data-pixel-swap={clips ? '' : undefined} style={style}>
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
        {pixelSwapSupported && <ComparisonParticles position={position} width={size.width} height={size.height} />}
        <ComparisonDivider position={position} width={size.width} height={size.height} />
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

export function DnsCase({ jumpToHeading, renderScreenshot, earlyFact, earlyFactBroken }: Props) {
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
          <div className="project-links">
            <button className="dns-case-jump" type="button" onClick={() => jumpToHeading(dnsDecisions[0].id)}>
              К решениям
            </button>
            <button className="dns-case-jump" type="button" onClick={() => jumpToHeading('dns-results')}>
              К результатам UX-теста
            </button>
          </div>
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
        <h3 className="dns-session-heading">{research.sessionsTitle}</h3>
        <p>{research.sessions}</p>
        <InterviewGallery label={research.framesTitle}>
          {research.frames.map(renderFigure)}
        </InterviewGallery>
        <ul className="dns-case-stages dns-case-facts" aria-label="Масштаб исследования">
          {research.sessionFacts.map(renderCount)}
        </ul>
        <h3>{research.conclusionTitle}</h3>
        <ul className="dns-case-points">
          {research.priorities.map(({ title, text }) => <li key={title}><strong>{title}</strong> {text}</li>)}
        </ul>
        <p>{research.deferred}</p>
      </section>

      {dnsDecisions.map((decision) => (
        <section className="case-content-section dns-case-section" key={decision.id} aria-labelledby={decision.id}>
          <h2 id={decision.id} tabIndex={-1}>{decision.title}</h2>
          <p>{decision.observation}</p>
          <p>{decision.solution}</p>
          <h3 id={`${decision.id}-changes`}>{decision.comparison.title}</h3>
          <DnsComparison frames={decision.comparison.frames} headingId={`${decision.id}-changes`} renderScreenshot={renderScreenshot} />
          <div className="dns-decision-check">
            <h3>Гипотеза. {decision.hypothesis}</h3>
            <p><strong>Что смотрел в тесте.</strong> {decision.signal}</p>
            <ul className="dns-case-stages dns-case-facts" aria-label="Факты итогового UX-теста">
              {decision.facts.map(renderFact)}
            </ul>
          </div>
          {decision.id === 'dns-comparison' && (
            <div className="dns-case-iteration">
              <h3 id="dns-comparison-iteration">{comparison.iteration.title}</h3>
              <p>{comparison.iteration.text}</p>
              <DnsComparison frames={comparison.iteration.frames} headingId="dns-comparison-iteration"
                sliderLabel="Разделитель «Было / Стало» для сравнения по наведению" renderScreenshot={renderScreenshot} />
              <ul className="dns-case-stages dns-case-facts" aria-label="Факт раннего теста">
                <li className="dns-case-fact" ref={earlyFact} data-rocket-broken={earlyFactBroken ? '' : undefined}>
                  <h3>{comparison.iteration.fact.title}</h3>
                  <p>{comparison.iteration.fact.detail}</p>
                </li>
              </ul>
            </div>
          )}
        </section>
      ))}

      <section className="case-content-section dns-case-section" aria-labelledby="dns-scenario">
        <h2 id="dns-scenario" tabIndex={-1}>{scenario.title}</h2>
        <p>{scenario.intro}</p>
        <DnsScenario steps={scenario.steps} renderScreenshot={renderScreenshot} />
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-results">
        <h2 id="dns-results" tabIndex={-1}>{test.title}</h2>
        <p>{test.intro}</p>
        <ol className="dns-case-stages" aria-label="От начала теста до сохранения сборки">
          {test.stages.map(renderCount)}
        </ol>
        <p>{test.note}</p>
        <h3 id="dns-hypotheses">{test.methodTitle}</h3>
        <p>{test.method}</p>
        <p>{test.methodLimit}</p>
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
