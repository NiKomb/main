import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { DnsScenario } from '../components/DnsScenario';
import { InterviewGallery } from '../components/InterviewGallery';
import { iconTilePress } from '../components/icon-tile-press';
import { dnsCase, dnsDecisions, type CaseFact, type CaseFigure } from '../data/dnsCase';
import type { ProjectImage } from '../data/projects';
import { ComparisonParticles } from '../effects/case-pixels/ComparisonParticles';
import { comparisonSwapClips } from '../effects/case-pixels/pixel-swap';
import { ComparisonDivider } from '../effects/comparison-divider/ComparisonDivider';
import { RocketShot } from '../effects/rocket-shot/RocketShot';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
  rocketActor?: RefObject<HTMLSpanElement | null>;
  onComparisonHit: (hit: boolean) => void;
};

function renderCount({ count, label }: { count: number; label: string }) {
  return <li key={label}><strong>{count}</strong><span>{label}</span></li>;
}

function renderFact({ title, detail }: CaseFact) {
  return <li className="dns-case-fact" key={title}><p className="dns-case-fact-title">{title}</p><p>{detail}</p></li>;
}

function ScreenshotPlaceholders({ frames }: { frames: readonly { label: string; caption: string }[] }) {
  return (
    <div className="dns-case-frames dns-case-placeholders">
      {frames.map(({ label, caption }) => (
        <figure className="dns-case-figure" key={label}>
          <div className="dns-case-placeholder" aria-hidden="true" />
          <figcaption><strong>{label}</strong>{caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function DnsComparison({ frames, headingId, sliderLabel = 'Разделитель «Было / Стало»',
  renderScreenshot, rocket }: Pick<Props, 'renderScreenshot'> & {
  frames: readonly [CaseFigure, CaseFigure];
  headingId: string;
  sliderLabel?: string;
  rocket?: { actor: RefObject<HTMLSpanElement | null>; onImpact: Props['onComparisonHit'] };
}) {
  const [position, setPosition] = useState(50);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const tile = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const slideFrame = useRef(0);
  const afterLabel = useRef<HTMLElement>(null);
  const reportImpact = rocket?.onImpact;
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

  const onImpact = useCallback((hit: boolean) => {
    reportImpact?.(hit);
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
  }, [reportImpact]);

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
    <figure className="dns-case-figure" aria-labelledby={headingId}>
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
        <span><strong ref={afterLabel} className={rocket ? 'rocket-shot-caption' : undefined}>{after.label}</strong>{after.caption}</span>
      </figcaption>
      {rocket && <RocketShot target={afterLabel} comparison={tile} actor={rocket.actor} onImpact={onImpact} />}
    </figure>
  );
}

export function DnsCase({ jumpToHeading, renderScreenshot, rocketActor, onComparisonHit }: Props) {
  const { research, summary, comparison, scenario, quickChoice, test } = dnsCase;
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
        <hr className="dns-case-rule" />
        <div className="dns-case-group">
          <h2 id="dns-research" tabIndex={-1}>{research.title}</h2>
          <div className="dns-case-subsections">
            <section className="dns-case-block">
              <h3>{research.discussionsTitle}</h3>
              {research.discussions.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
            <section className="dns-case-block">
              <h3>{research.auditTitle}</h3>
              <p>{research.audit}</p>
              <ol className="dns-case-flow" aria-label="Путь выбора комплектующего">
                {research.flow.map((step) => <li key={step}>{step}</li>)}
              </ol>
              <ol className="dns-case-flow dns-case-flow-preview" aria-hidden="true">
                {research.flow.map((step) => <li key={step}>{step}</li>)}
              </ol>
            </section>
            <section className="dns-case-group" aria-labelledby="dns-interviews">
              <h3 id="dns-interviews">Интервью</h3>
              <section className="dns-case-block">
                <h4>{research.sessionsTitle}</h4>
                {research.sessions.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
              {research.findings.map(({ title, passages }) => (
                <section className="dns-case-block" key={title}>
                  <h4>{title}</h4>
                  {passages.map(({ text, quote }) => quote
                    ? <blockquote key={quote}><p>{quote}</p></blockquote>
                    : <p key={text}>{text}</p>)}
                </section>
              ))}
              <InterviewGallery label={research.framesTitle}>
                {research.frames.map(renderFigure)}
              </InterviewGallery>
            </section>
            <section className="dns-case-block">
              <h3>{research.competitors.title}</h3>
              <p>{research.competitors.intro}</p>
              <ScreenshotPlaceholders frames={research.competitors.frames} />
            </section>
            <section className="dns-case-block">
              <h3>{research.prioritization.title}</h3>
              <p>{research.prioritization.intro}</p>
              {renderFigure(research.prioritization.evidence)}
            </section>
            <section className="dns-case-block">
              <h3>{research.conclusionTitle}</h3>
              {research.conclusion.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          </div>
        </div>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-decisions">
        <h2 className="dns-case-divider" id="dns-decisions">Решения</h2>
        <div className="dns-case-subsections">
          {dnsDecisions.map((decision) => (
            <section className="dns-case-group" key={decision.id} aria-labelledby={decision.id}>
              <div className="dns-case-block">
                <h3 id={decision.id} tabIndex={-1}>{decision.title}</h3>
                {decision.observation && <p>{decision.observation}</p>}
                <p>{decision.solution}</p>
              </div>
              <section className="dns-case-block">
                <h4 id={`${decision.id}-changes`}>{decision.comparison.title}</h4>
                <DnsComparison frames={decision.comparison.frames} headingId={`${decision.id}-changes`} renderScreenshot={renderScreenshot} />
              </section>
              <div className="dns-case-group">
                {decision.signal && <p><strong>Что проверял.</strong> {decision.signal}</p>}
                <section className="dns-case-block">
                  <h4>Что увидел</h4>
                  <ul className="dns-case-stages dns-case-facts">
                    {decision.facts.map(renderFact)}
                  </ul>
                </section>
              </div>
              {decision.id === 'dns-comparison' && (
                <section className="dns-case-block">
                  <h4 id="dns-comparison-iteration">{comparison.iteration.title}</h4>
                  <DnsComparison frames={comparison.iteration.frames} headingId="dns-comparison-iteration"
                    sliderLabel="Разделитель «Было / Стало» для сравнения по наведению" renderScreenshot={renderScreenshot}
                    rocket={rocketActor ? { actor: rocketActor, onImpact: onComparisonHit } : undefined} />
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
        <hr className="dns-case-rule" />
        <div className="dns-case-subsections">
          <div className="dns-case-block">
            <h2 id="dns-scenario" tabIndex={-1}>{scenario.title}</h2>
            <p>{scenario.intro}</p>
            <DnsScenario steps={scenario.steps} renderScreenshot={renderScreenshot} />
          </div>
          <section className="dns-case-block">
            <h3>{quickChoice.title}</h3>
            {quickChoice.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <ScreenshotPlaceholders frames={quickChoice.frames} />
          </section>
        </div>
      </section>

      <section className="case-content-section dns-case-section" aria-labelledby="dns-results">
        <hr className="dns-case-rule" />
        <div className="dns-case-subsections">
          <div className="dns-case-block">
            <h2 id="dns-results" tabIndex={-1}>{test.title}</h2>
            <p>{test.intro}</p>
            <ol className="dns-case-stages" aria-label="От начала теста до сохранения сборки">
              {test.stages.map(renderCount)}
            </ol>
            <p>{test.note}</p>
          </div>
          <section className="dns-case-block">
            <h3 id="dns-hypotheses">{test.journalTitle}</h3>
            {renderFigure(test.journal)}
            <p>{test.journalLimit}</p>
          </section>
          <section className="dns-case-block">
            <h3>Что проверю дальше</h3>
            <ul className="dns-case-points">
              {test.next.map((step) => <li key={step}>{step}</li>)}
            </ul>
          </section>
        </div>
      </section>
    </>
  );
}
