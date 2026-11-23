import type { ReactNode } from 'react';
import { CaseHeading } from './CaseHeading';

type Props = {
  id: string;
  sectionId?: string;
  title: string;
  as?: 'h2' | 'h3';
  variant?: 'divider' | 'labeled';
  note?: string;
  children: ReactNode;
};

export function CaseSection({ id, sectionId, title, as: Heading = 'h2', variant = 'divider', note, children }: Props) {
  return (
    <section id={sectionId} className={`case-content-section dns-case-section case-section case-section--${variant}`} aria-labelledby={id}>
      {variant === 'labeled'
        ? <CaseHeading id={id} as={Heading} note={note}>{title}</CaseHeading>
        : <Heading className="dns-case-divider" id={id} tabIndex={-1}>{title}</Heading>}
      <div className="dns-case-subsections">{children}</div>
    </section>
  );
}
