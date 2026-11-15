import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { projects, type Project, type ProjectImage } from '../data/projects';
import { Mascot, ViewportMascot } from '../effects/mascot/Mascot';
import { createFlight } from '../effects/shared-cover/flight';

const cases: readonly Project[] = [
  ...projects,
  { id: 'preview', title: 'Кейс 3', summary: 'Место для следующего проекта.', links: [] },
];

function readCase() {
  const id = window.location.hash.slice(6);
  return window.location.hash.startsWith('#case-') && cases.some((item) => item.id === id) ? id : null;
}

function screenshotSize(image: ProjectImage): CSSProperties {
  return { '--screenshot-ratio': image.width / image.height } as CSSProperties;
}

function CaseScreenshotFrame({ image, decorative = false, loading }: {
  image: ProjectImage;
  decorative?: boolean;
  loading?: 'lazy';
}) {
  return (
    <span className="case-cover-frame" data-cropped={image.width > image.height ? '' : undefined}
      data-portrait={image.height > image.width ? '' : undefined}>
      <img {...image} alt={decorative ? '' : image.alt} loading={loading} draggable={false} />
    </span>
  );
}

function CaseCoverArtwork({ project, decorative = false }: { project: Project; decorative?: boolean }) {
  if (project.coverImages?.length) {
    return (
      <span className="case-cover-frame case-cover-strip">
        {project.coverImages.map((image) => (
          <span className="case-cover-strip-item" key={image.src} style={screenshotSize(image)}>
            <span className="case-cover-strip-image">
              <img {...image} alt={decorative ? '' : image.alt} draggable={false} />
            </span>
          </span>
        ))}
      </span>
    );
  }
  const image = project.screens?.[0]?.image;
  return image ? <CaseScreenshotFrame image={image} decorative={decorative} /> : null;
}

export function ProjectsSection() {
  const [selected, setSelected] = useState(readCase);
  const [arrived, setArrived] = useState(true);
  const [returnedFromCase, setReturnedFromCase] = useState(false);
  const section = useRef<HTMLElement>(null);
  const caseBack = useRef<HTMLAnchorElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogMedia = useRef<HTMLDivElement>(null);
  const galleryOrigin = useRef<HTMLButtonElement>(null);
  const coverFlight = useRef<(() => void) | undefined>(undefined);
  const mediaFlight = useRef<(() => void) | undefined>(undefined);
  const scrollPoint = useRef(0);
  const item = cases.find((entry) => entry.id === selected);
  function transition(next: string | null) {
    const element = section.current;
    if (!element || selected === next) return;
    coverFlight.current?.();
    const id = next ?? selected;
    const origin = element.querySelector<HTMLElement>(`[data-cover="${id}"]`);
    const flight = origin && createFlight(origin);
    if (next) scrollPoint.current = window.scrollY;
    flushSync(() => {
      setSelected(next);
      setArrived(!flight);
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
    const sync = () => {
      if (dialog.current?.open) {
        mediaFlight.current?.();
        dialog.current.close();
      }
      transition(readCase());
    };
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

  function openMedia(trigger: HTMLButtonElement) {
    const viewer = dialog.current;
    const target = dialogMedia.current;
    const source = trigger.firstElementChild;
    if (!viewer || !target || !(source instanceof HTMLElement)) return;
    mediaFlight.current?.();
    galleryOrigin.current = trigger;
    const flight = createFlight(source);
    target.dataset.media = source.dataset.media ?? '';
    const screenshot = source.querySelector('img');
    target.replaceChildren(...(screenshot ? [screenshot.cloneNode()] : []));
    viewer.showModal();
    mediaFlight.current = flight?.to(target, undefined, viewer);
  }

  function closeMedia() {
    const viewer = dialog.current;
    const source = dialogMedia.current;
    const target = galleryOrigin.current?.firstElementChild;
    if (!viewer?.open || !source || !(target instanceof HTMLElement)) return;
    mediaFlight.current?.();
    const flight = createFlight(source);
    viewer.close();
    galleryOrigin.current?.focus({ preventScroll: true });
    mediaFlight.current = flight?.to(target);
  }

  return (
    <section id="projects" ref={section} className="projects" data-case-open={item ? '' : undefined}
      aria-labelledby={item ? 'projects-heading' : undefined}
      aria-label={item ? undefined : 'Кейсы'} tabIndex={-1}>
      {item ? (
        <article data-section-id={`project-${item.id}`}>
          <div className="case-covers" key={item.id} role="region" aria-label="Обложки кейса" tabIndex={0}
            onPointerDown={(event) => {
              if (event.pointerType !== 'mouse' || event.button !== 0) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              event.currentTarget.dataset.dragging = '';
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.scrollLeft -= event.movementX;
              }
            }}
            onLostPointerCapture={(event) => { delete event.currentTarget.dataset.dragging; }}>
            {item.screens ? item.screens.map(({ id, image }, index) => (
              <div key={id} className={index === 0 ? 'case-cover' : 'case-cover case-cover-secondary'}
                data-cover={index === 0 ? item.id : undefined}>
                {index === 0 ? <CaseCoverArtwork project={item} /> : <CaseScreenshotFrame image={image} />}
              </div>
            )) : (
              <>
                <div className="case-cover" data-cover={item.id} aria-hidden="true" />
                <div className="case-cover case-cover-secondary" aria-hidden="true" />
              </>
            )}
          </div>
          <div className="case-layout">
            <nav className="case-nav" aria-label="Навигация по кейсу">
              <a ref={caseBack} href="#projects" onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                if (history.state?.fromCaseList) history.back();
                else {
                  history.replaceState(null, '', '#projects');
                  transition(null);
                }
              }}>← К кейсам</a>
              <p>Содержание</p>
              <ul>
                {[
                  { id: 'projects-heading', label: 'Обзор' },
                  ...(item.screens?.map((screen) => ({ id: screen.id, label: screen.title })) ??
                    [{ id: 'case-gallery-heading', label: 'Интерфейсы' }]),
                  ...(item.links.length ? [{ id: 'case-materials-heading', label: 'Материалы' }] : []),
                ].map(({ id, label }) => (
                  <li key={id}>
                    <button type="button" onClick={() => {
                      const heading = document.getElementById(id);
                      heading?.focus({ preventScroll: true });
                      heading?.scrollIntoView({ block: 'start' });
                    }}>{label}</button>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="case-body" data-arrived={arrived}>
              <div className="case-text">
                <h1 id="projects-heading" tabIndex={-1}>{item.title}</h1>
                <p>{item.summary}</p>
              </div>
              {item.screens?.map(({ id, title, description, image }) => {
                const portrait = image.height > image.width;
                return (
                  <section className="case-content-section" key={id} aria-labelledby={id}>
                    <div className="case-text">
                      <h2 id={id} tabIndex={-1}>{title}</h2>
                      <p>{description}</p>
                    </div>
                    <button type="button" className="case-screenshot case-text" aria-label={`Увеличить: ${image.alt}`}
                      data-portrait={portrait ? '' : undefined}
                      onClick={(event) => openMedia(event.currentTarget)}>
                      <span className="case-cover"
                        style={portrait ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}>
                        <CaseScreenshotFrame image={image} loading="lazy" />
                      </span>
                    </button>
                  </section>
                );
              })}
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
        <div ref={dialogMedia} className="gallery-media gallery-media-full" />
      </dialog>
    </section>
  );
}
