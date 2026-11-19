import { site } from '../data/site';
import { iconTilePress } from './icon-tile-press';

// All marks use the shared 2 px grid, including the chevrons.
const icons = {
  telegram: 'M7 1h2v1H7zM5 2h2v1H5zM8 2h1v1H8zM3 3h2v1H3zM7 3h1v1H7zM1 4h2v1H1zM7 4h1v1H7zM3 5h2v1H3zM7 5h1v1H7zM5 6h1v1H5zM7 6h1v1H7zM5 7h2v1H5zM6 8h1v1H6z',
  email: 'M2 2h6v1H2zM1 3h2v1H1zM7 3h2v1H7zM1 4h1v1H1zM3 4h1v1H3zM6 4h1v1H6zM8 4h1v1H8zM1 5h1v1H1zM4 5h2v1H4zM8 5h1v1H8zM1 6h1v1H1zM8 6h1v1H8zM2 7h6v1H2z',
  cv: 'M3 1h3v1H3zM2 2h1v1H2zM5 2h2v1H5zM2 3h1v1H2zM5 3h1v1H5zM7 3h1v1H7zM2 4h1v1H2zM5 4h3v1H5zM2 5h1v1H2zM7 5h1v1H7zM2 6h1v1H2zM7 6h1v1H7zM2 7h1v1H2zM7 7h1v1H7zM3 8h4v1H3z',
};

export function ContactButtons() {
  return (
    <ul className="portfolio-socials" aria-label="Контакты и резюме">
      {site.profile.socialLinks.map(({ id, label, href }) => {
        const icon = (
          <svg className="pixel-icon" width="20" height="20" viewBox="0 0 10 10" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
            <path d={icons[id]} />
          </svg>
        );
        return (
          <li key={id}>
            {href
              ? <a className="icon-tile" {...iconTilePress} href={href} aria-label={label} title={label}>{icon}</a>
              : <button type="button" className="icon-tile" {...iconTilePress} aria-label={label}
                  title={`${label} — ссылка пока не указана`}>{icon}</button>}
          </li>
        );
      })}
    </ul>
  );
}
