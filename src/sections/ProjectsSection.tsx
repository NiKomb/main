import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type Ref, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import { CaseContents, type CaseContentsItem } from '../components/CaseContents';
import { ContactButtons } from '../components/ContactButtons';
import { GalleryStrip } from '../components/GalleryStrip';
import { GridIcon } from '../components/GridIcon';
import { connectCoverPlayback } from '../components/cover-playback';
import { iconTilePress, restartIconTileStartup } from '../components/icon-tile-press';
import { adjacentSlide, slidesInGallery, swipeDirection } from '../components/media-navigation';
import { dnsCase, dnsContents, dnsMascotComments } from '../data/dnsCase';
import { projectCoverMetrics, projectResults } from '../data/projectResults';
import { projects, type PreviewMaskRegion, type Project, type ProjectImage } from '../data/projects';
import financePreview from '../data/screens/portfolio-finance-preview.png';
import { site } from '../data/site';
import { viContents, viMascotComments } from '../data/vseinstrumentiCase';
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
const caseCardCopy: Partial<Record<string, { title: string; summary: string }>> = {
  dns: {
    title: 'Упростил выбор комплектующих и возврат к сборке',
    summary: 'Сравнение в каталоге и возврат к сборке из обзора детали',
  },
  vseinstrumenti: {
    title: 'Показал условия подъёма до подтверждения заказа',
    summary: 'Условия подъёма и запрос расчёта при выборе доставки',
  },
};
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

function previewMask(image: ProjectImage, regions?: readonly PreviewMaskRegion[]) {
  if (!regions?.length) return;
  const shapes = regions.map(({ left, top, width, height, radius = 0 }) =>
    `<rect x="${left}" y="${top}" width="${width}" height="${height}" rx="${radius}"/>`).join('');
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${image.width} ${image.height}">${shapes}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(mask)}")`;
}

function previewCropStyle(image: ProjectImage): CSSProperties | undefined {
  const crop = image.previewCrop;
  if (!crop) return;
  const { left = 0, width = image.width } = crop.horizontal ?? {};
  return {
    '--preview-crop-ratio': width / crop.height,
    '--preview-crop-width-fraction': width / image.width,
    '--preview-crop-translate-x': `${-(left + width / 2) / image.width * 100}%`,
    '--preview-crop-translate': `${-(crop.top + crop.height / 2) / image.height * 100}%`,
    '--preview-context-mask': previewMask(image, crop.contextMask?.filter(({ previewShift }) => !previewShift)),
  } as CSSProperties;
}

function screenshotAttributes(image: ProjectImage) {
  return {
    'data-preview-crop': image.previewCrop ? '' : undefined,
    'data-preview-context': image.previewCrop?.contextMask ? '' : undefined,
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
  const { width, height } = image.previewCrop?.contextMask?.[0] ?? image;
  const shiftedRegions = image.previewCrop?.contextMask?.filter(({ previewShift }) => previewShift);
  return (
    <span className="case-cover-frame" data-cropped={width > height ? '' : undefined}
      data-portrait={image.height > image.width && width <= height ? '' : undefined}>
      <CaseScreenshotImage image={image} decorative={decorative} loading={loading} />
      {shiftedRegions?.map((region) => (
        <img key={`${region.left}-${region.top}`} src={image.src} width={image.width} height={image.height} alt="" draggable={false}
          loading={loading} data-preview-fragment="" style={{
            '--preview-context-mask': previewMask(image, [region]),
            '--preview-shift-x': `${(region.previewShift?.x ?? 0) / image.width * 100}%`,
            '--preview-shift-y': `${(region.previewShift?.y ?? 0) / image.height * 100}%`,
          } as CSSProperties} />
      ))}
    </span>
  );
}

function CaseCoverStrip({ images, decorative = false, loading }: {
  images: readonly ProjectImage[];
  decorative?: boolean;
  loading?: 'lazy';
}) {
  const previewRatio = Math.min(...images.map((image) => image.width / (image.previewCrop?.height ?? image.height)));
  return (
    <span className="case-cover-frame case-cover-strip"
      data-cover-crops={images.some((image) => image.previewCrop) ? '' : undefined}
      style={{
        '--cover-screen-count': images.length,
        '--cover-preview-ratio': previewRatio,
      } as CSSProperties}>
      {images.map((image) => (
        <CaseScreenshotImage key={image.src} image={image} decorative={decorative} loading={loading} cropPreview />
      ))}
    </span>
  );
}

type CaseVideo = NonNullable<Project['coverVideo']>;

function CaseVideoArtwork({ video: { src, poster, title }, videoRef, preload = 'none' }: {
  video: CaseVideo;
  videoRef?: Ref<HTMLVideoElement>;
  preload?: 'none' | 'metadata';
}) {
  return (
    <span className="case-cover-frame case-cover-video">
      <video ref={videoRef} src={src} poster={poster} preload={preload} muted loop playsInline aria-label={title} />
    </span>
  );
}

function CaseCoverArtwork({ project, decorative = false, videoRef }: {
  project: Project;
  decorative?: boolean;
  videoRef?: Ref<HTMLVideoElement>;
}) {
  if (project.coverVideo) {
    return <CaseVideoArtwork video={project.coverVideo} videoRef={videoRef} />;
  }
  if (project.coverImages?.length) {
    return <CaseCoverStrip images={project.coverImages} decorative={decorative} />;
  }
  const image = project.screens?.[0]?.image;
  return image ? <CaseScreenshotFrame image={image} decorative={decorative} /> : null;
}

function useCoverPlayback(video: HTMLVideoElement | null, enabled: boolean) {
  const controller = useRef<ReturnType<typeof connectCoverPlayback>>(undefined);
  const preference = useRef<boolean | null>(null);

  useEffect(() => {
    if (!video || !enabled) return;
    const playback = connectCoverPlayback(video, preference);
    controller.current = playback;
    return () => {
      playback?.disconnect();
      controller.current = undefined;
    };
  }, [video, enabled]);

  return () => controller.current?.toggle();
}

function CaseListCoverArtwork({ project, enabled }: { project: Project; enabled: boolean }) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  useCoverPlayback(video, enabled);
  return <CaseCoverArtwork project={project} decorative videoRef={setVideo} />;
}

function CaseVideoTile({ video, videoRef, videoElement, coverId, togglePlayback, playbackLabel, onOpen }: {
  video: CaseVideo;
  videoRef: Ref<HTMLVideoElement>;
  videoElement: HTMLVideoElement | null;
  coverId?: string;
  togglePlayback: () => void;
  playbackLabel: string;
  onOpen: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <div className="case-cover-slide">
      <button type="button" className={coverId ? 'case-zoom-trigger' : 'case-zoom-trigger case-screenshot'}
        data-mascot-surface={coverId ? undefined : 'screen'}
        aria-label={`Смотреть: ${video.title}`} onClick={(event) => onOpen(event.currentTarget)}>
        <span className="case-cover case-screenshot-media" data-mascot-surface={coverId ? 'screen' : undefined}
          data-cover={coverId} data-cover-gallery={coverId ? '' : undefined}>
          <CaseVideoArtwork video={video} videoRef={videoRef} preload="metadata" />
        </span>
      </button>
      {videoElement && <VideoControls video={videoElement} placement="cover" playbackLabel={playbackLabel} onToggle={togglePlayback} />}
    </div>
  );
}

function formatVideoTime(seconds: number) {
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function VideoControls({ video, placement, playbackLabel = 'видео', onToggle }: {
  video: HTMLVideoElement;
  placement: 'cover' | 'gallery';
  playbackLabel?: string;
  onToggle?: () => void;
}) {
  const [playback, setPlayback] = useState({ video, playing: false, time: 0, duration: 0 });
  useEffect(() => {
    const sync = () => setPlayback({
      video,
      playing: !video.paused && !video.ended,
      time: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
    });
    const events = ['play', 'pause', 'ended', 'timeupdate', 'seeking', 'durationchange', 'emptied'];
    for (const event of events) video.addEventListener(event, sync);
    sync();
    return () => {
      for (const event of events) video.removeEventListener(event, sync);
    };
  }, [video]);

  const { playing, time, duration } = playback.video === video ? playback : { playing: false, time: 0, duration: 0 };
  const timestamp = formatVideoTime(time);
  const total = duration ? formatVideoTime(duration) : '–:––';
  return (
    <div className={`video-controls video-controls--${placement}`} role="group" aria-label="Управление видео"
      onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" className="icon-tile icon-tile--secondary" {...iconTilePress}
        aria-label={`${playing ? 'Приостановить' : 'Воспроизвести'} ${playbackLabel}`} onClick={() => {
          if (onToggle) onToggle();
          else if (video.paused || video.ended) void video.play().catch(() => {});
          else video.pause();
        }}>
        <GridIcon name={playing ? 'pause' : 'play'} />
      </button>
      <input type="range" className="video-seek" min={0} max={duration || 1} step="any"
        value={Math.min(time, duration)} disabled={!duration}
        style={{ '--video-progress': `${duration ? Math.min(time / duration, 1) * 100 : 0}%` } as CSSProperties}
        aria-label="Перемотать видео" aria-valuetext={`${timestamp} из ${total}`}
        onChange={(event) => {
          video.currentTime = event.currentTarget.valueAsNumber;
          setPlayback({ ...playback, time: video.currentTime });
        }} />
      <span className="video-time">{timestamp} / {total}</span>
    </div>
  );
}

function GalleryArrow({ direction, onMove }: { direction: -1 | 1; onMove: (direction: -1 | 1) => void }) {
  const previous = direction === -1;

  function followPointer({ currentTarget: button, pointerType, clientX, clientY }: PointerEvent<HTMLButtonElement>) {
    const followsPointer = pointerType === 'mouse' || pointerType === 'pen';
    button.toggleAttribute('data-gallery-arrow-cursor', followsPointer);
    if (!followsPointer) return;
    const bounds = button.getBoundingClientRect();
    button.style.setProperty('--gallery-pointer-x', `${clientX - bounds.left}px`);
    button.style.setProperty('--gallery-pointer-y', `${clientY - bounds.top}px`);
  }

  return (
    <button type="button" className={previous ? 'gallery-previous' : 'gallery-next'}
      aria-label={previous ? 'Предыдущий кадр' : 'Следующий кадр'}
      onPointerEnter={followPointer} onPointerMove={followPointer}
      onClick={(event) => {
        restartIconTileStartup(event.currentTarget, 'press');
        onMove(direction);
      }}>
      <span className="gallery-arrow-icon" aria-hidden="true"><GridIcon name={previous ? 'left' : 'right'} /></span>
    </button>
  );
}

function CaseScreenshot({ image, onOpen }: {
  image: ProjectImage;
  onOpen: (trigger: HTMLButtonElement) => void;
}) {
  return (
    <button type="button" className="case-zoom-trigger case-screenshot" aria-label={`Увеличить: ${image.alt}`}
      data-mascot-surface="screen"
      data-original-src={image.original?.src} data-original-alt={image.original?.alt}
      onClick={(event) => onOpen(event.currentTarget)}>
      <span className="case-cover case-screenshot-media" {...screenshotAttributes(image)}
        data-portrait-preview={!image.previewCrop && image.height > image.width ? '' : undefined}>
        <CaseScreenshotFrame image={image} loading="lazy" />
      </span>
    </button>
  );
}

function CaseGalleryTile({ media, label, onOpen, coverId, className, variant = 'cover' }: {
  media: ProjectImage | readonly ProjectImage[];
  label: string;
  onOpen: (trigger: HTMLButtonElement) => void;
  coverId?: string;
  className?: string;
  variant?: 'cover' | 'scenario';
}) {
  const scenario = variant === 'scenario';
  const classes = ['case-zoom-trigger', scenario && 'case-screenshot', className].filter(Boolean).join(' ');
  const loading = scenario ? 'lazy' : undefined;
  const singleImage = 'src' in media;
  const attributes = singleImage ? screenshotAttributes(media) : undefined;
  const style = scenario
    ? { ...attributes?.style, '--case-preview-aspect-ratio': '10 / 7' } as CSSProperties
    : attributes?.style;
  return (
    <button type="button" className={classes} data-mascot-surface={scenario ? 'screen' : undefined}
      aria-label={label} onClick={(event) => onOpen(event.currentTarget)}>
      <span className="case-cover case-screenshot-media" data-cover-gallery="" data-cover={coverId}
        data-mascot-surface={scenario ? undefined : 'screen'}
        {...attributes} style={style}>
        {singleImage ? <CaseScreenshotFrame image={media} loading={loading} /> : <CaseCoverStrip images={media} loading={loading} />}
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
  if (video) {
    video.muted = true;
    video.currentTime = source.querySelector('video')?.currentTime ?? 0;
  }
  return media;
}

type Gallery = {
  slides: HTMLButtonElement[];
  index: number;
  origin: HTMLButtonElement;
  video: HTMLVideoElement | null;
};

export function ProjectsSection({ page, startupComplete }: { page: RefObject<HTMLElement | null>; startupComplete: boolean }) {
  const [selected, setSelected] = useState(readCase);
  const [arrived, setArrived] = useState(true);
  const [returnedFromCase, setReturnedFromCase] = useState(false);
  const [activeHeading, setActiveHeading] = useState('projects-heading');
  const [contentsVisible, setContentsVisible] = useState(false);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [originalView, setOriginalView] = useState<'preview' | 'loading' | 'original' | 'error'>('preview');
  const [activeCoverVideo, setActiveCoverVideo] = useState<HTMLVideoElement | null>(null);
  const [scenarioVideo, setScenarioVideo] = useState<HTMLVideoElement | null>(null);
  const viewportMascot = useRef<HTMLSpanElement>(null);
  const section = useRef<HTMLElement>(null);
  const caseBack = useRef<HTMLAnchorElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogContent = useRef<HTMLDivElement>(null);
  const originalViewport = useRef<HTMLDivElement>(null);
  const originalTrigger = useRef<HTMLButtonElement>(null);
  const mediaSwipe = useRef<{ pointer: number; x: number; y: number } | null>(null);
  const suppressMediaClick = useRef(false);
  const coverFlight = useRef<(() => void) | undefined>(undefined);
  const mediaTransition = useRef<(() => void) | undefined>(undefined);
  const scrollPoint = useRef(0);
  const item = cases.find((entry) => entry.id === selected);
  const isDns = item?.id === 'dns';
  const isVseinstrumenti = item?.id === 'vseinstrumenti';
  const detailedContents = isDns ? dnsContents : isVseinstrumenti ? viContents : undefined;
  const mascotComments = isDns ? dnsMascotComments : isVseinstrumenti ? viMascotComments : undefined;
  const viewingMedia = gallery !== null;
  const toggleCoverPlayback = useCoverPlayback(activeCoverVideo, arrived && !viewingMedia);
  const toggleScenarioPlayback = useCoverPlayback(scenarioVideo, arrived && !viewingMedia);
  const scenarioSource = isDns ? dnsCase.scenario.video : isVseinstrumenti ? item.coverVideo : undefined;
  const scenarioMedia = scenarioSource && (
    <CaseVideoTile video={scenarioSource} videoRef={setScenarioVideo} videoElement={scenarioVideo}
      togglePlayback={toggleScenarioPlayback} playbackLabel={isDns ? 'сценарий выбора процессора' : 'сценарий выбора доставки'}
      onOpen={openMedia} />
  );
  const original = gallery?.slides[gallery.index].dataset;
  const showingOriginal = originalView === 'original';

  useEffect(() => {
    if (showingOriginal) originalViewport.current?.focus({ preventScroll: true });
  }, [showingOriginal]);

  useEffect(() => {
    if (item) return;
    const grid = section.current?.querySelector('.case-grid');
    if (!grid) return;

    const covers = [...grid.querySelectorAll('.tile-layout--sign[href] > .case-cover')];
    const touch = matchMedia('(hover: none) and (pointer: coarse)');
    let highlighted: Element | null = null;
    let frame = 0;

    function updateHighlight() {
      frame = 0;
      let next: Element | null = null;
      let bestVisibility = 0;
      let bestDistance = Infinity;
      if (touch.matches) {
        for (const cover of covers) {
          const { top, bottom, height } = cover.getBoundingClientRect();
          const visibleHeight = Math.min(bottom, innerHeight) - Math.max(top, 0);
          if (visibleHeight <= 0 || !height) continue;
          const visibility = visibleHeight / height;
          const distance = Math.abs((top + bottom - innerHeight) / 2);
          if (visibility < bestVisibility || (visibility === bestVisibility && distance >= bestDistance)) continue;
          next = cover.parentElement;
          bestVisibility = visibility;
          bestDistance = distance;
        }
      }
      if (next === highlighted) return;
      highlighted?.removeAttribute('data-visible-cover');
      next?.setAttribute('data-visible-cover', '');
      highlighted = next;
    }

    function queueHighlight() {
      if (!frame) frame = requestAnimationFrame(updateHighlight);
    }

    const resize = new ResizeObserver(queueHighlight);
    resize.observe(page.current ?? grid);
    covers.forEach((cover) => resize.observe(cover));
    window.addEventListener('scroll', queueHighlight, { passive: true });
    window.addEventListener('resize', queueHighlight);
    touch.addEventListener('change', queueHighlight);
    queueHighlight();

    return () => {
      cancelAnimationFrame(frame);
      highlighted?.removeAttribute('data-visible-cover');
      resize.disconnect();
      window.removeEventListener('scroll', queueHighlight);
      window.removeEventListener('resize', queueHighlight);
      touch.removeEventListener('change', queueHighlight);
    };
  }, [item, page]);

  function transition(next: string | null) {
    const element = section.current;
    if (!element || selected === next) return;
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
    const layout = section.current?.querySelector('.dns-case-layout');
    const overview = layout?.querySelector('.dns-case-overview');
    const footer = layout?.querySelector('.dns-case-footer');
    const navigation = layout?.querySelector<HTMLElement>('.case-nav[data-dns-contents]');
    const firstHeading = detailedContents[0].id;
    const overviewHeading = document.getElementById(firstHeading);
    if (!layout || !overview || !overviewHeading || !footer || !navigation) return;
    const headings = [...detailedContents].reverse().map(({ id }) => document.getElementById(id));
    let alignment = headingAlignment(overviewHeading);
    const update = () => {
      setContentsVisible(overview.getBoundingClientRect().bottom <= alignment.offset);
      const footerInset = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top);
      const activeHeadingOffset = window.innerHeight / 2;
      const current = headings.find((heading, index) => {
        if (!heading) return false;
        const { top, bottom, height } = heading.getBoundingClientRect();
        return top + height * alignment.anchor <= activeHeadingOffset ||
          (index === 0 && footerInset > 0 && top >= 0 && bottom <= window.innerHeight);
      });
      setActiveHeading(current?.id ?? firstHeading);
      navigation.style.setProperty('--dns-case-footer-inset', `${footerInset}px`);
    };
    const resize = () => {
      alignment = headingAlignment(overviewHeading);
      update();
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(layout);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      navigation.style.removeProperty('--dns-case-footer-inset');
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', resize);
    };
  }, [detailedContents, arrived]);

  function jumpToHeading(id: string, fromContents = false) {
    const heading = document.getElementById(id);
    if (!heading) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    heading.focus({ preventScroll: true });
    if (detailedContents) {
      const { offset, anchor } = headingAlignment(heading);
      const { top, height } = heading.getBoundingClientRect();
      const listTop = fromContents
        ? section.current?.querySelector('.case-nav[data-dns-contents] ul')?.getBoundingClientRect().top
        : undefined;
      window.scrollBy({ top: listTop === undefined ? top + height * anchor - offset : top - listTop, behavior });
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
    saveGalleryPlaybackPosition();
    const media = createMedia(source);
    const slideDirection = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? undefined : direction;
    mediaTransition.current = replaceGallerySlide(content, media, slideDirection);
    const video = media.querySelector('video');
    if (document.activeElement === originalTrigger.current ||
      (!video && document.activeElement?.closest('.video-controls--gallery'))) content.focus({ preventScroll: true });
    setOriginalView('preview');
    setGallery({ ...gallery, index, video });
    void video?.play().catch(() => {});
  }

  function saveGalleryPlaybackPosition() {
    if (!gallery?.video) return;
    const preview = gallery.slides[gallery.index].querySelector('video');
    gallery.video.pause();
    if (preview) preview.currentTime = gallery.video.currentTime;
  }

  function dismissMedia() {
    saveGalleryPlaybackPosition();
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

  const contents: readonly CaseContentsItem[] = detailedContents ?? [
    { id: 'projects-heading', label: 'Обзор' },
    ...(item?.screens?.map((screen) => ({ id: screen.id, label: screen.title })) ??
      [{ id: 'case-gallery-heading', label: 'Интерфейсы' }]),
    ...(item?.links.length ? [{ id: 'case-materials-heading', label: 'Материалы' }] : []),
  ];

  return (
    <section id="projects" ref={section} className="projects" data-case-open={item ? '' : undefined}
      aria-labelledby={item ? 'projects-heading' : undefined}
      aria-label={item ? undefined : 'Кейсы'} tabIndex={-1}>
      {item ? (
        <article key={item.id} className={detailedContents ? 'dns-case-layout' : undefined} data-section-id={`project-${item.id}`}>
          <GalleryStrip className="case-covers" role="region" aria-label="Обложки кейса" tabIndex={0} data-mascot-row="">
            {item.coverVideo && (
              <CaseVideoTile video={item.coverVideo} videoRef={setActiveCoverVideo} videoElement={activeCoverVideo} coverId={item.id}
                togglePlayback={toggleCoverPlayback} playbackLabel={`видео «${item.title}»`} onOpen={openMedia} />
            )}
            {item.screens ? item.screens.map(({ id, title, image, additionalImages }, index) => {
              const coverImages = index === 0 ? item.coverImages : undefined;
              if (index === 0 && item.coverVideo && !coverImages?.length) return null;
              const primary = index === 0 && !item.coverVideo;
              const images = additionalImages?.length ? [image, ...additionalImages] : undefined;
              const label = coverImages?.length ? `Увеличить обложку кейса «${item.title}»` : `Увеличить: ${images ? title : image.alt}`;
              return <CaseGalleryTile key={id} media={coverImages?.length ? coverImages : images ?? image}
                label={label} onOpen={openMedia} coverId={primary ? item.id : undefined}
                className={primary ? undefined : 'case-cover-secondary'} />;
            }) : (
              <>
                <div className="case-cover" data-cover={item.id} aria-hidden="true" />
                <div className="case-cover case-cover-secondary" aria-hidden="true" />
              </>
            )}
          </GalleryStrip>
          <div className="case-layout">
            <nav className="case-nav" data-dns-contents={detailedContents ? '' : undefined} aria-label="Навигация по кейсу">
              <a ref={caseBack} className="icon-tile icon-tile--secondary case-back" {...iconTilePress} href="#projects" aria-label="К кейсам" onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                if (history.state?.fromCaseList) history.back();
                else {
                  history.replaceState(null, '', '#projects');
                  transition(null);
                }
              }}>
                <GridIcon name="left" />
              </a>
              {!detailedContents && <p>Содержание</p>}
              {(!detailedContents || contentsVisible) && (
                <CaseContents items={contents} activeHeading={detailedContents ? activeHeading : undefined}
                  onJump={(id) => jumpToHeading(id, true)} />
              )}
            </nav>
            {detailedContents && (
              <div className="dns-case-contacts" data-mascot-route-end>
                <ContactButtons />
              </div>
            )}
            {mascotComments ? arrived && <CaseMascot actorRef={viewportMascot} comments={mascotComments}
              shotComment={isDns ? dnsCase.comparison.iteration.shotComment : undefined} paused={viewingMedia} />
              : <ViewportMascot actorRef={viewportMascot} />}
            <div className={detailedContents ? 'case-body dns-case-body' : 'case-body'} data-arrived={arrived}>
              {isDns ? (
                <DnsCase jumpToHeading={jumpToHeading} rocketActor={arrived ? viewportMascot : undefined}
                  scenarioMedia={scenarioMedia}
                  renderScreenshot={(image) => <CaseScreenshot image={image} onOpen={openMedia} />} />
              ) : isVseinstrumenti ? (
                <VseinstrumentiCase jumpToHeading={jumpToHeading} scenarioMedia={scenarioMedia}
                  renderScreenshot={(image) => <CaseScreenshot image={image} onOpen={openMedia} />}
                  renderScenario={(images, label) => (
                    <CaseGalleryTile media={images.map((image) => ({ ...image, previewCrop: undefined }))}
                      label={`Увеличить сценарий. ${label}`} onOpen={openMedia}
                      variant="scenario" />
                  )} />
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
                          <li key={link.id}><a href={link.href} data-track-id={link.id}>{link.label}<GridIcon name="link" /></a></li>
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
              <div className="dns-case-footer-signature">
                <span>{site.profile.name}</span>
                {item.year && <time dateTime={String(item.year)}>{item.year}</time>}
              </div>
            </footer>
          )}
          {detailedContents && arrived && <PixelViewportEdges root={section} targetSelector=".case-covers, .dns-case-body > *" />}
        </article>
      ) : (
        <>
          <div className="case-grid">
            {projects.map((entry) => (
              <article className="case-tile" key={entry.id} data-section-id={`project-${entry.id}`}>
                <a className="tile-layout--sign" {...iconTilePress} href={`#case-${entry.id}`} onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  history.pushState({ fromCaseList: true }, '', `#case-${entry.id}`);
                  transition(entry.id);
                }}>
                  <div className="case-sign-copy">
                    <div className="case-sign-heading">
                      <p className="case-sign-brand">{entry.title}</p>
                      <span className="case-sign-arrow" aria-hidden="true">
                        <span className="icon-tile"><GridIcon name="right" /></span>
                      </span>
                      <h2>{caseCardCopy[entry.id]?.title ?? entry.summary}</h2>
                      {caseCardCopy[entry.id] && (
                        <p className="case-sign-summary">{caseCardCopy[entry.id]?.summary}</p>
                      )}
                    </div>
                    <ul className="case-sign-metrics" role="list">
                      {projectCoverMetrics[entry.id].map(({ value, label }) => (
                        <li key={label}>
                          <p><strong>{value}</strong> {label}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="case-cover" data-cover={entry.id} aria-hidden="true">
                    <CaseListCoverArtwork project={entry} enabled={arrived && !viewingMedia} />
                    <span className="case-sign-scanlines" />
                  </span>
                </a>
              </article>
            ))}
            <article className="case-tile case-tile-placeholder" data-section-id="project-preview">
              <div className="tile-layout--sign">
                <div className="case-sign-heading">
                  <h2 aria-label="Скоро будет">Жвэ#лкр фя%чн жгщ*взмлксвё ы мю?рачж к щл#эфю</h2>
                </div>
                <span className="case-cover" data-cover="preview" aria-hidden="true">
                  <span className="case-cover-frame" data-cropped="">
                    <img src={financePreview} width={960} height={732} alt="" loading="lazy" />
                  </span>
                  <span className="case-sign-scanlines" />
                </span>
              </div>
            </article>
            {startupComplete && <Mascot resumeRoute={returnedFromCase} results={projectResults} />}
          </div>
          <PixelViewportEdges root={page} targetSelector=".case-tile" />
        </>
      )}
      <dialog ref={dialog} className="case-dialog" data-case-theme={item?.id} aria-label="Просмотр материалов"
        onCancel={(event) => { event.preventDefault(); closeMedia(); }}
        onKeyDown={(event) => {
          if (showingOriginal || event.target instanceof HTMLInputElement || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
          event.preventDefault();
          moveMedia(event.key === 'ArrowLeft' ? -1 : 1);
        }}
        onClick={(event) => { if (event.target === event.currentTarget) closeMedia(); }}>
        <div className="gallery-preview" inert={showingOriginal}>
          <div ref={dialogContent} className="gallery-media-full" tabIndex={-1} />
          {gallery?.video && <VideoControls video={gallery.video} placement="gallery" />}
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
        </div>
        {gallery && gallery.slides.length > 1 && !showingOriginal && (
          <>
            <div className="gallery-navigation" {...mediaSwipeHandlers}>
              <GalleryArrow direction={-1} onMove={moveMedia} />
              <GalleryArrow direction={1} onMove={moveMedia} />
            </div>
            <span role="status" className="gallery-position">Кадр {gallery.index + 1} из {gallery.slides.length}</span>
          </>
        )}
      </dialog>
    </section>
  );
}
