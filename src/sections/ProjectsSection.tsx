import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type Ref, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { ContactButtons } from '../components/ContactButtons';
import { connectCoverPlayback } from '../components/cover-playback';
import { iconTilePress } from '../components/icon-tile-press';
import { adjacentSlide, slidesInGallery, swipeDirection } from '../components/media-navigation';
import { dnsCase, dnsContents, dnsMascotComments } from '../data/dnsCase';
import { projectResults } from '../data/projectResults';
import { projects, type Project, type ProjectImage } from '../data/projects';
import { site } from '../data/site';
import { viCase, viContents, viMascotComments } from '../data/vseinstrumentiCase';
import { replaceGallerySlide } from '../effects/gallery-slide/transition';
import { Mascot, ViewportMascot } from '../effects/mascot/Mascot';
import { CaseMascot } from '../effects/mascot/CaseMascot';
import { createFlight } from '../effects/shared-cover/flight';
import { PixelViewportEdges } from '../effects/viewport-edges/PixelViewportEdges';
import { DnsCase } from './DnsCase';
import { VseinstrumentiCase } from './VseinstrumentiCase';
import '../effects/case-pixels/case-pixels.css';
import '../effects/gallery-slide/transition.css';

const cases: readonly Project[] = [
  ...projects,
  { id: 'preview', title: 'Кейс 3', summary: 'Место для следующего проекта', links: [] },
];
const resizeScreensOnZoom = '[data-portrait-preview], [data-preview-crop], :has(> .case-cover-strip)';

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

function previewCropStyle(image: ProjectImage): CSSProperties | undefined {
  const crop = image.previewCrop;
  if (!crop) return;
  return {
    '--preview-crop-ratio': image.width / crop.height,
    '--preview-crop-translate': `${-(crop.top + crop.height / 2) / image.height * 100}%`,
  } as CSSProperties;
}

function screenshotAttributes(image: ProjectImage) {
  return {
    'data-preview-crop': image.previewCrop ? '' : undefined,
    'data-fit': image.showFull ? '' : undefined,
    style: {
      '--screenshot-ratio': image.width / image.height,
      ...previewCropStyle(image),
    } as CSSProperties,
  };
}

type CaseScreenshotProps = {
  image: ProjectImage;
  decorative?: boolean;
  loading?: 'lazy';
};

function CaseScreenshotImage({ image, decorative, loading, cropPreview }: CaseScreenshotProps & { cropPreview?: boolean }) {
  const { src, width, height, alt, roundedCorners, cropInset } = image;
  const fixedRadius = typeof roundedCorners === 'number';
  return <img src={src} width={width} height={height} alt={decorative ? '' : alt} loading={loading} draggable={false}
    data-rounded-screen={fixedRadius ? 'fixed' : roundedCorners ? '' : undefined}
    style={{
      borderRadius: fixedRadius ? roundedCorners : undefined,
      clipPath: cropInset ? `inset(${cropInset}px round ${fixedRadius ? roundedCorners : 0}px)` : undefined,
      ...(cropPreview ? previewCropStyle(image) : undefined),
    }} />;
}

function CaseScreenshotFrame({ image, decorative, loading }: CaseScreenshotProps) {
  return (
    <span className="case-cover-frame" data-cropped={image.width > image.height ? '' : undefined}
      data-portrait={image.height > image.width ? '' : undefined}>
      <CaseScreenshotImage image={image} decorative={decorative} loading={loading} />
    </span>
  );
}

function CaseCoverStrip({ images, decorative = false }: { images: readonly ProjectImage[]; decorative?: boolean }) {
  const previewRatio = Math.min(...images.map((image) => image.width / (image.previewCrop?.height ?? image.height)));
  return (
    <span className="case-cover-frame case-cover-strip"
      data-cover-crops={images.some((image) => image.previewCrop) ? '' : undefined}
      style={{ '--cover-screen-count': images.length, '--cover-preview-ratio': previewRatio } as CSSProperties}>
      {images.map((image) => (
        <CaseScreenshotImage key={image.src} image={image} decorative={decorative} cropPreview />
      ))}
    </span>
  );
}

function CaseCoverArtwork({ project, decorative = false, videoRef }: {
  project: Project;
  decorative?: boolean;
  videoRef?: Ref<HTMLVideoElement>;
}) {
  if (project.coverVideo) {
    const { src, poster, title } = project.coverVideo;
    return (
      <span className="case-cover-frame case-cover-video">
        <video ref={videoRef} src={src} poster={poster} preload="none" muted loop playsInline aria-label={title} />
      </span>
    );
  }
  if (project.coverImages?.length) {
    return <CaseCoverStrip images={project.coverImages} decorative={decorative} />;
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
      data-original-src={image.original?.src} data-original-alt={image.original?.alt}
      onClick={(event) => onOpen(event.currentTarget)}>
      <span className="case-cover case-screenshot-media" {...screenshotAttributes(image)}
        data-portrait-preview={!image.previewCrop && image.height > image.width ? '' : undefined}>
        <CaseScreenshotFrame image={image} loading="lazy" />
      </span>
    </button>
  );
}

function createMedia(source: HTMLElement) {
  const media = source.cloneNode(true) as HTMLElement;
  media.removeAttribute('data-cover');
  if (media.hasAttribute('data-preview-crop') || media.querySelector('.case-cover-strip')) media.dataset.expanded = '';
  media.style.removeProperty('visibility');
  media.querySelector('img')?.removeAttribute('loading');
  const video = media.querySelector('video');
  if (video) video.muted = true;
  return media;
}

type Gallery = {
  slides: HTMLButtonElement[];
  index: number;
  origin: HTMLButtonElement;
  video: HTMLVideoElement | null;
  controlsVisible?: boolean;
};

export function ProjectsSection({ page }: { page: RefObject<HTMLElement | null> }) {
  const [selected, setSelected] = useState(readCase);
  const [arrived, setArrived] = useState(true);
  const [returnedFromCase, setReturnedFromCase] = useState(false);
  const [activeHeading, setActiveHeading] = useState('projects-heading');
  const [contentsVisible, setContentsVisible] = useState(false);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [originalView, setOriginalView] = useState<'preview' | 'loading' | 'original' | 'error'>('preview');
  const [activeCoverVideo, setActiveCoverVideo] = useState<HTMLVideoElement | null>(null);
  const [coverPlaying, setCoverPlaying] = useState(false);
  const coverPlayback = useRef<ReturnType<typeof connectCoverPlayback>>(undefined);
  const coverPlaybackPreference = useRef<boolean | null>(null);
  const viewportMascot = useRef<HTMLSpanElement>(null);
  const section = useRef<HTMLElement>(null);
  const caseBack = useRef<HTMLAnchorElement>(null);
  const caseContents = useRef<HTMLUListElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogContent = useRef<HTMLDivElement>(null);
  const originalViewport = useRef<HTMLDivElement>(null);
  const originalTrigger = useRef<HTMLButtonElement>(null);
  const mediaSwipe = useRef<{ pointer: number; x: number; y: number } | null>(null);
  const suppressMediaClick = useRef(false);
  const coverFlight = useRef<(() => void) | undefined>(undefined);
  const mediaTransition = useRef<(() => void) | undefined>(undefined);
  const coverDrag = useRef<{ pointer: number; x: number; scroll: number } | null>(null);
  const scrollPoint = useRef(0);
  const item = cases.find((entry) => entry.id === selected);
  const isDns = item?.id === 'dns';
  const isVseinstrumenti = item?.id === 'vseinstrumenti';
  const detailedContents = isDns ? dnsContents : isVseinstrumenti ? viContents : undefined;
  const mascotComments = isDns ? dnsMascotComments : isVseinstrumenti ? viMascotComments : undefined;
  const caseYear = isDns ? dnsCase.year : viCase.year;
  const viewingMedia = gallery !== null;
  const original = gallery?.slides[gallery.index].dataset;
  const showingOriginal = originalView === 'original';

  useEffect(() => {
    if (showingOriginal) originalViewport.current?.focus({ preventScroll: true });
  }, [showingOriginal]);

  useEffect(() => {
    if (!activeCoverVideo || !arrived || viewingMedia) return;
    const playback = connectCoverPlayback(activeCoverVideo, coverPlaybackPreference, setCoverPlaying);
    coverPlayback.current = playback;
    return () => {
      playback?.disconnect();
      coverPlayback.current = undefined;
      setCoverPlaying(false);
    };
  }, [activeCoverVideo, arrived, viewingMedia]);

  function transition(next: string | null) {
    const element = section.current;
    if (!element || selected === next) return;
    coverDrag.current = null;
    coverFlight.current?.();
    mediaTransition.current?.();
    if (dialog.current?.open) dismissMedia();
    const id = next ?? selected;
    const origin = element.querySelector<HTMLElement>(`[data-cover="${id}"]`);
    const videoTime = origin?.querySelector('video')?.currentTime;
    const flight = origin && createFlight(origin, origin.matches(resizeScreensOnZoom));
    if (next) scrollPoint.current = window.scrollY;
    flushSync(() => {
      setSelected(next);
      setArrived(!flight);
      setContentsVisible(false);
      setActiveHeading('projects-heading');
      if (!next) setReturnedFromCase(true);
    });
    const target = element.querySelector<HTMLElement>(`[data-cover="${id}"]`);
    const targetVideo = target?.querySelector('video');
    if (targetVideo && videoTime !== undefined) {
      if (flight?.videoFrame) targetVideo.poster = flight.videoFrame;
      targetVideo.currentTime = videoTime;
    }
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
    mediaTransition.current?.();
  }, []);

  useEffect(() => {
    if (!detailedContents || !arrived) return;
    const overview = section.current?.querySelector('.dns-case-overview');
    const firstHeading = detailedContents[0].id;
    const overviewHeading = document.getElementById(firstHeading);
    if (!overview || !overviewHeading) return;
    const headings = [...detailedContents].reverse().map(({ id }) => document.getElementById(id));
    let alignment = headingAlignment(overviewHeading);
    const update = () => {
      setContentsVisible(overview.getBoundingClientRect().bottom <= 0);
      const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
      const current = atBottom ? headings[0] : headings.find((heading) => {
        if (!heading) return false;
        const { top, height } = heading.getBoundingClientRect();
        return top + height * alignment.anchor <= alignment.offset + 1;
      });
      setActiveHeading(current?.id ?? firstHeading);
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
  }, [detailedContents, arrived]);

  useEffect(() => {
    const list = caseContents.current;
    const active = list?.querySelector('button[aria-current="location"]');
    if (!detailedContents || !contentsVisible || !list || !active) return;

    const reveal = () => {
      if (!list.clientWidth) return;
      const bounds = list.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      list.scrollBy({
        left: Math.min(0, item.left - bounds.left) + Math.max(0, item.right - bounds.right),
        top: Math.min(0, item.top - bounds.top) + Math.max(0, item.bottom - bounds.bottom),
        behavior: 'instant',
      });
    };
    reveal();
    window.addEventListener('resize', reveal);
    return () => window.removeEventListener('resize', reveal);
  }, [detailedContents, contentsVisible, activeHeading]);

  function jumpToHeading(id: string) {
    const heading = document.getElementById(id);
    if (!heading) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    heading.focus({ preventScroll: true });
    if (detailedContents) {
      const { offset, anchor } = headingAlignment(heading);
      const { top, height } = heading.getBoundingClientRect();
      window.scrollBy({ top: top + height * anchor - offset, behavior });
    } else {
      heading.scrollIntoView({ block: 'start', behavior });
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
    mediaTransition.current?.();
    const flight = createFlight(source, source.matches(resizeScreensOnZoom));
    const media = createMedia(source);
    content.replaceChildren(media);
    const video = media.querySelector('video');
    setGallery({ slides, index, origin: trigger, video });
    viewer.showModal();
    content.focus({ preventScroll: true });
    const playVideo = () => void video?.play().catch(() => {});
    mediaTransition.current = flight?.to(media, playVideo, viewer);
    if (!flight) playVideo();
  }

  function moveMedia(direction: -1 | 1) {
    const content = dialogContent.current;
    if (!gallery || gallery.slides.length < 2 || !content) return;
    const index = adjacentSlide(gallery.index, gallery.slides.length, direction);
    const source = gallery.slides[index].firstElementChild;
    if (!(source instanceof HTMLElement)) return;
    mediaTransition.current?.();
    const media = createMedia(source);
    const slideDirection = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? undefined : direction;
    mediaTransition.current = replaceGallerySlide(content, media, slideDirection);
    const video = media.querySelector('video');
    if (document.activeElement === originalTrigger.current) content.focus({ preventScroll: true });
    setOriginalView('preview');
    setGallery({ ...gallery, index, video, controlsVisible: false });
    void video?.play().catch(() => {});
  }

  function dismissMedia() {
    dialog.current?.close();
    dialogContent.current?.replaceChildren();
    mediaSwipe.current = null;
    suppressMediaClick.current = false;
    setOriginalView('preview');
    setGallery(null);
  }

  function closeMedia() {
    const content = dialogContent.current;
    if (!dialog.current?.open || !gallery || !content) return;
    mediaTransition.current?.();
    const target = gallery.origin.firstElementChild;
    if (!(target instanceof HTMLElement)) {
      dismissMedia();
      return;
    }
    let source = content.firstElementChild;
    if (gallery.slides[gallery.index] !== gallery.origin) {
      source = createMedia(target);
      content.replaceChildren(source);
    }
    const video = source?.querySelector('video');
    if (video) video.controls = false;
    const flight = source instanceof HTMLElement && createFlight(source, source.matches(resizeScreensOnZoom));
    dismissMedia();
    gallery.origin.focus({ preventScroll: true });
    mediaTransition.current = flight ? flight.to(target) : undefined;
  }

  function startMediaSwipe(event: PointerEvent<HTMLElement>) {
    suppressMediaClick.current = false;
    mediaSwipe.current = event.isPrimary && event.pointerType === 'touch'
      ? { pointer: event.pointerId, x: event.clientX, y: event.clientY } : null;
  }

  function finishMediaSwipe(event: PointerEvent<HTMLElement>) {
    const start = mediaSwipe.current;
    mediaSwipe.current = null;
    if (!start || start.pointer !== event.pointerId || !gallery || gallery.slides.length < 2) return;
    const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y);
    if (!direction) return;
    suppressMediaClick.current = true;
    moveMedia(direction);
  }

  function preventClickAfterSwipe(event: MouseEvent<HTMLElement>) {
    if (!suppressMediaClick.current || event.detail === 0) return;
    suppressMediaClick.current = false;
    event.stopPropagation();
  }

  const mediaSwipeHandlers = {
    onPointerDown: startMediaSwipe,
    onPointerUp: finishMediaSwipe,
    onPointerCancel: () => { mediaSwipe.current = null; },
    onClickCapture: preventClickAfterSwipe,
  };

  function stopCoverDrag(event: PointerEvent<HTMLDivElement>) {
    if (coverDrag.current?.pointer !== event.pointerId) return;
    coverDrag.current = null;
    delete event.currentTarget.dataset.dragging;
  }

  const contents: readonly { id: string; label: string; note?: string }[] = detailedContents ?? [
    { id: 'projects-heading', label: 'Обзор' },
    ...(item?.screens?.map((screen) => ({ id: screen.id, label: screen.title })) ??
      [{ id: 'case-gallery-heading', label: 'Интерфейсы' }]),
    ...(item?.links.length ? [{ id: 'case-materials-heading', label: 'Материалы' }] : []),
  ];
  const contentsList = (
    <ul ref={caseContents}>
      {contents.map(({ id, label, note }) => {
        const current = detailedContents && activeHeading === id;
        return (
          <li key={id}>
            <button type="button" onClick={() => jumpToHeading(id)}
              aria-label={note ? label : undefined}
              aria-describedby={note ? `${id}-contents-note` : undefined}
              title={note}
              aria-current={current ? 'location' : undefined}
              style={current ? { '--contents-label-length': label.length } as CSSProperties : undefined}>
              <span className="case-contents-label">
                <span className="case-contents-text">{label}</span>
              </span>
              {note && <span id={`${id}-contents-note`} className="case-contents-note">{note}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section id="projects" ref={section} className="projects" data-case-open={item ? '' : undefined}
      aria-labelledby={item ? 'projects-heading' : undefined}
      aria-label={item ? undefined : 'Кейсы'} tabIndex={-1}>
      {item ? (
        <article key={item.id} className={detailedContents ? 'dns-case-layout' : undefined} data-section-id={`project-${item.id}`}>
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
            {item.screens ? item.screens.map(({ id, title, image, additionalImages }, index) => {
              const primary = index === 0;
              const coverVideo = primary ? item.coverVideo : undefined;
              const coverArtwork = primary && Boolean(coverVideo || item.coverImages?.length);
              const images = additionalImages?.length ? [image, ...additionalImages] : undefined;
              const label = coverVideo ? `Смотреть: ${coverVideo.title}`
                : coverArtwork ? `Увеличить обложку кейса «${item.title}»` : `Увеличить: ${images ? title : image.alt}`;
              const trigger = (
                <button key={id} type="button"
                  className={primary ? 'case-zoom-trigger' : 'case-zoom-trigger case-cover-secondary'}
                  aria-label={label}
                  onClick={(event) => openMedia(event.currentTarget)}>
                  <span className="case-cover case-screenshot-media" data-cover-gallery=""
                    data-cover={primary ? item.id : undefined}
                    {...(coverArtwork || images ? undefined : screenshotAttributes(image))}>
                    {coverArtwork ? <CaseCoverArtwork project={item} videoRef={coverVideo ? setActiveCoverVideo : undefined} />
                      : images ? <CaseCoverStrip images={images} /> : <CaseScreenshotFrame image={image} />}
                  </span>
                </button>
              );
              return coverVideo ? (
                <div className="case-cover-slide" key={id}>
                  {trigger}
                  <button type="button" className="icon-tile case-cover-playback" {...iconTilePress}
                    aria-label={coverPlaying ? 'Приостановить шоурил DNS' : 'Воспроизвести шоурил DNS'}
                    onClick={() => coverPlayback.current?.toggle()}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d={coverPlaying ? 'M5 4h3.5v12H5zM11.5 4H15v12h-3.5z' : 'M6 3.5 16 10 6 16.5Z'} />
                    </svg>
                  </button>
                </div>
              ) : trigger;
            }) : (
              <>
                <div className="case-cover" data-cover={item.id} aria-hidden="true" />
                <div className="case-cover case-cover-secondary" aria-hidden="true" />
              </>
            )}
          </div>
          <div className="case-layout">
            <nav className="case-nav" data-dns-contents={detailedContents ? '' : undefined} aria-label="Навигация по кейсу">
              <a ref={caseBack} className="icon-tile case-back" {...iconTilePress} href="#projects" aria-label="К кейсам" onClick={(event) => {
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
              {!detailedContents && <p>Содержание</p>}
              {(!detailedContents || contentsVisible) && contentsList}
            </nav>
            {mascotComments ? arrived && <CaseMascot actorRef={viewportMascot} comments={mascotComments}
              shotComment={isDns ? dnsCase.comparison.iteration.shotComment : undefined} paused={viewingMedia} />
              : <ViewportMascot actorRef={viewportMascot} />}
            <div className={detailedContents ? 'case-body dns-case-body' : 'case-body'} data-arrived={arrived}>
              {isDns ? (
                <DnsCase jumpToHeading={jumpToHeading} rocketActor={arrived ? viewportMascot : undefined}
                  renderScreenshot={(image) => <CaseScreenshot image={image} onOpen={openMedia} />} />
              ) : isVseinstrumenti ? (
                <VseinstrumentiCase jumpToHeading={jumpToHeading}
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
          {detailedContents && arrived && (
            <footer className="dns-case-footer">
              <div className="dns-case-footer-actions" data-mascot-route-end>
                <ContactButtons />
              </div>
              <div className="dns-case-footer-signature">
                <span>{site.profile.name}</span>
                <time dateTime={String(caseYear)}>{caseYear}</time>
              </div>
            </footer>
          )}
          {detailedContents && arrived && <PixelViewportEdges root={section} targetSelector=".case-covers, .dns-case-body > *" />}
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
                    <CaseCoverArtwork project={entry} decorative videoRef={entry.coverVideo ? setActiveCoverVideo : undefined} />
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
      <dialog ref={dialog} className="case-dialog" aria-label="Просмотр материалов"
        onCancel={(event) => { event.preventDefault(); closeMedia(); }}
        onKeyDown={(event) => {
          if (showingOriginal || event.target instanceof HTMLVideoElement || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
          event.preventDefault();
          moveMedia(event.key === 'ArrowLeft' ? -1 : 1);
        }}
        onClick={(event) => { if (event.target === event.currentTarget) closeMedia(); }}>
        <div className="gallery-preview" inert={showingOriginal}>
          <div ref={dialogContent} className="gallery-media-full" tabIndex={-1} />
          {original?.originalSrc && !showingOriginal && (
            <button ref={originalTrigger} type="button" className="case-zoom-trigger gallery-original-trigger"
              {...mediaSwipeHandlers} aria-label="Показать оригинал в масштабе 100%"
              aria-disabled={originalView === 'loading'}
              onClick={() => {
                if (originalView === 'loading') return;
                mediaTransition.current?.();
                setOriginalView('loading');
              }} />
          )}
          <span className="gallery-original-status" role="status">
            {original?.originalSrc && originalView === 'preview' && (
              <span aria-hidden="true">Нажмите, чтобы увеличить до 100%</span>
            )}
            {originalView === 'loading' && 'Загрузка оригинала…'}
            {originalView === 'error' && 'Не удалось загрузить оригинал. Нажмите, чтобы повторить'}
          </span>
        </div>
        {original?.originalSrc && (originalView === 'loading' || showingOriginal) && (
          <div ref={originalViewport} className="gallery-original" role="region" aria-label="Изображение в масштабе 100%"
            tabIndex={0} hidden={!showingOriginal}>
            <img src={original.originalSrc} alt={original.originalAlt} draggable={false}
              onLoad={() => setOriginalView('original')} onError={() => setOriginalView('error')} />
          </div>
        )}
        <div className="gallery-actions">
          <button type="button" className="icon-tile gallery-close" {...iconTilePress} aria-label="Закрыть" onClick={closeMedia}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
          {showingOriginal && (
            <button type="button" className="icon-tile" {...iconTilePress} aria-label="Вернуться к превью"
              onClick={() => {
                flushSync(() => setOriginalView('preview'));
                originalTrigger.current?.focus({ preventScroll: true });
              }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m12.5 12.5 4.5 4.5M5.5 8.5h6" />
              </svg>
            </button>
          )}
          {gallery?.video && (
            <button type="button" className="icon-tile" {...iconTilePress} aria-label="Управление видео" aria-pressed={gallery.controlsVisible ?? false} onClick={() => {
              const controlsVisible = !gallery.controlsVisible;
              if (gallery.video) gallery.video.controls = controlsVisible;
              setGallery({ ...gallery, controlsVisible });
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M3 6h5m4 0h5M3 14h9m4 0h1" />
                <circle cx="10" cy="6" r="2" />
                <circle cx="14" cy="14" r="2" />
              </svg>
            </button>
          )}
        </div>
        {gallery && gallery.slides.length > 1 && !showingOriginal && (
          <>
            <div className="gallery-navigation" {...mediaSwipeHandlers}>
              <button type="button" className="gallery-previous" aria-label="Предыдущий кадр" onClick={() => moveMedia(-1)} />
              <button type="button" className="gallery-next" aria-label="Следующий кадр" onClick={() => moveMedia(1)} />
            </div>
            <span role="status" className="gallery-position">Кадр {gallery.index + 1} из {gallery.slides.length}</span>
          </>
        )}
      </dialog>
    </section>
  );
}
