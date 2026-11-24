import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GalleryStrip } from './GalleryStrip';
import { clampGalleryScroll } from './gallery-scroll';

export function InterviewGallery({ label, children }: { label: string; children: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  function measure(element: HTMLDivElement) {
    const limit = element.scrollWidth - element.clientWidth;
    setProgress(limit > 1 ? clampGalleryScroll(element.scrollLeft, limit) / limit : null);
  }

  useLayoutEffect(() => {
    const element = strip.current;
    if (!element) return;
    const observer = new ResizeObserver(() => measure(element));
    observer.observe(element);
    measure(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="interview-gallery" data-overflow={progress !== null ? '' : undefined}
      data-at-start={progress === 0 ? '' : undefined} data-at-end={progress === 1 ? '' : undefined}>
      <GalleryStrip ref={strip} className="interview-gallery-scroll" role="region" aria-label={label} tabIndex={0}
        onScroll={(event) => measure(event.currentTarget)}>
        {children}
      </GalleryStrip>
      {progress !== null && (
        <span className="interview-gallery-progress" aria-hidden="true">
          <span style={{ transform: `translateX(${40 * progress}px)` }} />
        </span>
      )}
    </div>
  );
}
