import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { adjacentSlide, slidesInGallery, swipeDirection } from '../components/media-navigation';
import { dnsContents } from '../data/dnsCase';
import { projectResults } from '../data/projectResults';
import { projects, type Project, type ProjectImage } from '../data/projects';
import { Mascot, ViewportMascot } from '../effects/mascot/Mascot';
import { createFlight } from '../effects/shared-cover/flight';
import { PixelViewportEdges } from '../effects/viewport-edges/PixelViewportEdges';
import { DnsCase } from './DnsCase';
import '../effects/case-pixels/case-pixels.css';

const cases: readonly Project[] = [
  ...projects,
  { id: 'preview', title: 'Кейс 3', summary: 'Место для следующего проекта', links: [] },
];
const resizeScreensOnZoom = '[data-portrait-preview], :has(> .case-cover-strip)';

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

function CaseScreenshot({ image, onOpen }: {
  image: ProjectImage;
  onOpen: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <button type="button" className="case-zoom-trigger case-screenshot" aria-label={`Увеличить: ${image.alt}`}
      onClick={(event) => onOpen(event.currentTarget)}>
      <span className="case-cover case-screenshot-media" style={screenshotSize(image)}
        data-portrait-preview={image.height > image.width ? '' : undefined} data-fit={image.showFull ? '' : undefined}>
        <CaseScreenshotFrame image={image} loading="lazy" />
      </span>
    </button>
  );
}

function showMedia(content: HTMLElement, source: HTMLElement) {
  const media = source.cloneNode(true) as HTMLElement;
  media.removeAttribute('data-cover');
  media.style.removeProperty('visibility');
  media.querySelector('img')?.removeAttribute('loading');
  content.replaceChildren(media);
  return media;
}

type Gallery = { slides: HTMLButtonElement[]; index: number; origin: HTMLButtonElement };

export function ProjectsSection({ page }: { page: RefObject<HTMLElement | null> }) {
  const [selected, setSelected] = useState(readCase);
  const [arrived, setArrived] = useState(true);
  const [returnedFromCase, setReturnedFromCase] = useState(false);
  const [activeHeading, setActiveHeading] = useState(dnsContents[0].id);
  const [contentsVisible, setContentsVisible] = useState(false);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const section = useRef<HTMLElement>(null);
  const caseBack = useRef<HTMLAnchorElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogContent = useRef<HTMLDivElement>(null);
  const mediaSwipe = useRef<{ pointer: number; x: number; y: number } | null>(null);
  const suppressMediaClick = useRef(false);
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
    if (dialog.current?.open) dismissMedia();
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
      const link = target?.closest('a');
      (link?.getClientRects().length ? link : element).focus({ preventScroll: true });
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
    const slides = slidesInGallery(trigger);
    const index = slides.indexOf(trigger);
    if (index < 0) return;
    mediaFlight.current?.();
    const flight = createFlight(source, source.matches(resizeScreensOnZoom));
    const media = showMedia(content, source);
    setGallery({ slides, index, origin: trigger });
    viewer.showModal();
    mediaFlight.current = flight?.to(media, undefined, viewer);
  }

  function moveMedia(direction: -1 | 1) {
    const content = dialogContent.current;
    if (!gallery || gallery.slides.length < 2 || !content) return;
    const index = adjacentSlide(gallery.index, gallery.slides.length, direction);
    const source = gallery.slides[index].firstElementChild;
    if (!(source instanceof HTMLElement)) return;
    mediaFlight.current?.();
    showMedia(content, source);
    setGallery({ ...gallery, index });
  }

  function dismissMedia() {
    dialog.current?.close();
    dialogContent.current?.replaceChildren();
    mediaSwipe.current = null;
    suppressMediaClick.current = false;
    setGallery(null);
  }

  function closeMedia() {
    const content = dialogContent.current;
    if (!dialog.current?.open || !gallery || !content) return;
    mediaFlight.current?.();
    const target = gallery.origin.firstElementChild;
    if (!(target instanceof HTMLElement)) {
      dismissMedia();
      return;
    }
    const source = gallery.slides[gallery.index] === gallery.origin ? content.firstElementChild : showMedia(content, target);
    const flight = source instanceof HTMLElement && createFlight(source, source.matches(resizeScreensOnZoom));
    dismissMedia();
    gallery.origin.focus({ preventScroll: true });
    mediaFlight.current = flight ? flight.to(target) : undefined;
  }

  function finishMediaSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = mediaSwipe.current;
    mediaSwipe.current = null;
    if (!start || start.pointer !== event.pointerId) return;
    const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y);
    if (!direction) return;
    suppressMediaClick.current = true;
    moveMedia(direction);
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
        <article key={item.id} className={isDns ? 'dns-case-layout' : undefined} data-section-id={`project-${item.id}`}>
          <div className="case-covers" data-media-gallery role="region" aria-label="Обложки кейса" tabIndex={0}
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
            {item.screens ? item.screens.map(({ id, image }, index) => {
              const primary = index === 0;
              const collage = primary && Boolean(item.coverImages?.length);
              return (
                <button key={id} type="button"
                  className={primary ? 'case-zoom-trigger' : 'case-zoom-trigger case-cover-secondary'}
                  aria-label={collage ? `Увеличить обложку кейса «${item.title}»` : `Увеличить: ${image.alt}`}
                  onClick={(event) => openMedia(event.currentTarget)}>
                  <span className="case-cover case-screenshot-media"
                    data-cover={primary ? item.id : undefined}
                    style={collage ? undefined : screenshotSize(image)}>
                    {collage ? <CaseCoverArtwork project={item} /> : <CaseScreenshotFrame image={image} />}
                  </span>
                </button>
              );
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
            <ViewportMascot />
            <div className={isDns ? 'case-body dns-case-body' : 'case-body'} data-arrived={arrived}>
              {isDns ? (
                <DnsCase jumpToHeading={jumpToHeading}
                  renderScreenshot={(image) => <CaseScreenshot image={image} onOpen={openMedia} />} />
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
                    <div className="case-gallery" data-media-gallery>
                      {[1, 2].map((number) => (
                        <button type="button" key={number} className="case-zoom-trigger" aria-label={`Увеличить изображение ${number}`}
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
          {isDns && arrived && <PixelViewportEdges root={section} targetSelector=".case-covers, .dns-case-body > *" />}
        </article>
      ) : (
        <>
          <div className="case-grid">
            {projects.map((entry: Project) => (
              <article className="case-tile" key={entry.id} data-section-id={`project-${entry.id}`}>
                <a className="tile-layout" href={`#case-${entry.id}`} onClick={(event) => {
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
                      <strong>{entry.title}</strong>
                      <span className="tile-summary">{entry.tileSummary ?? entry.summary}</span>
                      <span className="pixel-chevron tile-chevron" aria-hidden="true" />
                    </span>
                    <span className="tile-preview" aria-hidden="true">
                      {entry.tileIllustration && <img src={entry.tileIllustration} alt="" loading="lazy" />}
                    </span>
                  </span>
                </a>
                {projectResults[`project-${entry.id}`] && (
                  <p className="mascot-speech__transcript">{projectResults[`project-${entry.id}`]}</p>
                )}
              </article>
            ))}
            <article className="case-tile case-tile-placeholder" data-section-id="project-preview">
              <div className="tile-layout" aria-hidden="true">
                <span className="case-cover" data-cover="preview" />
                <span className="tile-side">
                  <span className="tile-copy">
                    <span className="tile-skeleton-line" />
                    <span className="tile-skeleton-line" />
                  </span>
                  <span className="tile-preview" />
                </span>
              </div>
              <span className="tile-status">скоро будет</span>
            </article>
            <Mascot resumeRoute={returnedFromCase} results={projectResults} />
          </div>
          <PixelViewportEdges root={page} targetSelector=".case-tile, .intro" />
        </>
      )}
      <dialog ref={dialog} className="case-dialog" aria-label="Просмотр изображения"
        onCancel={(event) => { event.preventDefault(); closeMedia(); }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          moveMedia(event.key === 'ArrowLeft' ? -1 : 1);
        }}
        onClick={(event) => { if (event.target === event.currentTarget) closeMedia(); }}>
        <button type="button" className="gallery-close" onClick={closeMedia}>Закрыть ×</button>
        <div ref={dialogContent} className="gallery-media-full" />
        {gallery && gallery.slides.length > 1 && (
          <>
            <div className="gallery-navigation"
              onPointerDown={(event) => {
                suppressMediaClick.current = false;
                mediaSwipe.current = event.isPrimary && event.pointerType === 'touch'
                  ? { pointer: event.pointerId, x: event.clientX, y: event.clientY } : null;
              }}
              onPointerUp={finishMediaSwipe}
              onPointerCancel={() => { mediaSwipe.current = null; }}
              onClickCapture={(event) => {
                if (!suppressMediaClick.current || event.detail === 0) return;
                suppressMediaClick.current = false;
                event.stopPropagation();
              }}>
              <button type="button" className="gallery-previous" aria-label="Предыдущий скриншот" onClick={() => moveMedia(-1)} />
              <button type="button" className="gallery-next" aria-label="Следующий скриншот" onClick={() => moveMedia(1)} />
            </div>
            <span role="status" className="gallery-position">Кадр {gallery.index + 1} из {gallery.slides.length}</span>
          </>
        )}
      </dialog>
    </section>
  );
}
