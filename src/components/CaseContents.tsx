import { useEffect, useRef, type CSSProperties } from 'react';

export type CaseContentsItem = { id: string; label: string; note?: string; divider?: string | null };

type Props = {
  items: readonly CaseContentsItem[];
  activeHeading?: string;
  onJump: (id: string) => void;
};

export function CaseContents({ items, activeHeading, onJump }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeIndex = items.findIndex(({ id }) => id === activeHeading);
  const activeDivider = items.slice(0, activeIndex + 1).reverse().find(({ divider }) => divider !== undefined);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector('button[aria-current="location"]')?.closest('li');
    if (!list || !active) return;

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
    const observer = new ResizeObserver(reveal);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items, activeHeading]);

  return (
    <ul ref={listRef}>
      {items.map(({ id, label, note, divider }) => {
        const current = activeHeading === id;
        return (
          <li key={id}>
            {divider && <span className="case-contents-divider" data-active={activeDivider?.id === id ? '' : undefined}>{divider}</span>}
            <button type="button" onClick={() => onJump(id)}
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
}
