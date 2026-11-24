import { GridIcon } from './GridIcon';
import { iconTilePress } from './icon-tile-press';

export function CaseTestAccounting({ text, journalHref }: { text: string; journalHref: string }) {
  return (
    <div className="case-test-accounting">
      <p>{text}</p>
      <a className="icon-tile icon-tile--labeled dns-brand-button" {...iconTilePress}
        href={journalHref} target="_blank" rel="noopener">
        <span className="dns-brand-button-label">Журнал<GridIcon name="link" /></span>
      </a>
    </div>
  );
}
