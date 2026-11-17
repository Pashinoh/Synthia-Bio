'use client';

import React from 'react';
import { OptimizePeptideResponse } from '@/types/peptide';
import { ArrowRight, Check } from 'lucide-react';

interface OptimizationPanelProps {
  result: OptimizePeptideResponse;
  activeSequence: string;
  onApplyEvolved: () => void;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = React.memo(({
  result,
  activeSequence,
  onApplyEvolved
}) => {
  const traj = result.evolutionTrajectory;
  const isApplied = activeSequence === traj.finalSequence;
  const hasChange = traj.appliedMutations.length > 0 && traj.finalSequence !== traj.originalSequence;

  return (
    <section className="bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          In-silico directed evolution
        </h3>
        <div className="flex items-center gap-3 font-mono text-[10px] text-ink-3">
          {result.lockedPositions && result.lockedPositions.length > 0 && (
            <span>Locked pos: {result.lockedPositions.join(',')}</span>
          )}
          <span>{traj.roundsExecuted} rounds</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-3">
        <div className="bg-sunken px-4 py-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            Selectivity delta
          </span>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[15px] tabular-nums text-ink">
            <span>{traj.initialMetrics.therapeuticSelectivityIndex}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden />
            <span className="font-semibold text-accent">
              {traj.finalMetrics.therapeuticSelectivityIndex}
            </span>
          </p>
        </div>

        <div className="bg-sunken px-4 py-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            Composite fitness
          </span>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[15px] tabular-nums text-ink">
            <span>{traj.initialFitness}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden />
            <span className="font-semibold text-ink">{traj.finalFitness}</span>
          </p>
        </div>

        <div className="bg-sunken px-4 py-3">
          <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            Hemolysis safety
          </span>
          <p className="mt-1 flex items-center gap-1.5 font-mono text-[13px] text-ink">
            <span>{traj.initialMetrics.predictedHemolysisRisk}</span>
            <ArrowRight className="h-3.5 w-3.5 text-ink-3" aria-hidden />
            <span className="font-semibold text-ink">{traj.finalMetrics.predictedHemolysisRisk}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-sunken px-3 py-2.5">
          <div className="min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              Evolved sequence ({traj.appliedMutations.join(', ') || 'already optimal'})
            </span>
            <p className="mt-0.5 break-all font-mono text-[12px] tracking-[0.12em] text-ink">
              {traj.finalSequence}
            </p>
          </div>

          {hasChange && (
            <button
              type="button"
              disabled={isApplied}
              onClick={onApplyEvolved}
              className={`flex h-9 shrink-0 items-center gap-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                isApplied
                  ? 'border border-line bg-surface text-ink-3'
                  : 'bg-accent-btn text-white hover:bg-accent-hover'
              }`}
            >
              {isApplied && <Check className="h-3.5 w-3.5" aria-hidden />}
              <span>{isApplied ? 'Applied to studio' : 'Apply evolved'}</span>
            </button>
          )}
        </div>

        {result.recommendedMutations.length > 0 && (
          <div className="border-t border-line pt-3">
            <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
              Top single-point substitutions
            </h4>
            <ul className="divide-y divide-line border border-line">
              {result.recommendedMutations.slice(0, 3).map((mut) => (
                <li key={mut.mutationCode} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-accent">
                      {mut.mutationCode}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-ink-3">
                      Fitness +{mut.compositeScoreDelta} · Protease {mut.proteaseStabilityScore}/100
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-2">{mut.rationale}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
});

OptimizationPanel.displayName = 'OptimizationPanel';
