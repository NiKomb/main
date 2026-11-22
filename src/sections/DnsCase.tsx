import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { CaseSection } from '../components/CaseSection';
import { InterviewGallery } from '../components/InterviewGallery';
import { iconTilePress } from '../components/icon-tile-press';
import { dnsCase, dnsDecisions, type CaseFact, type CaseFigure, type CaseMetric } from '../data/dnsCase';
import type { ProjectImage } from '../data/projects';
import { ComparisonParticles } from '../effects/case-pixels/ComparisonParticles';
import { comparisonSwapClips } from '../effects/case-pixels/pixel-swap';
import { ComparisonDivider } from '../effects/comparison-divider/ComparisonDivider';
import { ComparisonFramePaint } from '../effects/comparison-frame-paint/ComparisonFramePaint';
import { MetricGradientPaint } from '../effects/metric-gradient-paint/MetricGradientPaint';
import { RocketShot } from '../effects/rocket-shot/RocketShot';
import { paintDnsButtonGradient } from './dns-button-gradient';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
  scenarioMedia: ReactNode;
  rocketActor?: RefObject<HTMLSpanElement | null>;
};

function renderFact({ title, detail, comment, quote }: CaseFact) {
  return (
    <li className="dns-case-fact" key={title} data-mascot-comment={comment}>
      <p className="dns-case-fact-title">{title}</p>
      <p>{detail}</p>
      {quote && <p><q>{quote}</q></p>}
    </li>
  );
}

function renderMetric({ value, label, detail, comment, paintGradient }: CaseMetric & { paintGradient?: boolean }) {
  return (
    <li className="dns-case-fact dns-case-metric" key={label} data-mascot-comment={comment}
      data-mascot-paint-gradient={paintGradient ? '' : undefined}>
      {paintGradient && <MetricGradientPaint />}
      <p className="dns-case-metric-value">{value}</p>
      <div className="dns-case-metric-copy">
        <p className="dns-case-fact-title">{label}</p>
        {detail && <p>{detail}</p>}
      </div>
    </li>
  );
}

function renderDecisionCheck({ checkTitle, checkMethod, metrics }: (typeof dnsDecisions)[number]) {
  return (
    <div className="dns-decision-check">
      <section className="dns-case-block">
        <h4>Что проверял</h4>
        <div className="dns-decision-tile dns-decision-signal">
          <p className="dns-case-fact-title">{checkTitle}</p>
          <p>{checkMethod}</p>
        </div>
      </section>
      <section className="dns-case-block">
        <h4>Результат</h4>
        <ul className={metrics.length > 1 ? 'dns-decision-metrics' : 'dns-decision-tile'}>
          {metrics.map(renderMetric)}
        </ul>
      </section>
    </div>
  );
}

function DnsComparison({ frames, headingId, paintFrame = false, sliderLabel = 'Разделитель «Было / Стало»',
  renderScreenshot }: Pick<Props, 'renderScreenshot'> & {
  frames: readonly [CaseFigure, CaseFigure];
  headingId: string;
  paintFrame?: boolean;
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
    <figure className="dns-case-figure" aria-labelledby={headingId} data-mascot-comment={after.comment}>
      <div ref={tile} className="case-cover dns-comparison-tile" data-media-gallery data-pixel-swap={clips ? '' : undefined}
        data-mascot-paint-frame={paintFrame ? '' : undefined} style={style}>
        <input className="dns-comparison-control" {...iconTilePress} type="range" min="0" max="100" value={position}
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
        <span className="icon-tile dns-comparison-handle" aria-hidden="true">
          <span className="pixel-chevron" />
          <span className="pixel-chevron" />
        </span>
      </div>
      {paintFrame && <ComparisonFramePaint tile={tile} {...size} />}
      <figcaption className="dns-case-frames">
        <span><strong>{before.label}</strong>{before.caption}</span>
        <span><strong>{after.label}</strong>{after.caption}</span>
      </figcaption>
    </figure>
  );
}

export function DnsCase({ jumpToHeading, renderScreenshot, scenarioMedia, rocketActor }: Props) {
  const { decisionsTitle, research, summary, comparison, scenario, quickChoice, test, reflection } = dnsCase;
  const toggleCaption = useRef<HTMLElement>(null);
  const summaryActions = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const actions = summaryActions.current;
    if (!actions) return;
    const styles = getComputedStyle(actions);
    const step = parseFloat(styles.getPropertyValue('--pixel-step'));
    if (!(step > 0)) return;
    const dark = styles.getPropertyValue('--color-dns-button-shadow').trim();
    const light = styles.getPropertyValue('--color-dns-button-face').trim();
    const canvases = new Map<HTMLButtonElement, CanvasRenderingContext2D>();
    const paint = (button: Element) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const context = canvases.get(button);
      if (!context) return;
      const { canvas } = context;
      const width = Math.ceil(button.clientWidth / step);
      const height = Math.ceil(button.clientHeight / step);
      if (!width || !height || (width === canvas.width && height === canvas.height)) return;
      canvas.width = width;
      canvas.height = height;
      paintDnsButtonGradient(context, dark, light);
      button.style.setProperty('--dns-summary-gradient', `url("${canvas.toDataURL()}") 0 0 / ${width * step}px ${height * step}px no-repeat`);
    };
    const observer = new ResizeObserver((entries) => entries.forEach(({ target }) => paint(target)));
    actions.querySelectorAll<HTMLButtonElement>('.dns-summary-jump--gradient').forEach((button) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = canvas.height = 0;
      canvases.set(button, context);
      paint(button);
      observer.observe(button);
    });
    return () => {
      observer.disconnect();
      for (const button of canvases.keys()) button.style.removeProperty('--dns-summary-gradient');
    };
  }, []);

  function renderFigure(figure: CaseFigure, captionTarget?: RefObject<HTMLElement | null>) {
    return (
      <figure className="dns-case-figure" key={figure.src}>
        {renderScreenshot(figure)}
        <figcaption ref={captionTarget} className={captionTarget ? 'rocket-shot-caption' : undefined}>
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
        <dl className="dns-case-meta">
          <div><dt>Мой вклад</dt><dd>{dnsCase.role}</dd></div>
          <div><dt>Статус</dt><dd>{dnsCase.status}</dd></div>
        </dl>
        <section className="dns-case-summary" aria-labelledby="dns-summary" data-mascot-comment="intro">
          <h2 id="dns-summary">{summary.title}</h2>
          <p className="dns-summary-context">{summary.context}</p>
          <dl>
            <div><dt>Проблема</dt><dd>{summary.problem}</dd></div>
            <div><dt>Решение</dt><dd>{summary.solution}</dd></div>
            <div><dt>Эффект в тесте</dt><dd>{summary.effect}</dd></div>
            <div><dt>Ограничения</dt><dd>{summary.limits}</dd></div>
          </dl>
          <div ref={summaryActions} className="project-links dns-summary-actions">
            <button className="icon-tile dns-summary-jump" {...iconTilePress} type="button" onClick={() => jumpToHeading('dns-decisions')}>
              <span className="dns-summary-jump-label">К решениям</span>
            </button>
            <button className="icon-tile dns-summary-jump dns-summary-jump--gradient" {...iconTilePress} type="button" onClick={() => jumpToHeading('dns-results')}>
              <span className="dns-summary-jump-label">К результатам UX-теста</span>
            </button>
            <button className="icon-tile dns-summary-jump dns-summary-jump--gradient dns-summary-jump--chevron" {...iconTilePress}
              type="button" onClick={() => jumpToHeading('dns-research')}>
              <span className="dns-summary-jump-label">К исследованию</span>
            </button>
          </div>
        </section>
      </header>

      <CaseSection id="dns-research" title={research.title}>
        <div className="dns-case-subsections">
          <section className="dns-case-group" aria-labelledby="dns-desk-research">
            <div className="dns-case-block">
              <h3 id="dns-desk-research" tabIndex={-1}>{research.discussionsTitle}</h3>
              <p>{research.discussionMethod}</p>
            </div>
            <div className="dns-case-block">
              <h4>Вывод</h4>
              <p>{research.discussionFinding}</p>
              <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения из обсуждений сборок" data-mascot-comment="external-review">
                {research.deskMetrics.map((metric, index) => renderMetric({ ...metric, paintGradient: index === 0 }))}
                {research.discussionExamples.map(renderFact)}
              </ul>
            </div>
          </section>
          <section className="dns-case-group" aria-labelledby="dns-audit">
            <div className="dns-case-block">
              <h3 id="dns-audit" tabIndex={-1}>{research.auditTitle}</h3>
              <ol className="dns-case-flow" aria-label="Путь выбора комплектующего">
                {research.flow.map((step, index) => (
                  <li key={step}>
                    {step}
                    {index < research.flow.length - 1 && <span className="pixel-chevron dns-case-flow-chevron" aria-hidden="true" />}
                  </li>
                ))}
              </ol>
              <p>{research.auditMethod}</p>
            </div>
            <div className="dns-case-block">
              <h4>Вывод</h4>
              <p>{research.auditFinding}</p>
              <ul className="dns-case-stages dns-case-results" aria-label="Что есть в действующем конфигураторе">
                {research.auditFindings.map(renderFact)}
              </ul>
            </div>
          </section>
          <h3 className="dns-case-divider" id="dns-interviews" tabIndex={-1}>{research.interviewTitle}</h3>
          <section className="dns-case-group" aria-labelledby="dns-interviews">
            <section className="dns-case-block" data-mascot-comment="comparison-search">
              <h4 id="dns-interview-task" tabIndex={-1}>{research.interviewTaskTitle}</h4>
              {research.interviewMethod.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              <InterviewGallery label={research.framesTitle}>
                {research.frames.map((figure) => renderFigure(figure))}
              </InterviewGallery>
            </section>
            <section className="dns-case-block">
              <h4>Наблюдение за сборщиком</h4>
              <p>{research.builderObservation}</p>
            </section>
            <section className="dns-case-block" aria-labelledby="dns-interview-results">
              <h4 id="dns-interview-results">Выводы</h4>
              <p>{research.interviewFinding}</p>
              <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения из интервью">
                {research.interviewFindings.map(renderFact)}
              </ul>
              <p>{research.interviewResultsLimit}</p>
              <details className="dns-interview-details">
                <summary>{research.interviewDetailsTitle}</summary>
                <div className="dns-case-group">
                  {research.interviewQuotes.map(({ title, detail, quote, followUp }) => (
                    <div className="dns-case-block" key={title}>
                      <h5>{title}</h5>
                      <p>{detail}</p>
                      <blockquote data-mascot-comment="interview-quotes"><p>{quote}</p></blockquote>
                      {followUp && <p>{followUp}</p>}
                    </div>
                  ))}
                </div>
              </details>
            </section>
          </section>
          <section className="dns-case-group" aria-labelledby="dns-competitors">
            <div className="dns-case-block">
              <h3 id="dns-competitors" tabIndex={-1}>{research.competitors.title}</h3>
              <InterviewGallery label={research.competitors.title}>
                {research.competitors.frames.map((figure) => renderFigure(figure))}
              </InterviewGallery>
              <p>{research.competitors.method}</p>
            </div>
            <div className="dns-case-block">
              <h4>Вывод</h4>
              <p>{research.competitors.finding}</p>
              <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения по конкурентам">
                {research.competitors.findings.map(renderFact)}
              </ul>
            </div>
          </section>
          <section className="dns-case-group" aria-labelledby="dns-prioritization">
            <div className="dns-case-block">
              <h3 id="dns-prioritization" tabIndex={-1}>{research.prioritization.title}</h3>
              {renderFigure(research.prioritization.evidence)}
              <p>{research.prioritization.method}</p>
            </div>
            <div className="dns-case-block">
              <h4>Решение</h4>
              <p>{research.prioritization.decision}</p>
              <ul className="dns-case-stages dns-case-results" aria-label="Гипотезы по направлениям">
                {research.prioritization.selected.map(({ title, hypotheses }) => (
                  <li className="dns-case-fact" key={title}>
                    <p className="dns-case-fact-title">{title}</p>
                    <ul className="dns-case-points dns-case-hypothesis-points">
                      {hypotheses.map((hypothesis) => <li key={hypothesis}>{hypothesis}</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
              <p>{research.prioritization.deferred}</p>
            </div>
          </section>
        </div>
      </CaseSection>

      <CaseSection id="dns-decisions" title={decisionsTitle}>
        <div className="dns-case-subsections">
          {dnsDecisions.map((decision) => {
            const [before, emphasis, after] = decision.hypothesisText;
            return (
              <section className="dns-case-group" key={decision.id} aria-labelledby={decision.id}>
                <div className="dns-case-block" data-mascot-comment={decision.painComment}>
                  <h3 id={decision.id} tabIndex={-1}>{decision.title}</h3>
                  <div className="dns-case-frames" data-media-gallery>
                    {decision.detailFrames.map((figure) => renderFigure(figure))}
                  </div>
                  <h4 id={`${decision.id}-changes`}>{decision.comparison.title}</h4>
                  <DnsComparison frames={decision.comparison.frames} headingId={`${decision.id}-changes`}
                    paintFrame={decision.id === 'dns-return'} renderScreenshot={renderScreenshot} />
                  {decision.solutionFigure && renderFigure(decision.solutionFigure)}
                </div>
                <div className="dns-case-block">
                  <h4>Гипотеза {decision.hypothesis}</h4>
                  <blockquote cite={test.journalSource.href}>
                    <p>{before}<strong className="dns-hypothesis-emphasis">{emphasis}</strong>{after}</p>
                  </blockquote>
                </div>
                <div className="dns-case-block">
                  <h4>Боль пользователей</h4>
                  <p>{decision.pain}</p>
                </div>
                <div className="dns-case-block">
                  <h4>Решение</h4>
                  <p>{decision.solution}</p>
                </div>
                {renderDecisionCheck(decision)}
                {decision.id === 'dns-comparison' && (
                  <section className="dns-case-block">
                    <h4 className="dns-case-labeled-heading" id="dns-comparison-iteration">
                      <span>{comparison.iteration.title}</span>
                      <span className="dns-case-heading-label">{comparison.iteration.label}</span>
                    </h4>
                    <div className="dns-case-frames" data-media-gallery>
                      {renderFigure(comparison.iteration.toggleFigure, toggleCaption)}
                      {renderFigure(comparison.iteration.differencesFigure)}
                    </div>
                    <DnsComparison frames={comparison.iteration.frames} headingId="dns-comparison-iteration"
                      sliderLabel="Разделитель «Было / Стало» для сравнения по наведению" renderScreenshot={renderScreenshot} />
                    <div className="dns-case-block">
                      <h5>Юзабилити-тест ранней версии прототипа</h5>
                      <p>{comparison.iteration.method}</p>
                    </div>
                    <div className="dns-case-block">
                      <h5>Решение</h5>
                      <ul className="dns-case-stages" aria-label="Факт раннего теста">
                        {renderFact(comparison.iteration.fact)}
                      </ul>
                    </div>
                    {rocketActor && <RocketShot target={toggleCaption} actor={rocketActor} />}
                  </section>
                )}
              </section>
            );
          })}
        </div>
      </CaseSection>

      <CaseSection id="dns-scenario" title={scenario.title} dividerLabel={scenario.label}>
        <div className="dns-case-subsections">
          <div className="dns-case-group" data-mascot-comment="ryzen-review">
            {scenarioMedia}
            <div className="dns-case-block">
              <h3>Действия</h3>
              <p>{scenario.action}</p>
            </div>
            <div className="dns-case-block">
              <h3>Результат</h3>
              <p>{scenario.result}</p>
            </div>
          </div>
          <section className="dns-case-group" aria-labelledby="dns-quick-choice">
            <div className="dns-case-block">
              <h3 id="dns-quick-choice" tabIndex={-1}>{quickChoice.title}</h3>
              <div className="dns-case-frames" data-media-gallery>
                {quickChoice.frames.map((figure) => renderFigure(figure))}
              </div>
            </div>
            <div className="dns-case-block">
              <h4>Действие</h4>
              <p>{quickChoice.action}</p>
            </div>
            <div className="dns-case-block">
              <h4>Результат</h4>
              <p>{quickChoice.result}</p>
              <p>{quickChoice.articlesIntro}</p>
            </div>
          </section>
        </div>
      </CaseSection>

      <CaseSection id="dns-results" title={test.title}>
        <div className="dns-case-subsections">
          <div className="dns-case-group">
            <div className="dns-case-block">
              <p>{test.intro}</p>
              <p>{test.accounting}</p>
            </div>
            <div className="dns-case-block">
              <h3 id="dns-test-overview" tabIndex={-1}>{test.overviewTitle}</h3>
              <ul className="dns-case-stages dns-case-results" aria-label="Основные результаты UX-теста">
                {test.overview.map(renderMetric)}
              </ul>
            </div>
          </div>
          <section className="dns-case-group" aria-labelledby="dns-hypotheses">
            <h3 id="dns-hypotheses">{test.journalTitle}</h3>
            {test.groups.map(({ title, hypothesis, metrics }) => (
              <section className="dns-case-block" aria-label={title} key={title}>
                <h4 className="dns-case-labeled-heading">
                  <span>{title}</span>
                  <span className="dns-case-heading-label">Гипотеза {hypothesis}</span>
                </h4>
                <ul className="dns-case-stages dns-case-results" aria-label={`Показатели. ${title}`}>
                  {metrics.map(renderMetric)}
                </ul>
              </section>
            ))}
            <div className="dns-case-block">
              <p>{test.timing}</p>
              <p>{test.journalLimit}</p>
            </div>
          </section>
        </div>
      </CaseSection>

      <CaseSection id="dns-reflection" title={reflection.title}>
        <div className="dns-case-subsections">
          <div className="dns-case-block">
            <h3>Сборки без сохранения</h3>
            <p>{reflection.observation}</p>
          </div>
          <div className="dns-case-block">
            <h3 id="dns-next-test" tabIndex={-1}>{reflection.nextTitle}</h3>
            <p>{reflection.next}</p>
          </div>
        </div>
      </CaseSection>
    </>
  );
}
