import type { ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  dividerLabel?: string;
  children: ReactNode;
};

export function CaseSection({ id, title, dividerLabel, children }: Props) {
  return (
    <>
      {dividerLabel
        ? <p className="dns-case-divider">{dividerLabel}</p>
        : <h2 className="dns-case-divider" id={id} tabIndex={-1}>{title}</h2>}
      <section className="case-content-section dns-case-section" aria-labelledby={id}>
        {dividerLabel && <h2 id={id} tabIndex={-1}>{title}</h2>}
        {children}
      </section>
    </>
  );
}
