import type { HTMLAttributes } from 'react';

type CaseCardListProps = HTMLAttributes<HTMLElement> & {
  as?: 'ul' | 'ol';
  layout?: 'grid' | 'strip';
  comment?: string;
};

export function CaseCardList({ as: Tag = 'ul', layout = 'grid', comment, className, ...props }: CaseCardListProps) {
  const classes = ['dns-case-stages', layout === 'grid' && 'dns-case-results', className].filter(Boolean).join(' ');
  return <Tag {...props} className={classes} data-mascot-group="" data-mascot-comment={comment} />;
}

export function CaseResults(props: Omit<CaseCardListProps, 'as' | 'layout'>) {
  return <CaseCardList {...props} data-mascot-row="" />;
}
