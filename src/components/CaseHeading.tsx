import type { ReactNode } from 'react';

type Props = {
  id: string;
  as?: 'h2' | 'h3' | 'h4';
  note?: string;
  children: ReactNode;
};

export function CaseHeading({ id, as: Heading = 'h3', note, children }: Props) {
  return (
    <Heading className="dns-case-labeled-heading" id={id} tabIndex={-1}>
      <span>{children}</span>
      {note && <span className="dns-case-heading-label">{note}</span>}
    </Heading>
  );
}
