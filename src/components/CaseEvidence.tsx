import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GridIcon } from './GridIcon';
import { iconTilePress } from './icon-tile-press';

type Props = {
  id?: string;
  headingId: string;
  heading: ReactNode;
  introduction: string;
  panelId: string;
  panelTitle: string;
  closeLabel: string;
  evidence: ReactNode;
  children: ReactNode;
};

function updateFades(scroll: HTMLDivElement) {
  const remaining = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop;
  scroll.toggleAttribute('data-fade-start', scroll.scrollTop > 1);
  scroll.toggleAttribute('data-fade-end', remaining > 1);
}

function positionPanel(panel: HTMLElement, toggle: HTMLButtonElement) {
  panel.removeAttribute('data-above');
  const { top, height } = panel.getBoundingClientRect();
  const button = toggle.getBoundingClientRect();
  const spaceBelow = window.innerHeight - top;
  const gap = top - button.bottom;
  const spaceAbove = button.top - 2 * gap;
  if (gap <= 0 || spaceBelow >= Math.min(height, 160) || spaceAbove <= spaceBelow) return;

  panel.style.setProperty('--case-evidence-space-above', `${spaceAbove}px`);
  panel.setAttribute('data-above', '');
}

export function CaseEvidence({ id, headingId, heading, introduction, panelId, panelTitle, closeLabel, evidence, children }: Props) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelHeadingId = `${panelId}-heading`;

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const panel = scroll?.parentElement;
    const toggle = toggleRef.current;
    if (!open || !scroll || !panel || !toggle) return;

    const position = () => positionPanel(panel, toggle);
    position();
    scroll.scrollTop = 0;
    scroll.focus({ preventScroll: true });
    updateFades(scroll);

    const observer = new ResizeObserver(() => updateFades(scroll));
    observer.observe(scroll);
    for (const child of scroll.children) observer.observe(child);
    window.addEventListener('resize', position);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
    };
  }, [open]);

  function close() {
    setOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
  }

  return (
    <section className="dns-case-group case-evidence" id={id} aria-labelledby={headingId}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        close();
      }}>
      <div className="dns-case-block">
        {heading}
        <div className="case-evidence-intro">
          <p>{introduction}</p>
          <button ref={toggleRef} className="icon-tile dns-brand-button case-evidence-toggle" {...iconTilePress} type="button"
            aria-label={panelTitle} aria-expanded={open} aria-controls={panelId}
            onClick={() => open ? close() : setOpen(true)}>
            <GridIcon name={open ? 'left' : 'right'} />
          </button>
        </div>
      </div>
      <section className="dns-case-group case-evidence-panel" id={panelId}
        aria-labelledby={panelHeadingId} hidden={!open} data-viewport-edge-overlay>
        <header className="case-evidence-header">
          <h4 id={panelHeadingId}>{panelTitle}</h4>
          <button className="icon-tile case-evidence-close" type="button" {...iconTilePress}
            aria-label={closeLabel} onClick={close}>
            <GridIcon name="left" />
          </button>
        </header>
        <div ref={scrollRef} className="case-evidence-scroll" tabIndex={0} role="group" aria-labelledby={panelHeadingId}
          onScroll={(event) => updateFades(event.currentTarget)}>
          {evidence}
        </div>
      </section>
      {children}
    </section>
  );
}
