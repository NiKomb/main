import type { ReactNode } from 'react';
import { CaseCard } from './CaseCard';

export function CaseDecisionCopy({ hypothesisNumber, hypothesis, solution }: {
  hypothesisNumber: number;
  hypothesis: ReactNode;
  solution: ReactNode;
}) {
  return (
    <div className="dns-decision-copy" data-mascot-row="">
      <div className="dns-case-block">
        <h4>Гипотеза {hypothesisNumber}</h4>
        <CaseCard className="case-decision-card">{hypothesis}</CaseCard>
      </div>
      <div className="dns-case-block">
        <h4>Решение</h4>
        <CaseCard className="case-decision-card">{solution}</CaseCard>
      </div>
    </div>
  );
}
