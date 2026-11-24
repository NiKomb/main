import type { HTMLAttributes } from 'react';

export function CaseCard({ as: Tag = 'div', comment, highlight, children, ...props }: HTMLAttributes<HTMLElement> & {
  as?: 'div' | 'li' | 'p' | 'section';
  comment?: string;
  highlight?: boolean;
}) {
  return (
    <Tag {...props} data-mascot-surface="card" data-mascot-comment={comment} data-mascot-highlight={highlight ? '' : undefined}>
      {children}
      {highlight && <span className="case-fact-highlight" data-viewport-edge-overlay="" aria-hidden="true" />}
    </Tag>
  );
}
