import { useRef } from 'react';
import { PortfolioProfile } from '../components/PortfolioProfile';
import { site } from '../data/site';
import { ViewportEdges } from '../effects/viewport-edges/ViewportEdges';
import { ProjectsSection } from '../sections/ProjectsSection';

export function App() {
  const page = useRef<HTMLElement>(null);

  return (
    <>
      <a className="skip-link" href="#projects">К кейсам</a>
      <main ref={page} className="page">
        <PortfolioProfile />
        <div className="portfolio-flow">
          <ProjectsSection page={page} />
          <section className="intro" aria-labelledby="about-title">
            <h2 id="about-title">О себе</h2>
            <p>{site.description}</p>
          </section>
        </div>
      </main>
      <footer className="site-footer" aria-hidden="true" />
      <ViewportEdges />
    </>
  );
}
