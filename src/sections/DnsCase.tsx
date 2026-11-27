import { useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { CaseEvidence } from '../components/CaseEvidence';
import { CaseCard } from '../components/CaseCard';
import { CaseCardList, CaseResults } from '../components/CaseCardList';
import { CaseDecisionCopy } from '../components/CaseDecisionCopy';
import { renderCaseText } from '../components/renderCaseText';
import { CaseSection } from '../components/CaseSection';
import { CaseHeading } from '../components/CaseHeading';
import { CaseTestAccounting } from '../components/CaseTestAccounting';
import { GridIcon } from '../components/GridIcon';
import { InterviewGallery } from '../components/InterviewGallery';
import { iconTilePress } from '../components/icon-tile-press';
import { dnsCase, dnsContents, dnsDecisions, type CaseFact, type CaseFigure, type CaseMetric } from '../data/dnsCase';
import { dnsConfiguratorLink, dnsDemoLink, type ProjectImage } from '../data/projects';
import { useComparisonPosition } from '../effects/comparison-divider/use-comparison-position';
import '../effects/comparison-divider/comparison-divider.css';
import { RocketShot } from '../effects/rocket-shot/RocketShot';

type Props = {
  jumpToHeading: (id: string) => void;
  renderScreenshot: (image: ProjectImage) => ReactNode;
  scenarioMedia: ReactNode;
  rocketActor?: RefObject<HTMLSpanElement | null>;
};

function DnsHeading({ id, as }: {
  id: string;
  as?: 'h2' | 'h3';
}) {
  const entry = dnsContents.find((item) => item.id === id);
  if (!entry) return null;

  return <CaseHeading id={id} as={as} note={entry.note}>{entry.label}</CaseHeading>;
}

function renderFact({ title, detail, context, comment, highlight }: Omit<CaseFact, 'detail'> & {
  detail: ReactNode;
  context?: string;
}) {
  return (
    <CaseCard as="li" className="dns-case-fact" key={title} comment={comment} highlight={highlight}>
      <p className="dns-case-fact-title">{title}</p>
      <p>{detail}</p>
      {context && <p>{context}</p>}
    </CaseCard>
  );
}

function renderMetric({ value, label, detail, comment, highlight }: CaseMetric) {
  return (
    <CaseCard as="li" className="dns-case-fact dns-case-metric" key={label} comment={comment} highlight={highlight}>
      <p className="dns-case-metric-value">{value}</p>
      <div className="dns-case-metric-copy">
        <p className="dns-case-fact-title">{label}</p>
        {detail && <p>{detail}</p>}
      </div>
    </CaseCard>
  );
}

function DnsComparison({ frames, headingId, highlightSpeech = false, sliderLabel = 'Разделитель «Было / Стало»',
  renderScreenshot, ground }: Pick<Props, 'renderScreenshot'> & {
  frames: readonly [CaseFigure, CaseFigure];
  headingId: string;
  highlightSpeech?: boolean;
  sliderLabel?: string;
  ground?: RefObject<HTMLCanvasElement | null>;
}) {
  const tile = useRef<HTMLDivElement>(null);
  const { position, moveTo, startDrag, stopCoast } = useComparisonPosition(tile);
  const displayedPosition = Math.round(position);
  const [before, after] = frames;
  const style = { '--comparison-position': `${position}%` } as CSSProperties;

  return (
    <figure className={ground ? 'dns-case-figure rocket-shot-debris' : 'dns-case-figure'}
      aria-labelledby={headingId} data-mascot-comment={after.comment}>
      <div ref={tile} className="case-cover dns-comparison-tile" data-media-gallery data-mascot-surface="screen"
        data-mascot-highlight-speech={highlightSpeech ? '' : undefined} style={style}>
        <input className="dns-comparison-control" {...iconTilePress} type="range" min="0" max="100" value={displayedPosition}
          aria-label={sliderLabel}
          aria-valuetext={`Было — ${displayedPosition}%, стало — ${100 - displayedPosition}%`}
          onChange={(event) => moveTo(event.currentTarget.valueAsNumber)}
          onPointerDown={startDrag} onKeyDown={stopCoast} onBlur={stopCoast} />
        <div className="dns-comparison-frame" data-side="before" hidden={position === 0}>
          {renderScreenshot(before)}
        </div>
        <div className="dns-comparison-frame" data-side="after" hidden={position === 100}>
          {renderScreenshot(after)}
        </div>
        <span className="dns-comparison-divider" aria-hidden="true" />
        <span className="icon-tile icon-tile--secondary dns-comparison-handle" aria-hidden="true">
          <GridIcon name="left" />
          <GridIcon name="right" />
        </span>
      </div>
      {ground && (
        <span className="rocket-shot-ground" aria-hidden="true">
          <canvas ref={ground} hidden />
        </span>
      )}
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
  const toggleCaption = useRef<HTMLElement>(null);
  const groundCanvas = useRef<HTMLCanvasElement>(null);

  function renderFigure(figure: CaseFigure, { captionTarget }: {
    captionTarget?: RefObject<HTMLElement | null>;
  } = {}) {
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
        <CaseCard as="section" className="dns-case-summary" aria-labelledby="dns-summary" comment="intro">
          <DnsHeading as="h2" id="dns-summary" />
          <p className="dns-summary-context">{renderCaseText(summary.context)}</p>
          <dl>
            <div><dt>Проблема</dt><dd>{renderCaseText(summary.problem)}</dd></div>
            <div><dt>Решение</dt><dd>{renderCaseText(summary.solution)}</dd></div>
            <div><dt>Эффект</dt><dd>{summary.effect}</dd></div>
            <div><dt>Ограничения</dt><dd>{summary.limits}</dd></div>
          </dl>
          <div className="dns-summary-actions">
            <button className="icon-tile icon-tile--labeled icon-tile--secondary" {...iconTilePress} type="button" onClick={() => jumpToHeading('dns-decisions')}>
              <span className="icon-tile-label">К решениям</span>
            </button>
            <button className="icon-tile icon-tile--labeled icon-tile--secondary" {...iconTilePress} type="button" onClick={() => jumpToHeading('dns-results')}>
              <span className="icon-tile-label">К результатам UX-теста</span>
            </button>
            <a className="icon-tile icon-tile--labeled icon-tile--lit dns-summary-configurator" {...iconTilePress}
              href={dnsDemoLink.href} target="_blank" rel="noopener" data-track-id={dnsDemoLink.id}>
              <span className="icon-tile-label">{dnsConfiguratorLink.label}<GridIcon name="link" /></span>
            </a>
          </div>
        </CaseCard>
      </header>

      <CaseSection id="dns-research" title={research.title}>
        <section className="dns-case-group" aria-labelledby="dns-desk-research">
          <div className="dns-case-block">
            <DnsHeading id="dns-desk-research" />
            <p>{research.discussionAction}</p>
          </div>
          <div className="dns-case-block">
            <CaseCardList aria-label="Наблюдения из обсуждений сборок" comment="external-review">
              {research.deskMetrics.map(renderMetric)}
            </CaseCardList>
            <p>{renderCaseText(research.discussionConclusion)}</p>
          </div>
        </section>
        <section className="dns-case-group" aria-labelledby="dns-audit">
          <div className="dns-case-block">
            <DnsHeading id="dns-audit" />
            <p>{research.auditAction}</p>
          </div>
          <div className="dns-case-block">
            <h4 id="dns-audit-problems">{research.auditProblemsTitle}</h4>
            <CaseCardList aria-labelledby="dns-audit-problems">
              {research.auditProblems.map(renderFact)}
            </CaseCardList>
            <p>{renderCaseText(research.auditConclusion)}</p>
          </div>
        </section>
        <CaseEvidence id="dns-interviews" headingId="dns-interview-task" heading={<DnsHeading id="dns-interview-task" />}
          introduction={research.interviewAction} panelId="dns-interview-quotes" panelTitle={research.interviewDetailsTitle}
          evidence={<>
            {research.interviewQuotes.map(({ title, detail, quote, followUp }) => (
              <div className="case-evidence-entry" key={title}>
                <h5>{title}</h5>
                <blockquote><p>{quote}</p></blockquote>
                <p>{detail}</p>
                {followUp && <p>{followUp}</p>}
              </div>
            ))}
            <p>{research.interviewPrompt}</p>
            <p>{research.interviewResultsLimit}</p>
          </>}>
          <div className="dns-case-block" id="dns-interview-results">
            <CaseResults aria-label="Наблюдения из сессий">
              {research.interviewFindings.map(renderMetric)}
            </CaseResults>
            <p>{renderCaseText(research.interviewConclusion)}</p>
          </div>
          <div className="dns-case-block" data-mascot-comment="comparison-search">
            <InterviewGallery label={research.framesTitle}>
              {research.frames.map((figure) => renderFigure(figure))}
            </InterviewGallery>
          </div>
        </CaseEvidence>
        <section className="dns-case-group" aria-labelledby="dns-competitors">
          <div className="dns-case-block">
            <DnsHeading id="dns-competitors" />
            <p>{research.competitors.action}</p>
          </div>
          <div className="dns-case-block">
            <CaseCardList aria-label="Наблюдения по конкурентам">
              {research.competitors.findings.map(renderFact)}
            </CaseCardList>
            <p>{renderCaseText(research.competitors.conclusion)}</p>
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
            <p>{renderCaseText(research.prioritization.rationale)}</p>
          </div>
          <div className="dns-decision-copy" data-mascot-row="">
            <CaseCardList as="ol" className="case-hypotheses" aria-label="Гипотезы для прототипа">
              {dnsDecisions.map(({ hypothesis, contentsLabel, hypothesisText }) => renderFact({
                title: `Гипотеза ${hypothesis} · ${contentsLabel}`,
                detail: renderCaseText(hypothesisText.join('**')),
              }))}
            </CaseCardList>
            {renderFigure(research.prioritization.evidence)}
          </div>
        </section>
      </CaseSection>

      <CaseSection id="dns-decisions" title={decisionsTitle}>
        {dnsDecisions.map((decision) => {
          const [before, emphasis, after] = decision.hypothesisText;
          return (
            <section className="dns-case-group" key={decision.id} aria-labelledby={decision.id}>
              <div className="dns-case-block">
                <DnsHeading id={decision.id} />
                <div className="dns-case-frames" data-media-gallery data-mascot-comment={decision.comment}>
                  {decision.detailFrames.map((figure) => renderFigure(figure))}
                </div>
              </div>
              <div className="dns-case-block" data-mascot-comment={decision.comment}>
                {decision.solutionFigure && renderFigure(decision.solutionFigure)}
                <DnsComparison frames={decision.comparison} headingId={decision.id}
                  highlightSpeech={decision.id === 'dns-return'} renderScreenshot={renderScreenshot} />
              </div>
              <CaseDecisionCopy hypothesisNumber={decision.hypothesis} hypothesis={(
                <blockquote cite={test.journalSource}>
                  <p>{before}<strong className="dns-copy-emphasis">{emphasis}</strong>{after}</p>
                </blockquote>
              )} solution={<p>{renderCaseText(decision.solution)}</p>} />
              <section className="dns-case-block dns-decision-check">
                <h4>Результат</h4>
                <CaseResults aria-label={`Результат. ${decision.contentsLabel}`}>
                  {decision.metrics.map(renderMetric)}
                </CaseResults>
              </section>
              {decision.id === 'dns-comparison' && (
                <>
                  <section className="dns-case-block" aria-labelledby="dns-comparison-iteration">
                    <h4 id="dns-comparison-iteration">{comparison.iteration.title}</h4>
                    <div className="dns-case-frames" data-media-gallery>
                      {renderFigure(comparison.iteration.toggleFigure, { captionTarget: toggleCaption })}
                      {renderFigure(comparison.iteration.differencesFigure)}
                    </div>
                    <DnsComparison frames={comparison.iteration.frames} headingId="dns-comparison-iteration"
                      sliderLabel="Разделитель «Было / Стало» для сравнения по наведению" renderScreenshot={renderScreenshot}
                      ground={groundCanvas} />
                    {rocketActor && <RocketShot target={toggleCaption} actor={rocketActor} ground={groundCanvas} />}
                  </section>
                  <section className="dns-case-block">
                    <h4 className="dns-case-labeled-heading">
                      <span>Результат</span>
                      <span className="dns-case-heading-label">{comparison.iteration.label}</span>
                    </h4>
                    <CaseCardList layout="strip" aria-label="Результат раннего теста">
                      {renderFact(comparison.iteration.fact)}
                    </CaseCardList>
                  </section>
                </>
              )}
            </section>
          );
        })}
      </CaseSection>

      <CaseSection id="dns-results" title={test.title}>
        <section className="dns-case-group" aria-labelledby="dns-scenario" data-mascot-comment="ryzen-review">
          <div className="dns-case-block">
            <DnsHeading id="dns-scenario" />
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
        <section className="dns-case-block" aria-labelledby="dns-test-overview">
          <DnsHeading id="dns-test-overview" />
          <p>{test.action}</p>
          <CaseCardList aria-label="Основные результаты UX-теста">
            {test.overview.map(renderMetric)}
          </CaseCardList>
          <p>{renderCaseText(test.conclusion)}</p>
          <CaseTestAccounting text={test.accounting} journalHref={test.journalSource} />
        </section>
        <CaseSection as="h3" id="dns-next-test" sectionId="dns-reflection" title={reflection.title}
          variant="labeled" note={reflectionNote}>
          <CaseCardList aria-label="Итоги проверки">
            {reflection.takeaways.map(({ detail, ...fact }) => renderFact({
              ...fact,
              detail: renderCaseText(detail),
            }))}
          </CaseCardList>
        </CaseSection>
      </CaseSection>
    </>
  );
}
