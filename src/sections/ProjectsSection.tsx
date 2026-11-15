import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { flushSync } from 'react-dom';
import { dnsContents } from '../data/dnsCase';
import { projects, type Project, type ProjectImage } from '../data/projects';
import { Mascot, ViewportMascot } from '../effects/mascot/Mascot';
import { createFlight } from '../effects/shared-cover/flight';
import { DnsCase } from './DnsCase';

const cases: readonly Project[] = [
  ...projects,
  { id: 'preview', title: 'Кейс 3', summary: 'Место для следующего проекта', links: [] },
];

function readCase() {
  const id = window.location.hash.slice(6);
  return window.location.hash.startsWith('#case-') && cases.some((item) => item.id === id) ? id : null;
}

function headingAlignment(heading: HTMLElement) {
  const style = getComputedStyle(heading);
  return {
    offset: parseFloat(style.scrollMarginTop),
    anchor: parseFloat(style.getPropertyValue('--dns-case-heading-anchor')),
  };
}

function screenshotSize(image: ProjectImage): CSSProperties {
  return { '--screenshot-ratio': image.width / image.height } as CSSProperties;
}

type CaseScreenshotProps = {
  image: ProjectImage;
  decorative?: boolean;
  loading?: 'lazy';
};

function CaseScreenshotImage({ image, decorative, loading }: CaseScreenshotProps) {
  const { src, width, height, alt, roundedCorners } = image;
  return <img src={src} width={width} height={height} alt={decorative ? '' : alt} loading={loading} draggable={false}
    data-rounded-screen={roundedCorners ? '' : undefined} />;
}

function CaseScreenshotFrame({ image, decorative, loading }: CaseScreenshotProps) {
  return (
    <span className="case-cover-frame" data-cropped={image.width > image.height ? '' : undefined}
      data-portrait={image.height > image.width ? '' : undefined}>
      <CaseScreenshotImage image={image} decorative={decorative} loading={loading} />
    </span>
  );
}

function CaseCoverArtwork({ project, decorative = false }: { project: Project; decorative?: boolean }) {
  if (project.coverImages?.length) {
    return (
      <span className="case-cover-frame case-cover-strip">
        {project.coverImages.map((image) => (
          <CaseScreenshotImage key={image.src} image={image} decorative={decorative} />
        ))}
      </span>
    );
  }
  const image = project.screens?.[0]?.image;
  return image ? <CaseScreenshotFrame image={image} decorative={decorative} /> : null;
}

function CaseScreenshot({ image, onOpen, fit }: {
  image: ProjectImage;
  onOpen: (trigger: HTMLButtonElement) => void;
  fit?: boolean;
}) {
  return (
    <button type="button" className="case-zoom-trigger case-screenshot" aria-label={`Увеличить: ${image.alt}`}
      onClick={(event) => onOpen(event.currentTarget)}>
      <span className="case-cover case-screenshot-media" style={screenshotSize(image)}
        data-portrait-preview={image.height > image.width ? '' : undefined} data-fit={fit ? '' : undefined}>
        <CaseScreenshotFrame image={image} loading="lazy" />
      </span>
    </button>
  );
}

export function ProjectsSection() {
  const [selected, setSelected] = useState(readCase);
  const [arrived, setArrived] = useState(true);
  const [returnedFromCase, setReturnedFromCase] = useState(false);
  const [activeHeading, setActiveHeading] = useState(dnsContents[0].id);
  const [contentsVisible, setContentsVisible] = useState(false);
  const section = useRef<HTMLElement>(null);
  const caseBack = useRef<HTMLAnchorElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogContent = useRef<HTMLDivElement>(null);
  const galleryOrigin = useRef<HTMLButtonElement>(null);
  const coverFlight = useRef<(() => void) | undefined>(undefined);
  const mediaFlight = useRef<(() => void) | undefined>(undefined);
  const coverDrag = useRef<{ pointer: number; x: number; scroll: number } | null>(null);
  const scrollPoint = useRef(0);
  const item = cases.find((entry) => entry.id === selected);
  const isDns = item?.id === 'dns';
  function transition(next: string | null) {
    const element = section.current;
    if (!element || selected === next) return;
    coverDrag.current = null;
    coverFlight.current?.();
    mediaFlight.current?.();
    if (dialog.current?.open) dialog.current.close();
    const id = next ?? selected;
    const origin = element.querySelector<HTMLElement>(`[data-cover="${id}"]`);
    const flight = origin && createFlight(origin);
    if (next) scrollPoint.current = window.scrollY;
    flushSync(() => {
      setSelected(next);
      setArrived(!flight);
      setContentsVisible(false);
      if (!next) setReturnedFromCase(true);
    });
    const target = element.querySelector<HTMLElement>(`[data-cover="${id}"]`);
    if (next) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      caseBack.current?.focus({ preventScroll: true });
    } else {
      window.scrollTo({ top: scrollPoint.current, behavior: 'instant' });
      target?.closest('a')?.focus({ preventScroll: true });
    }

    if (flight && target) {
      coverFlight.current = flight.to(target, () => setArrived(true));
    } else {
      flight?.discard();
      setArrived(true);
    }
  }

  useEffect(() => {
    const sync = () => transition(readCase());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  });

  useEffect(() => () => {
    coverFlight.current?.();
    mediaFlight.current?.();
  }, []);

  useEffect(() => {
    if (!isDns || !arrived) return;
    const overview = section.current?.querySelector('.dns-case-overview');
    const overviewHeading = document.getElementById(dnsContents[0].id);
    if (!overview || !overviewHeading) return;
    const headings = [...dnsContents].reverse().map(({ id }) => document.getElementById(id));
    let alignment = headingAlignment(overviewHeading);
    const update = () => {
      const overviewBottom = overview.getBoundingClientRect().bottom;
      // The mobile contents bar counts as the top of the reading area once revealed.
      const readingTop = alignment.anchor === 0 ? alignment.offset : 0;
      setContentsVisible((visible) => overviewBottom <= (visible ? readingTop : 0));
      const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
      const current = atBottom ? headings[0] : headings.find((heading) => {
        if (!heading) return false;
        const { top, height } = heading.getBoundingClientRect();
        return top + height * alignment.anchor <= alignment.offset + 1;
      });
      setActiveHeading(current?.id ?? dnsContents[0].id);
    };
    const resize = () => {
      alignment = headingAlignment(overviewHeading);
      update();
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', resize);
    };
  }, [isDns, arrived]);

  function jumpToHeading(id: string) {
    const heading = document.getElementById(id);
    if (!heading) return;
    heading.focus({ preventScroll: true });
    if (isDns) {
      const { offset, anchor } = headingAlignment(heading);
      const { top, height } = heading.getBoundingClientRect();
      setActiveHeading(id);
      window.scrollBy({ top: top + height * anchor - offset, behavior: 'instant' });
    } else {
      heading.scrollIntoView({ block: 'start' });
    }
  }

  function openMedia(trigger: HTMLButtonElement) {
    const viewer = dialog.current;
    const content = dialogContent.current;
    const source = trigger.firstElementChild;
    if (!viewer || !content || !(source instanceof HTMLElement)) return;
    mediaFlight.current?.();
    galleryOrigin.current = trigger;
    const flight = createFlight(source, source.hasAttribute('data-portrait-preview'));
    const media = source.cloneNode(true) as HTMLElement;
    media.removeAttribute('data-cover');
    media.querySelector('img')?.removeAttribute('loading');
    content.replaceChildren(media);
    viewer.showModal();
    mediaFlight.current = flight?.to(media, undefined, viewer);
  }

  function closeMedia() {
    const viewer = dialog.current;
    const source = dialogContent.current?.firstElementChild;
    const target = galleryOrigin.current?.firstElementChild;
    if (!viewer?.open || !(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return;
    mediaFlight.current?.();
    const flight = createFlight(source, source.hasAttribute('data-portrait-preview'));
    viewer.close();
    galleryOrigin.current?.focus({ preventScroll: true });
    mediaFlight.current = flight?.to(target);
  }

  function stopCoverDrag(event: PointerEvent<HTMLDivElement>) {
    if (coverDrag.current?.pointer !== event.pointerId) return;
    coverDrag.current = null;
    delete event.currentTarget.dataset.dragging;
  }

  const contents: readonly { id: string; label: string; note?: string }[] = isDns ? dnsContents : [
    { id: 'projects-heading', label: 'Обзор' },
    ...(item?.screens?.map((screen) => ({ id: screen.id, label: screen.title })) ??
      [{ id: 'case-gallery-heading', label: 'Интерфейсы' }]),
    ...(item?.links.length ? [{ id: 'case-materials-heading', label: 'Материалы' }] : []),
  ];
  const contentsList = (
    <ul>
      {contents.map(({ id, label, note }) => (
        <li key={id}>
          <button type="button" onClick={() => jumpToHeading(id)}
            aria-label={note ? label : undefined}
            aria-describedby={note ? `${id}-contents-note` : undefined}
            aria-current={isDns && activeHeading === id ? 'location' : undefined}>
            <span className="case-contents-title">{label}</span>
            {note && <span id={`${id}-contents-note`} className="case-contents-note">{note}</span>}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <section id="projects" ref={section} className="projects" data-case-open={item ? '' : undefined}
      aria-labelledby={item ? 'projects-heading' : undefined}
      aria-label={item ? undefined : 'Кейсы'} tabIndex={-1}>
      {item ? (
        <article className={isDns ? 'dns-case-layout' : undefined} data-section-id={`project-${item.id}`}>
          <div className="case-covers" key={item.id} role="region" aria-label="Обложки кейса" tabIndex={0}
            onPointerDown={(event) => {
              if (event.pointerType !== 'mouse' || event.button !== 0) return;
              const strip = event.currentTarget;
              if (strip.scrollWidth <= strip.clientWidth) return;
              coverDrag.current = { pointer: event.pointerId, x: event.clientX, scroll: strip.scrollLeft };
            }}
            onPointerMove={(event) => {
              const drag = coverDrag.current;
              const strip = event.currentTarget;
              if (!drag || drag.pointer !== event.pointerId) return;
              if (!(event.buttons & 1)) {
                stopCoverDrag(event);
                return;
              }
              const offset = drag.x - event.clientX;
              if (!strip.hasPointerCapture(event.pointerId)) {
                if (Math.abs(offset) < 5) return;
                strip.setPointerCapture(event.pointerId);
                strip.dataset.dragging = '';
              }
              strip.scrollLeft = drag.scroll + offset;
            }}
            onPointerUp={stopCoverDrag}
            onPointerLeave={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) stopCoverDrag(event);
            }}
            onPointerCancel={stopCoverDrag} onLostPointerCapture={stopCoverDrag}>
            {item.screens ? item.screens.map(({ id, description, image }, index) => {
              const primary = index === 0;
              const collage = primary && Boolean(item.coverImages?.length);
              const preview = (
                <button key={id} type="button"
                  className={primary ? 'case-zoom-trigger' : 'case-zoom-trigger case-cover-secondary'}
                  aria-label={collage ? `Увеличить обложку кейса «${item.title}»` : `Увеличить: ${image.alt}`}
                  onClick={(event) => openMedia(event.currentTarget)}>
                  <span className="case-cover case-screenshot-media" data-cover={primary ? item.id : undefined}
                    style={collage ? undefined : screenshotSize(image)}>
                    {collage ? <CaseCoverArtwork project={item} /> : <CaseScreenshotFrame image={image} />}
                  </span>
                </button>
              );
              return isDns ? (
                <figure key={id} className="dns-case-cover">
                  {preview}
                  <figcaption>{description}</figcaption>
                </figure>
              ) : preview;
            }) : (
              <>
                <div className="case-cover" data-cover={item.id} aria-hidden="true" />
                <div className="case-cover case-cover-secondary" aria-hidden="true" />
              </>
            )}
          </div>
          <div className="case-layout">
            <nav className="case-nav" data-dns-contents={isDns ? '' : undefined} aria-label="Навигация по кейсу">
              <a ref={caseBack} className="case-back" href="#projects" aria-label="К кейсам" onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                if (history.state?.fromCaseList) history.back();
                else {
                  history.replaceState(null, '', '#projects');
                  transition(null);
                }
              }}>
                <span className="pixel-chevron" aria-hidden="true" />
              </a>
              {!isDns && <p>Содержание</p>}
              {(!isDns || contentsVisible) && contentsList}
            </nav>
            <div className={isDns ? 'case-body dns-case-body' : 'case-body'} data-arrived={arrived}>
              {isDns ? (
                <DnsCase jumpToHeading={jumpToHeading}
                  renderScreenshot={(image) => <CaseScreenshot image={image} onOpen={openMedia} fit />} />
              ) : (
                <>
                  <div className="case-text">
                    <h1 id="projects-heading" tabIndex={-1}>{item.title}</h1>
                    <p>{item.summary}</p>
                  </div>
                  {item.screens?.map(({ id, title, description, image }) => (
                    <section className="case-content-section" key={id} aria-labelledby={id}>
                      <div className="case-text">
                        <h2 id={id} tabIndex={-1}>{title}</h2>
                        <p>{description}</p>
                      </div>
                      <CaseScreenshot image={image} onOpen={openMedia} />
                    </section>
                  ))}
                  {!item.screens && <section className="case-content-section" aria-labelledby="case-gallery-heading">
                    <h2 id="case-gallery-heading" className="case-text" tabIndex={-1}>Интерфейсы</h2>
                    <div className="case-gallery">
                      {[1, 2].map((number) => (
                        <button type="button" key={number} aria-label={`Увеличить изображение ${number}`}
                          onClick={(event) => openMedia(event.currentTarget)}>
                          <span className="gallery-media" data-media={number} />
                        </button>
                      ))}
                    </div>
                  </section>}
                  {item.links.length > 0 && (
                    <section className="case-content-section case-text" aria-labelledby="case-materials-heading">
                      <h2 id="case-materials-heading" tabIndex={-1}>Материалы</h2>
                      <ul className="project-links">
                        {item.links.map((link) => (
                          <li key={link.id}><a href={link.href} data-track-id={link.id}>{link.label}</a></li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </div>
          </div>
          <ViewportMascot key={item.id} />
        </article>
      ) : (
        <>
          <div className="case-grid">
            {cases.map((entry) => (
              <article className="case-tile" key={entry.id} data-section-id={`project-${entry.id}`}>
                <a href={`#case-${entry.id}`} onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  history.pushState({ fromCaseList: true }, '', `#case-${entry.id}`);
                  transition(entry.id);
                }}>
                  <span className="case-cover" data-cover={entry.id} aria-hidden="true">
                    <CaseCoverArtwork project={entry} decorative />
                  </span>
                  <span className="tile-side">
                    <span className="tile-copy">
                      <span className="tile-arrow" aria-hidden="true">↗</span>
                      <strong>{entry.title}</strong>
                      <span className="tile-summary">{entry.summary}</span>
                    </span>
                    <span className="tile-preview" aria-hidden="true">
                      {entry.tileIllustration && <img src={entry.tileIllustration} alt="" loading="lazy" />}
                    </span>
                  </span>
                </a>
              </article>
            ))}
            <Mascot resumeRoute={returnedFromCase} />
          </div>
        </>
      )}
      <dialog ref={dialog} className="case-dialog" aria-label="Просмотр изображения"
        onCancel={(event) => { event.preventDefault(); closeMedia(); }}
        onClick={(event) => { if (event.target === event.currentTarget) closeMedia(); }}>
        <button type="button" className="gallery-close" onClick={closeMedia}>Закрыть ×</button>
        <div ref={dialogContent} className="gallery-media-full" />
      </dialog>
    </section>
  );
}
