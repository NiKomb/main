import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { site } from '../data/site';
import { GridIcon } from './GridIcon';
import { iconTilePress } from './icon-tile-press';

async function writeClipboardText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  // The HTTP preview can still copy through the browser's copy command.
  const focused = document.activeElement;
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.style.cssText = 'position: fixed; inset: 0 auto auto 0; opacity: 0;';
  document.body.append(field);
  try {
    field.select();
    return document.execCommand('copy');
  } finally {
    field.remove();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
  }
}

export function ContactButtons() {
  const [feedback, setFeedback] = useState('');
  const feedbackTimer = useRef<number | undefined>(undefined);
  const copyAttempt = useRef(0);

  useEffect(() => () => {
    copyAttempt.current += 1;
    window.clearTimeout(feedbackTimer.current);
  }, []);

  async function copyEmail(address: string) {
    const attempt = ++copyAttempt.current;
    const copied = await writeClipboardText(address).catch(() => false);
    if (attempt !== copyAttempt.current) return;
    window.clearTimeout(feedbackTimer.current);
    setFeedback(copied ? 'Скопировано' : 'Не скопировано');
    feedbackTimer.current = window.setTimeout(() => setFeedback(''), 2000);
  }

  return (
    <ul className="portfolio-socials" aria-label="Контакты и резюме">
      {site.profile.socialLinks.map((contact) => {
        const { id, label } = contact;
        const isTelegram = id === 'telegram';
        const className = `icon-tile ${isTelegram ? 'icon-tile--lit' : 'icon-tile--secondary'}`;
        const icon = <GridIcon name={id} />;
        const status = id === 'email' ? feedback : '';
        const text = status || label;
        return (
          <li key={id} data-contact={id}>
            {contact.id === 'email'
              ? <button type="button" className={className} {...iconTilePress} aria-label="Скопировать адрес почты"
                  aria-description={contact.address} onClick={() => void copyEmail(contact.address)}>{icon}</button>
              : <a className={className} {...iconTilePress} href={contact.href} aria-label={label}
                  target={isTelegram ? '_blank' : undefined} rel={isTelegram ? 'noopener' : undefined}>{icon}</a>}
            <span className="portfolio-contact-label" data-copy-feedback={status ? '' : undefined} aria-hidden="true">
              <span key={text}>{Array.from(text, (character, index) => (
                <span className="portfolio-contact-character" key={index}
                  style={{ '--contact-character-index': index } as CSSProperties}>{character}</span>
              ))}</span>
            </span>
            {id === 'email' && <span className="portfolio-contact-status" role="status">{status}</span>}
          </li>
        );
      })}
    </ul>
  );
}
