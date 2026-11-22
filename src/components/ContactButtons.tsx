import { site } from '../data/site';
import { GridIcon } from './GridIcon';
import { iconTilePress } from './icon-tile-press';

export function ContactButtons() {
  return (
    <ul className="portfolio-socials" aria-label="Контакты и резюме">
      {site.profile.socialLinks.map(({ id, label, href }) => {
        const icon = <GridIcon name={id} />;
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
