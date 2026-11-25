import { useEffect, useRef, useState } from 'react';
import { PortfolioProfile } from '../components/PortfolioProfile';
import { finishPreloader } from '../effects/preloader/finish';
import { ProjectsSection } from '../sections/ProjectsSection';

export function App() {
  const page = useRef<HTMLElement>(null);
  const [startupComplete, setStartupComplete] = useState(false);

  useEffect(() => {
    let cancel: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      cancel = finishPreloader(() => setStartupComplete(true));
    });
    return () => {
      cancelAnimationFrame(frame);
      cancel?.();
    };
  }, []);

  return (
    <>
      <main ref={page} className="page">
        <PortfolioProfile />
        <div className="portfolio-flow">
          <ProjectsSection page={page} startupComplete={startupComplete} />
        </div>
      </main>
      <footer className="site-footer" aria-hidden="true" />
    </>
  );
}
