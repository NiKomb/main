import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { DnsScenario } from '../components/DnsScenario';
import { InterviewGallery } from '../components/InterviewGallery';
import { iconTilePress } from '../components/icon-tile-press';
import { dnsCase, dnsDecisions, type CaseFact, type CaseFigure, type CaseMetric } from '../data/dnsCase';
import type { ProjectImage } from '../data/projects';
import { ComparisonParticles } from '../effects/case-pixels/ComparisonParticles';
import { comparisonSwapClips } from '../effects/case-pixels/pixel-swap';
import { ComparisonDivider } from '../effects/comparison-divider/ComparisonDivider';
import { RocketShot } from '../effects/rocket-shot/RocketShot';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
  rocketActor?: RefObject<HTMLSpanElement | null>;
};

function renderFact({ title, detail, comment }: CaseFact) {
  return <li className="dns-case-fact" key={title} data-mascot-comment={comment}><p className="dns-case-fact-title">{title}</p><p>{detail}</p></li>;
}

function renderMetric({ value, label, detail, comment }: CaseMetric) {
  return (
    <li className="dns-case-fact dns-case-metric" key={label} data-mascot-comment={comment}>
      <h3>{value}</h3>
      <div className="dns-case-metric-copy">
        <p className="dns-case-fact-title">{label}</p>
        {detail && <p>{detail}</p>}
      </div>
    </li>
  );
}

function renderDecisionCheck({ signal, metrics }: (typeof dnsDecisions)[number]) {
  return (
    <div className="dns-decision-check">
      <section className="dns-case-block">
        <h4>Что проверял</h4>
        <p className="dns-decision-tile">{signal}</p>
      </section>
      <section className="dns-case-block">
        <h4>Расчёт</h4>
        <ul className={metrics.length > 1 ? 'dns-decision-metrics' : 'dns-decision-tile'}>
          {metrics.map(renderMetric)}
        </ul>
      </section>
    </div>
  );
}

function DnsComparison({ frames, headingId, sliderLabel = 'Разделитель «Было / Стало»',
  renderScreenshot, rocketActor }: Pick<Props, 'renderScreenshot' | 'rocketActor'> & {
  frames: readonly [CaseFigure, CaseFigure];
  headingId: string;
  sliderLabel?: string;
}) {
  const [position, setPosition] = useState(50);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const tile = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const slideFrame = useRef(0);
  const afterLabel = useRef<HTMLElement>(null);
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

  const onImpact = useCallback(() => {
    const destination = 30;
    const from = slider.current?.valueAsNumber ?? destination;
    if (from <= destination) return;

    const started = performance.now();
    const move = (time: number) => {
      const progress = Math.min(1, Math.max(0, (time - started) / 320));
      setPosition(Math.round(destination + (from - destination) * (1 - progress) ** 3));
      if (progress < 1) slideFrame.current = requestAnimationFrame(move);
    };
    slideFrame.current = requestAnimationFrame(move);
  }, []);

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
    return () => {
      observer.disconnect();
      cancelAnimationFrame(slideFrame.current);
    };
  }, []);

  return (
    <figure className="dns-case-figure" aria-labelledby={headingId} data-mascot-comment={after.comment}>
      <div ref={tile} className="case-cover dns-comparison-tile" data-media-gallery data-pixel-swap={clips ? '' : undefined} style={style}>
        <input ref={slider} className="dns-comparison-control" {...iconTilePress} type="range" min="0" max="100" value={position}
          aria-label={sliderLabel}
          aria-valuetext={`Было — ${position}%, стало — ${100 - position}%`}
          onPointerDown={() => cancelAnimationFrame(slideFrame.current)}
          onChange={(event) => {
            cancelAnimationFrame(slideFrame.current);
            setPosition(event.currentTarget.valueAsNumber);
          }} />
        <div className="dns-comparison-frame" data-side="before" hidden={position === 0}>
          {renderScreenshot(before)}
        </div>
        <div className="dns-comparison-frame" data-side="after" hidden={position === 100}>
          {renderScreenshot(after)}
        </div>
        {pixelSwapSupported && <ComparisonParticles position={position} width={size.width} height={size.height} />}
        <ComparisonDivider position={position} width={size.width} height={size.height} />
        <span className="icon-tile dns-comparison-handle" aria-hidden="true">
          <span className="pixel-chevron" />
          <span className="pixel-chevron" />
        </span>
      </div>
      <figcaption className="dns-case-frames">
        <span><strong>{before.label}</strong>{before.caption}</span>
        <span><strong ref={afterLabel} className={rocketActor ? 'rocket-shot-caption' : undefined}>{after.label}</strong>{after.caption}</span>
      </figcaption>
      {rocketActor && <RocketShot target={afterLabel} comparison={tile} actor={rocketActor} onImpact={onImpact} />}
    </figure>
  );
}

export function DnsCase({ jumpToHeading, renderScreenshot, rocketActor }: Props) {
  const { sectionLabels, research, summary, comparison, scenario, quickChoice, test } = dnsCase;
  const { started, assembled, saved } = test.counts;

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
        <section className="dns-case-summary" aria-labelledby="dns-summary" data-mascot-comment="intro">
          <h2 id="dns-summary">Кейс за минуту</h2>
          <dl>
            <div><dt>Задача</dt><dd>{summary.task}</dd></div>
            <div><dt>Решение</dt><dd>{summary.solution}</dd></div>
            <div>
              <dt>Проверка</dt>
              <dd>Из {started} начатых прохождений в {assembled} подобрали все пять деталей, в {saved} — сохранили сборку</dd>
            </div>
            <div>
              <dt>Следующий шаг</dt>
              <dd>{summary.next}</dd>
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
        <p className="dns-case-divider">{sectionLabels.research}</p>
        <div className="dns-case-group">
          <h2 id="dns-research" tabIndex={-1}>{research.title}</h2>
          <div className="dns-case-subsections">
            <section className="dns-case-block">
              <h3>{research.discussionsTitle}</h3>
              {research.discussions.map((text) => <p key={text}>{text}</p>)}
              <ul className="dns-case-stages dns-case-results" aria-label="Цифры исследования обсуждений сборок" data-mascot-comment="external-review">
                {research.deskMetrics.map(renderMetric)}
              </ul>
            </section>
            <section className="dns-case-block">
              <h3>{research.auditTitle}</h3>
              <p>{research.audit}</p>
              <ol className="dns-case-flow" aria-label="Путь выбора комплектующего">
                {research.flow.map((step, index) => (
                  <li key={step}>
                    {step}
                    {index < research.flow.length - 1 && <span className="pixel-chevron dns-case-flow-chevron" aria-hidden="true" />}
                  </li>
                ))}
              </ol>
            </section>
            <section className="dns-case-group" aria-labelledby="dns-interviews">
              <h3 className="dns-case-divider" id="dns-interviews">{sectionLabels.interviews}</h3>
              <section className="dns-case-block" data-mascot-comment="moderator-hint">
                <h4>{research.sessionsTitle}</h4>
                {research.sessions.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                <InterviewGallery label={research.framesTitle}>
                  {research.frames.map(renderFigure)}
                </InterviewGallery>
              </section>
              {research.findings.map(({ title, passages }) => (
                <section className="dns-case-block" key={title}>
                  <h4>{title}</h4>
                  {passages.map((passage) => passage.text !== undefined
                    ? <p key={passage.text}>{passage.text}</p>
                    : <blockquote key={passage.quote} data-mascot-comment="interview-quotes"><p>{passage.quote}</p></blockquote>)}
                </section>
              ))}
            </section>
            <section className="dns-case-block">
              <h3>{research.competitors.title}</h3>
              <p>{research.competitors.intro}</p>
              <InterviewGallery label={research.competitors.title}>
                {research.competitors.frames.map(renderFigure)}
              </InterviewGallery>
            </section>
            <section className="dns-case-block">
              <h3>{research.prioritization.title}</h3>
              <p>{research.prioritization.intro}</p>
              {renderFigure(research.prioritization.evidence)}
              <ul className="dns-case-stages dns-case-results" aria-label="Потребности, которые взял в работу">
                {research.prioritization.selected.map(renderFact)}
              </ul>
              <p>{research.prioritization.deferred}</p>
            </section>
          </div>
        </div>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-decisions">
        <h2 className="dns-case-divider" id="dns-decisions">{sectionLabels.decisions}</h2>
        <div className="dns-case-subsections">
          {dnsDecisions.map((decision) => (
            <section className="dns-case-group" key={decision.id} aria-labelledby={decision.id}>
              <div className="dns-case-block">
                <h3 id={decision.id} tabIndex={-1}>{decision.title}</h3>
                {decision.observation && <p>{decision.observation.text}</p>}
                <p>{decision.solution}</p>
              </div>
              <section className="dns-case-block" data-mascot-comment={decision.observation?.comment}>
                <h4 id={`${decision.id}-changes`}>{decision.comparison.title}</h4>
                {decision.id === 'dns-articles' && renderDecisionCheck(decision)}
                <DnsComparison frames={decision.comparison.frames} headingId={`${decision.id}-changes`} renderScreenshot={renderScreenshot} />
                {decision.id === 'dns-comparison' && (
                  <div className="dns-case-frames" data-media-gallery>
                    {comparison.buttonFrames.map(renderFigure)}
                  </div>
                )}
              </section>
              {decision.id !== 'dns-articles' && renderDecisionCheck(decision)}
              {decision.id === 'dns-comparison' && (
                <section className="dns-case-block">
                  <h4 id="dns-comparison-iteration">{comparison.iteration.title}</h4>
                  <DnsComparison frames={comparison.iteration.frames} headingId="dns-comparison-iteration"
                    sliderLabel="Разделитель «Было / Стало» для сравнения по наведению" renderScreenshot={renderScreenshot}
                    rocketActor={rocketActor} />
                  <div className="dns-case-frames" data-media-gallery>
                    {comparison.iteration.toggleFrames.map(renderFigure)}
                  </div>
                  <ul className="dns-case-stages dns-case-facts" aria-label="Факт раннего теста">
                    {renderFact(comparison.iteration.fact)}
                  </ul>
                </section>
              )}
            </section>
          ))}
        </div>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-scenario">
        <p className="dns-case-divider">{sectionLabels.scenario}</p>
        <div className="dns-case-subsections">
          <div className="dns-case-block" data-mascot-comment="ryzen-review">
            <h2 id="dns-scenario" tabIndex={-1}>{scenario.title}</h2>
            <p>{scenario.intro}</p>
            <DnsScenario steps={scenario.steps} renderScreenshot={renderScreenshot} />
          </div>
          <section className="dns-case-block">
            <h3>{quickChoice.title}</h3>
            <p>{quickChoice.intro}</p>
            <p>{quickChoice.articlesIntro}</p>
            <InterviewGallery label={quickChoice.title}>
              {quickChoice.frames.map(renderFigure)}
            </InterviewGallery>
          </section>
        </div>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-results">
        <p className="dns-case-divider">{sectionLabels.test}</p>
        <div className="dns-case-subsections">
          <div className="dns-case-block">
            <h2 id="dns-results" tabIndex={-1}>{test.title}</h2>
            <p>{test.intro}</p>
            <p>{test.accounting}</p>
            <ul className="dns-case-stages dns-case-results" aria-label="От начала теста до сохранения сборки">
              {test.overview.map(renderMetric)}
            </ul>
          </div>
          <section className="dns-case-block">
            <h3 id="dns-hypotheses">{test.journalTitle}</h3>
            {renderFigure(test.journal)}
            {test.groups.map(({ title, metrics }) => (
              <section className="dns-case-block" aria-label={title} key={title}>
                <h4>{title}</h4>
                <ul className="dns-case-stages dns-case-results" aria-label={`Показатели. ${title}`}>
                  {metrics.map(renderMetric)}
                </ul>
              </section>
            ))}
            <p>{test.timing}</p>
            <p>{test.journalLimit}</p>
          </section>
          <section className="dns-case-block">
            <h3>Что проверю дальше</h3>
            <ul className="dns-case-points">
              {test.next.map((step) => <li key={step}>{step}</li>)}
            </ul>
            <p>{test.nextIteration}</p>
          </section>
        </div>
      </section>
    </>
  );
}
