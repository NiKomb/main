import { site } from '../data/site';
import { GridIcon } from './GridIcon';
import { iconTilePress } from './icon-tile-press';

export function ContactButtons() {
  return (
    <ul className="portfolio-socials" aria-label="Контакты и резюме">
      {site.profile.socialLinks.map(({ id, label, href }) => {
        const className = `icon-tile ${id === 'telegram' ? 'icon-tile--lit' : 'icon-tile--secondary'}`;
        const icon = <GridIcon name={id} />;
        return (
          <li key={id} data-contact={id}>
            {href
              ? <a className={className} {...iconTilePress} href={href} aria-label={label} title={label}>{icon}</a>
              : <button type="button" className={className} {...iconTilePress} aria-label={label}
                  title={`${label} — ссылка пока не указана`}>{icon}</button>}
          </li>
        );
      })}
    </ul>
  );
}
