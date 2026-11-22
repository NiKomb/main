import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { CaseSection } from '../components/CaseSection';
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

function DnsHeading({ id, as: Heading = 'h3' }: {
  id: string;
  as?: 'h2' | 'h3' | 'h4';
}) {
  const entry = dnsContents.find((item) => item.id === id);
  if (!entry) return null;

  return (
    <Heading className="dns-case-labeled-heading" id={id} tabIndex={-1}>
      <span>{entry.label}</span>
      {entry.note && <span className="dns-case-heading-label">{entry.note}</span>}
    </Heading>
  );
}

function renderFact({ title, detail, comment, quote }: Omit<CaseFact, 'detail'> & { detail: ReactNode }) {
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
  const toggleCaption = useRef<HTMLElement>(null);

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
          <DnsHeading as="h2" id="dns-summary" />
          <p className="dns-summary-context">{renderDnsText(summary.context)}</p>
          <dl>
            <div><dt>Проблема</dt><dd>{renderDnsText(summary.problem)}</dd></div>
            <div><dt>Решение</dt><dd>{renderDnsText(summary.solution)}</dd></div>
            <div><dt>Эффект</dt><dd>{summary.effect}</dd></div>
            <div><dt>Ограничения</dt><dd>{summary.limits}</dd></div>
          </dl>
          <div className="dns-summary-actions">
            <button className="icon-tile dns-summary-jump" {...iconTilePress} type="button" onClick={() => jumpToHeading('dns-decisions')}>
              <span className="dns-summary-jump-label">К решениям<GridIcon name="link" /></span>
            </button>
            <button className="icon-tile dns-summary-jump" {...iconTilePress} type="button" onClick={() => jumpToHeading('dns-results')}>
              <span className="dns-summary-jump-label">К результатам UX-теста<GridIcon name="link" /></span>
            </button>
            <a className="icon-tile dns-summary-jump" {...iconTilePress}
              href={dnsConfiguratorLink.href} target="_blank" rel="noopener" data-track-id={dnsConfiguratorLink.id}>
              <span className="dns-summary-jump-label">{dnsConfiguratorLink.label}<GridIcon name="link" /></span>
            </a>
          </div>
        </section>
      </header>

      <CaseSection id="dns-research" title={research.title}>
        <div className="dns-case-subsections">
          <section className="dns-case-group" aria-labelledby="dns-desk-research">
            <div className="dns-case-block">
              <DnsHeading id="dns-desk-research" />
              <p>{research.discussionAction}</p>
            </div>
            <div className="dns-case-block">
              <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения из обсуждений сборок" data-mascot-comment="external-review">
                {research.deskMetrics.map((metric, index) => renderMetric({ ...metric, paintGradient: index === 0 }))}
                {research.discussionExamples.map(renderFact)}
              </ul>
            </div>
          </section>
          <section className="dns-case-group" aria-labelledby="dns-audit">
            <div className="dns-case-block">
              <DnsHeading id="dns-audit" />
              <p>{research.auditAction}</p>
            </div>
            <div className="dns-case-block">
              <ul className="dns-case-stages dns-case-results" aria-label="Что есть в действующем конфигураторе">
                {research.auditFindings.map(renderFact)}
              </ul>
            </div>
          </section>
          <section className="dns-case-group" id="dns-interviews" aria-labelledby="dns-interview-task">
            <div className="dns-case-block">
              <DnsHeading id="dns-interview-task" />
              <p>{research.interviewAction}</p>
            </div>
            <div className="dns-case-block" id="dns-interview-results">
              <ul className="dns-case-stages dns-case-results" aria-label="Наблюдения из сессий">
                {research.interviewFindings.map(renderFact)}
              </ul>
              <p>{research.interviewResultsLimit}</p>
            </div>
            <div className="dns-case-block" data-mascot-comment="comparison-search">
              <InterviewGallery label={research.framesTitle}>
                {research.frames.map((figure) => renderFigure(figure))}
              </InterviewGallery>
              <details className="dns-interview-details">
                <summary>{research.interviewDetailsTitle}</summary>
                <div className="dns-case-group">
                  <p>{research.interviewPrompt}</p>
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
        </div>
      </CaseSection>

      <CaseSection id="dns-decisions" title={decisionsTitle}>
        <div className="dns-case-subsections">
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
                      {renderFigure(comparison.iteration.toggleFigure, toggleCaption)}
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
          <h3 className="dns-case-divider" id="dns-results" tabIndex={-1}>{test.title}</h3>
          <section className="dns-case-subsections" aria-labelledby="dns-results">
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
              <p>{test.accounting}</p>
              <ul className="dns-case-stages dns-case-results" aria-label="Основные результаты UX-теста">
                {test.overview.map(renderMetric)}
              </ul>
            </section>
          </section>
          <section className="dns-case-block" id="dns-reflection" aria-labelledby="dns-next-test">
            <DnsHeading id="dns-next-test" />
            <p>{reflection.summary}</p>
            <ul className="dns-case-stages dns-case-results" aria-label="Итоги проверки">
              {reflection.takeaways.map(renderFact)}
            </ul>
          </section>
        </div>
      </CaseSection>
    </>
  );
}
