import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { projects, type Project } from '../data/projects';
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
      element.scrollIntoView({ block: 'start', behavior: 'instant' });
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
    target.dataset.media = source.dataset.media;
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
          <div className="case-nav">
            <a ref={caseBack} href="#projects" onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              if (history.state?.fromCaseList) history.back();
              else {
                history.replaceState(null, '', '#projects');
                transition(null);
              }
            }}>← К кейсам</a>
          </div>
          <div className="case-covers" aria-hidden="true">
            <div className="case-cover" data-cover={item.id} />
            <div className="case-cover case-cover-secondary" />
          </div>
          <div className="case-body" data-arrived={arrived}>
            <h1 id="projects-heading">{item.title}</h1>
            <div className="case-skeleton" aria-hidden="true"><span /><span /><span /></div>
            <div className="case-gallery" aria-label="Галерея">
              {[1, 2].map((number) => (
                <button type="button" key={number} aria-label={`Увеличить изображение ${number}`}
                  onClick={(event) => openMedia(event.currentTarget)}>
                  <span className="gallery-media" data-media={number} />
                </button>
              ))}
            </div>
            {item.links.length > 0 && (
              <ul className="project-links" aria-label={`Материалы: ${item.title}`}>
                {item.links.map((link) => (
                  <li key={link.id}><a href={link.href} data-track-id={link.id}>{link.label}</a></li>
                ))}
              </ul>
            )}
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
                  <span className="case-cover" data-cover={entry.id} aria-hidden="true" />
                  <span className="tile-side">
                    <span className="tile-copy">
                      <span className="tile-arrow" aria-hidden="true">↗</span>
                      <strong>{entry.title}</strong>
                      <span className="tile-summary">{entry.summary}</span>
                    </span>
                    <span className="tile-preview" aria-hidden="true" />
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
        <div ref={dialogMedia} className="gallery-media gallery-media-full" aria-hidden="true" />
      </dialog>
    </section>
  );
}
