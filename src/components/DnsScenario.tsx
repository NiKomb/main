import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ScenarioStep } from '../data/dnsCase';
import type { ProjectImage } from '../data/projects';
import { adjacentSlide } from './media-navigation';

const stepDuration = 2000;

export function DnsScenario({ steps, renderScreenshot }: {
  steps: readonly ScenarioStep[];
  renderScreenshot: (image: ProjectImage) => ReactNode;
}) {
  const frames = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = frames.current;
    if (!element) return;
    let intersects = false;
    const updateVisibility = () => setVisible(intersects && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      updateVisibility();
    }, { threshold: 0.35 });
    observer.observe(element);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!visible || paused || steps.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => adjacentSlide(current, steps.length, 1)), stepDuration);
    return () => window.clearInterval(timer);
  }, [visible, paused, steps.length]);

  return (
    <div className="dns-scenario">
      <button className="dns-scenario-playback" type="button" aria-label={paused ? 'Запустить показ' : 'Пауза'}
        onClick={() => setPaused((value) => !value)}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d={paused ? 'M6 3.5 16 10 6 16.5Z' : 'M5 4h3.5v12H5zM11.5 4H15v12h-3.5z'} />
        </svg>
      </button>
      <div ref={frames} className="dns-scenario-frames" data-media-gallery
        onFocusCapture={() => setPaused(true)} onPointerDownCapture={() => setPaused(true)}>
        {steps.map((step, position) => (
          <figure className="dns-case-figure dns-scenario-slide" key={step.label}
            data-current={position === index ? '' : undefined} inert={position !== index}>
            {renderScreenshot(step)}
            <figcaption><strong>{step.label}</strong>{step.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
