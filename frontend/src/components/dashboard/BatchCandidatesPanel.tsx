'use client';

import React from 'react';
import { ScreenedPeptideCandidate } from '@/types/peptide';

interface BatchCandidatesPanelProps {
  candidates: ScreenedPeptideCandidate[];
  activeSequence: string;
  onSelect: (candidate: ScreenedPeptideCandidate) => void;
}

export const BatchCandidatesPanel: React.FC<BatchCandidatesPanelProps> = ({
  candidates,
  activeSequence,
  onSelect
}) => {
  if (candidates.length === 0) return null;

  return (
    <section className="bg-surface p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Multi-candidate batch screening
        </h3>
        <span className="font-mono text-[10px] text-ink-3">
          {candidates.length} diverse candidates ranked
        </span>
      </div>

      <div className="divide-y divide-line border border-line">
        {candidates.map((cand) => {
          const isActive = cand.peptide.sequence === activeSequence;
          const gates = cand.peptide.inSilicoGates;
          return (
            <button
              key={cand.peptide.id}
              type="button"
              onClick={() => onSelect(cand)}
              className={`flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                isActive
                  ? 'bg-accent-soft/60 shadow-[inset_2px_0_0_#0f62fe]'
                  : 'bg-surface hover:bg-sunken'
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-stage px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                    #{cand.rank}
                  </span>
                  <span className="font-mono text-[12px] font-semibold text-ink">
                    {cand.peptide.sequence}
                  </span>
                  <span className="bg-sunken px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-3">
                    {cand.peptide.aiProviderUsed || 'ai'}
                  </span>
                  {gates && (
                    <span
                      className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        gates.overallStatus === 'PASS'
                          ? 'bg-accent-soft text-accent'
                          : gates.overallStatus === 'FAIL'
                            ? 'bg-danger-soft text-danger'
                            : 'bg-warn-soft text-warn'
                      }`}
                    >
                      {gates.passedCount}/{gates.totalGates} {gates.overallStatus}
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[10px] text-ink-3">{cand.tradeoffSummary}</p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  Fitness
                </span>
                <span className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                  {cand.compositeFitness}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
