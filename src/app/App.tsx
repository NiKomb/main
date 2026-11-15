import { site } from '../data/site';
import { ViewportEdges } from '../effects/viewport-edges/ViewportEdges';
import { ProjectsSection } from '../sections/ProjectsSection';

export function App() {
  return (
    <>
      <a className="skip-link" href="#projects">К кейсам</a>
      <main className="page">
        <div className="portfolio-skeleton" aria-hidden="true">
          <span className="portfolio-skeleton-avatar" />
          <div className="portfolio-skeleton-lines">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="portfolio-flow">
          <ProjectsSection />
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
