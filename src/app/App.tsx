import { useRef } from 'react';
import pixelAvatar from '../data/pixel-avatar.webp';
import { site } from '../data/site';
import { ViewportEdges } from '../effects/viewport-edges/ViewportEdges';
import { ProjectsSection } from '../sections/ProjectsSection';

export function App() {
  const page = useRef<HTMLElement>(null);

  return (
    <>
      <a className="skip-link" href="#projects">К кейсам</a>
      <main ref={page} className="page">
        <img className="portfolio-avatar" src={pixelAvatar} width={88} height={88} alt="" />
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
