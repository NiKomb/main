import { useEffect, useRef, type CSSProperties } from 'react';

export type CaseContentsItem = { id: string; label: string; divider?: string | null };

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

  let inSection = false;
  return (
    <ul ref={listRef}>
      {items.map(({ id, label, divider }) => {
        const current = activeHeading === id;
        if (divider !== undefined) inSection = Boolean(divider);
        return (
          <li key={id} data-section-start={divider !== undefined ? '' : undefined} data-section-item={inSection ? '' : undefined}>
            {divider && <span className="case-contents-divider" data-active={activeDivider?.id === id ? '' : undefined}>{divider}</span>}
            <button type="button" aria-label={label} onClick={() => onJump(id)}
              aria-current={current ? 'location' : undefined}>
              <span className="case-contents-label">
                <span className="case-contents-text">{current ? Array.from(label, (character, index) => (
                  <span className="case-contents-character" key={index}
                    style={{ '--contents-character-index': index } as CSSProperties}>{character}</span>
                )) : label}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
