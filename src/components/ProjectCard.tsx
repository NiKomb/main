import type { Project } from '../data/projects';
import { GridIcon } from './GridIcon';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="project" data-section-id={`project-${project.id}`} aria-labelledby={`title-${project.id}`}>
      <h2 id={`title-${project.id}`}>{project.title}</h2>
      <p>{project.summary}</p>
      <ul className="project-links" aria-label={`Материалы: ${project.title}`}>
        {project.links.map((link) => (
          <li key={link.id}>
            <a href={link.href} data-track-id={link.id}>{link.label}<GridIcon name="link" /></a>
          </li>
        ))}
      </ul>
    </article>
  );
}
