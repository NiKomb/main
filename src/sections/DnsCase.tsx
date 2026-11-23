import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { CaseSection } from '../components/CaseSection';
import { CaseHeading } from '../components/CaseHeading';
import { GridIcon } from '../components/GridIcon';
import { InterviewGallery } from '../components/InterviewGallery';
import { iconTilePress } from '../components/icon-tile-press';
import { dnsCase, dnsContents, dnsDecisions, type CaseFact, type CaseFigure, type CaseMetric } from '../data/dnsCase';
import { dnsConfiguratorLink, type ProjectImage } from '../data/projects';
import { ComparisonDivider } from '../effects/comparison-divider/ComparisonDivider';
import { ComparisonFramePaint } from '../effects/comparison-frame-paint/ComparisonFramePaint';
import { MetricGradientPaint } from '../effects/metric-gradient-paint/MetricGradientPaint';
import { RocketShot } from '../effects/rocket-shot/RocketShot';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
  scenarioMedia: ReactNode;
  rocketActor?: RefObject<HTMLSpanElement | null>;
};

function renderDnsText(text: string) {
  return text.split('**').map((part, index) => (
    index % 2 === 0 ? part : <span className="dns-copy-emphasis" key={index}>{part}</span>
  ));
}

function DnsHeading({ id, as }: {
  id: string;
  as?: 'h2' | 'h3' | 'h4';
}) {
  const entry = dnsContents.find((item) => item.id === id);
  if (!entry) return null;

  return <CaseHeading id={id} as={as} note={entry.note}>{entry.label}</CaseHeading>;
}

function renderFact({ title, detail, comment }: Omit<CaseFact, 'detail'> & { detail: ReactNode }) {
  return (
    <li className="dns-case-fact" key={title} data-mascot-comment={comment}>
      <p className="dns-case-fact-title">{title}</p>
      <p>{detail}</p>
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

function updateInterviewQuoteFades(scroll: HTMLDivElement) {
  const remaining = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop;
  scroll.toggleAttribute('data-fade-start', scroll.scrollTop > 1);
  scroll.toggleAttribute('data-fade-end', remaining > 1);
}

function positionInterviewQuotes(panel: HTMLElement, toggle: HTMLButtonElement) {
  panel.removeAttribute('data-above');
  const { top, height } = panel.getBoundingClientRect();
  const button = toggle.getBoundingClientRect();
  const spaceBelow = window.innerHeight - top;
  const gap = top - button.bottom;
  const spaceAbove = button.top - 2 * gap;
  if (gap <= 0 || spaceBelow >= Math.min(height, 160) || spaceAbove <= spaceBelow) return;

  panel.style.setProperty('--interview-quotes-space-above', `${spaceAbove}px`);
  panel.setAttribute('data-above', '');
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
  const style = { '--comparison-position': `${position}%` } as CSSProperties;

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
      <div ref={tile} className="case-cover dns-comparison-tile" data-media-gallery
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
        <ComparisonDivider tile={tile} position={position} width={size.width} height={size.height} />
        <span className="icon-tile dns-comparison-handle" aria-hidden="true">
          <GridIcon name="left" />
          <GridIcon name="right" />
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
  const { decisionsTitle, research, summary, comparison, scenario, test, reflection } = dnsCase;
  const reflectionNote = dnsContents.find((item) => item.id === 'dns-next-test')?.note;
  const [interviewQuotesOpen, setInterviewQuotesOpen] = useState(false);
  const interviewToggle = useRef<HTMLButtonElement>(null);
  const interviewQuotesScroll = useRef<HTMLDivElement>(null);
  const toggleCaption = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const scroll = interviewQuotesScroll.current;
    const panel = scroll?.parentElement;
    const toggle = interviewToggle.current;
    if (!interviewQuotesOpen || !scroll || !panel || !toggle) return;

    const position = () => positionInterviewQuotes(panel, toggle);
    position();
    scroll.scrollTop = 0;
    scroll.focus({ preventScroll: true });
    updateInterviewQuoteFades(scroll);

    const observer = new ResizeObserver(() => updateInterviewQuoteFades(scroll));
    observer.observe(scroll);
    for (const child of scroll.children) observer.observe(child);
    window.addEventListener('resize', position);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
    };
  }, [interviewQuotesOpen]);

  function closeInterviewQuotes() {
    setInterviewQuotesOpen(false);
    interviewToggle.current?.focus({ preventScroll: true });
  }

  function renderFigure(figure: CaseFigure, { captionTarget, skipMascot }: {
    captionTarget?: RefObject<HTMLElement | null>;
    skipMascot?: boolean;
  } = {}) {
    return (
      <figure className="dns-case-figure" key={figure.src} data-mascot-skip={skipMascot ? '' : undefined}>
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
          <DnsHeading as="h2" id="dns-summary" />
          <p className="dns-summary-context">{renderDnsText(summary.context)}</p>
          <dl>
            <div><dt>Проблема</dt><dd>{renderDnsText(summary.problem)}</dd></div>
            <div><dt>Решение</dt><dd>{renderDnsText(summary.solution)}</dd></div>
            <div><dt>Эффект</dt><dd>{summary.effect}</dd></div>
            <div><dt>Ограничения</dt><dd>{summary.limits}</dd></div>
          </dl>
          <div className="dns-summary-actions">
            <button className="icon-tile icon-tile--labeled dns-brand-button" {...iconTilePress} type="button" onClick={() => jumpToHeading('dns-decisions')}>
              <span className="dns-brand-button-label">К решениям<GridIcon name="link" /></span>
            </button>
            <button className="icon-tile icon-tile--labeled dns-brand-button" {...iconTilePress} type="button" onClick={() => jumpToHeading('dns-results')}>
              <span className="dns-brand-button-label">К результатам UX-теста<GridIcon name="link" /></span>
            </button>
            <a className="icon-tile icon-tile--labeled dns-brand-button dns-summary-configurator" {...iconTilePress}
              href={dnsConfiguratorLink.href} target="_blank" rel="noopener" data-track-id={dnsConfiguratorLink.id}>
              <span className="dns-brand-button-label">{dnsConfiguratorLink.label}<GridIcon name="link" /></span>
            </a>
          </div>
        </section>
      </header>

      <CaseSection id="dns-research" title={research.title}>
        <section className="dns-case-group" aria-labelledby="dns-desk-research">
          <div className="dns-case-block">
            <DnsHeading id="dns-desk-research" />
            <p>{research.discussionAction}</p>
          </div>
          <div className="dns-case-block">
            <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения из обсуждений сборок" data-mascot-comment="external-review">
              {research.deskMetrics.map((metric, index) => renderMetric({ ...metric, paintGradient: index === 0 }))}
            </ul>
            <p>{renderDnsText(research.discussionConclusion)}</p>
          </div>
        </section>
        <section className="dns-case-group" aria-labelledby="dns-audit">
          <div className="dns-case-block">
            <DnsHeading id="dns-audit" />
            <p>{research.auditAction}</p>
          </div>
          <div className="dns-case-block">
            <h4 id="dns-audit-problems">{research.auditProblemsTitle}</h4>
            <ul className="dns-case-stages dns-case-results" aria-labelledby="dns-audit-problems">
              {research.auditProblems.map(renderFact)}
            </ul>
            <p>{renderDnsText(research.auditConclusion)}</p>
          </div>
        </section>
        <section className="dns-case-group dns-interviews" id="dns-interviews" aria-labelledby="dns-interview-task"
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || !interviewQuotesOpen) return;
            event.stopPropagation();
            closeInterviewQuotes();
          }}>
          <div className="dns-case-block">
            <DnsHeading id="dns-interview-task" />
            <div className="dns-interview-intro">
              <p>{research.interviewAction}</p>
              <button ref={interviewToggle} className="icon-tile dns-brand-button dns-interview-toggle" {...iconTilePress} type="button"
                aria-label={research.interviewDetailsTitle}
                aria-expanded={interviewQuotesOpen} aria-controls="dns-interview-quotes"
                onClick={() => interviewQuotesOpen ? closeInterviewQuotes() : setInterviewQuotesOpen(true)}>
                <GridIcon name={interviewQuotesOpen ? 'left' : 'right'} />
              </button>
            </div>
          </div>
          <div className="dns-case-block" id="dns-interview-results">
            <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения из сессий">
              {research.interviewFindings.map(renderMetric)}
            </ul>
            <p>{renderDnsText(research.interviewConclusion)}</p>
          </div>
          <section className="dns-case-group dns-interview-quotes" id="dns-interview-quotes"
            aria-labelledby="dns-interview-quotes-heading" hidden={!interviewQuotesOpen} data-viewport-edge-overlay>
            <header className="dns-interview-quotes-header">
              <h4 id="dns-interview-quotes-heading">{research.interviewDetailsTitle}</h4>
              <button className="icon-tile dns-interview-close" type="button" {...iconTilePress}
                aria-label="Свернуть цитаты" onClick={closeInterviewQuotes}>
                <GridIcon name="left" />
              </button>
            </header>
            <div ref={interviewQuotesScroll} className="dns-interview-quotes-scroll" tabIndex={0}
              role="group" aria-labelledby="dns-interview-quotes-heading"
              onScroll={(event) => updateInterviewQuoteFades(event.currentTarget)}>
              {research.interviewQuotes.map(({ title, detail, quote, followUp }) => (
                <div className="dns-interview-quote" key={title}>
                  <h5>{title}</h5>
                  <blockquote><p>{quote}</p></blockquote>
                  <p>{detail}</p>
                  {followUp && <p>{followUp}</p>}
                </div>
              ))}
              <p>{research.interviewPrompt}</p>
              <p>{research.interviewResultsLimit}</p>
            </div>
          </section>
          <div className="dns-case-block" data-mascot-comment="comparison-search">
            <InterviewGallery label={research.framesTitle}>
              {research.frames.map((figure, index) => renderFigure(figure, { skipMascot: index >= 2 }))}
            </InterviewGallery>
          </div>
        </section>
        <section className="dns-case-group" aria-labelledby="dns-competitors">
          <div className="dns-case-block">
            <DnsHeading id="dns-competitors" />
            <p>{research.competitors.action}</p>
          </div>
          <div className="dns-case-block">
            <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения по конкурентам">
              {research.competitors.findings.map(renderFact)}
            </ul>
            <p>{renderDnsText(research.competitors.conclusion)}</p>
          </div>
          <div className="dns-case-block">
            <InterviewGallery label={research.competitors.title}>
              {research.competitors.frames.map((figure) => renderFigure(figure))}
            </InterviewGallery>
          </div>
        </section>
        <section className="dns-case-group" aria-labelledby="dns-prioritization">
          <div className="dns-case-block">
            <DnsHeading id="dns-prioritization" />
            <p>{research.prioritization.rationale}</p>
          </div>
          <div className="dns-decision-copy">
            <ol className="dns-case-stages dns-case-results" aria-label="Гипотезы для прототипа">
              {dnsDecisions.map(({ hypothesis, contentsLabel, hypothesisText }) => renderFact({
                title: `Гипотеза ${hypothesis} · ${contentsLabel}`,
                detail: renderDnsText(hypothesisText.join('**')),
              }))}
            </ol>
            {renderFigure(research.prioritization.evidence)}
          </div>
        </section>
      </CaseSection>

      <CaseSection id="dns-decisions" title={decisionsTitle}>
        {dnsDecisions.map((decision) => {
          const [before, emphasis, after] = decision.hypothesisText;
          return (
            <section className="dns-case-group" key={decision.id} aria-labelledby={decision.id}>
              <DnsHeading id={decision.id} />
              <div className="dns-case-frames" data-media-gallery data-mascot-comment={decision.comment}>
                {decision.detailFrames.map((figure) => renderFigure(figure))}
              </div>
              <div className="dns-case-block" data-mascot-comment={decision.comment}>
                {decision.solutionFigure && renderFigure(decision.solutionFigure)}
                <DnsComparison frames={decision.comparison} headingId={decision.id}
                  paintFrame={decision.id === 'dns-return'} renderScreenshot={renderScreenshot} />
              </div>
              <section className="dns-case-block dns-decision-check">
                <div className="dns-decision-copy">
                  <div className="dns-case-block">
                    <h4>Гипотеза {decision.hypothesis}</h4>
                    <blockquote cite={test.journalSource}>
                      <p>{before}<strong className="dns-copy-emphasis">{emphasis}</strong>{after}</p>
                    </blockquote>
                  </div>
                  <div className="dns-case-block">
                    <h4>Решение</h4>
                    <p>{renderDnsText(decision.solution)}</p>
                  </div>
                </div>
                <h4>Результат</h4>
                <ul className="dns-case-stages dns-case-results" aria-label={`Результат. ${decision.contentsLabel}`}>
                  {decision.metrics.map(renderMetric)}
                </ul>
              </section>
              {decision.id === 'dns-comparison' && (
                <section className="dns-case-block">
                  <h4 className="dns-case-labeled-heading" id="dns-comparison-iteration">
                    <span>{comparison.iteration.title}</span>
                    <span className="dns-case-heading-label">{comparison.iteration.label}</span>
                  </h4>
                  <DnsComparison frames={comparison.iteration.frames} headingId="dns-comparison-iteration"
                    sliderLabel="Разделитель «Было / Стало» для сравнения по наведению" renderScreenshot={renderScreenshot} />
                  <div className="dns-case-frames" data-media-gallery>
                    {renderFigure(comparison.iteration.toggleFigure, { captionTarget: toggleCaption })}
                    {renderFigure(comparison.iteration.differencesFigure)}
                  </div>
                  <p>{comparison.iteration.action}</p>
                  <ul className="dns-case-stages" aria-label="Результат раннего теста">
                    {renderFact(comparison.iteration.fact)}
                  </ul>
                  {rocketActor && <RocketShot target={toggleCaption} actor={rocketActor} />}
                </section>
              )}
            </section>
          );
        })}
        <CaseSection as="h3" id="dns-results" title={test.title}>
          <section className="dns-case-group" aria-labelledby="dns-scenario" data-mascot-comment="ryzen-review">
            <div className="dns-case-block">
              <DnsHeading as="h4" id="dns-scenario" />
              {scenarioMedia}
            </div>
            <div className="dns-decision-copy">
              <div className="dns-case-block">
                <h5>Шаг покупателя</h5>
                <p>{scenario.action}</p>
              </div>
              <div className="dns-case-block">
                <h5>Результат</h5>
                <p>{scenario.result}</p>
              </div>
            </div>
          </section>
          <section className="dns-case-block" aria-labelledby="dns-test-overview">
            <DnsHeading as="h4" id="dns-test-overview" />
            <p>{test.action}</p>
            <ul className="dns-case-stages dns-case-results" aria-label="Основные результаты UX-теста">
              {test.overview.map(renderMetric)}
            </ul>
            <p>{renderDnsText(test.conclusion)}</p>
            <p>{test.accounting}</p>
          </section>
        </CaseSection>
        <CaseSection as="h3" id="dns-next-test" sectionId="dns-reflection" title={reflection.title}
          variant="labeled" note={reflectionNote}>
          <div className="dns-case-block">
            <p>{reflection.summary}</p>
            <ul className="dns-case-stages dns-case-results" aria-label="Итоги проверки">
              {reflection.takeaways.map(({ detail, ...fact }) => renderFact({ ...fact, detail: renderDnsText(detail) }))}
            </ul>
          </div>
        </CaseSection>
      </CaseSection>
    </>
  );
}
