'use client';

import React from 'react';
import { BenchmarkComparisonReport } from '@/types/peptide';

interface ClinicalBenchmarkPanelProps {
  report: BenchmarkComparisonReport | null;
  activeSequence: string;
  activeName: string;
  isLoading: boolean;
  onRunCompare: (seq: string, name: string) => void;
}

export const ClinicalBenchmarkPanel: React.FC<ClinicalBenchmarkPanelProps> = ({
  report,
  activeSequence,
  activeName,
  isLoading,
  onRunCompare
}) => {
  if (!report) {
    return (
      <section className="flex items-center justify-between gap-4 bg-surface p-5">
        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
            Clinical reference comparison
          </h3>
          <p className="mt-1 text-[11px] text-ink-3">
            Compare against Pexiganan (MSI-78), Magainin-2, LL-37, and toxic control Melittin.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onRunCompare(activeSequence, activeName)}
          className="h-9 shrink-0 border border-line-2 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink transition-colors hover:bg-sunken disabled:opacity-50"
        >
          Run compare
        </button>
      </section>
    );
  }

  return (
    <section className="bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Clinical benchmarks · {report.candidateName}
        </h3>
        <span className="font-mono text-[10px] text-ink-3">
          Selectivity {report.candidateMetrics.therapeuticSelectivityIndex} · Protease{' '}
          {report.candidateProteaseScore}
        </span>
      </div>

      <p className="mb-3 border-l-2 border-accent bg-sunken px-3 py-2 text-[11px] leading-relaxed text-ink-2">
        {report.overallVerdict}
      </p>

      <div className="overflow-x-auto border border-line">
        <table className="w-full border-collapse text-left font-mono text-[11px]">
          <thead>
            <tr className="border-b border-line bg-sunken text-[10px] uppercase tracking-[0.08em] text-ink-3">
              <th className="px-3 py-2 font-medium">Reference</th>
              <th className="px-3 py-2 font-medium">Ref Selectivity</th>
              <th className="px-3 py-2 font-medium">Δ Selectivity</th>
              <th className="px-3 py-2 font-medium">Δ Protease</th>
              <th className="px-3 py-2 font-medium">Hemolysis parity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.comparisons.map((row) => (
              <tr key={row.referenceId} className="bg-surface hover:bg-sunken/60">
                <td className="px-3 py-2">
                  <span className="block font-sans text-[12px] font-medium text-ink">
                    {row.referenceName}
                  </span>
                  <span className="block text-[10px] text-ink-3">{row.referenceStatus}</span>
                </td>
                <td className="px-3 py-2 tabular-nums text-ink-2">
                  {row.referenceMetrics.therapeuticSelectivityIndex}/100 (
                  {row.referenceMetrics.predictedHemolysisRisk})
                </td>
                <td
                  className={`px-3 py-2 font-semibold tabular-nums ${
                    row.selectivityDelta >= 0 ? 'text-accent' : 'text-danger'
                  }`}
                >
                  {row.selectivityDelta >= 0 ? `+${row.selectivityDelta}` : row.selectivityDelta}
                </td>
                <td className="px-3 py-2 tabular-nums text-ink-2">
                  {row.proteaseStabilityDelta >= 0
                    ? `+${row.proteaseStabilityDelta}`
                    : row.proteaseStabilityDelta}
                </td>
                <td className="px-3 py-2 text-[10px] text-ink-2">{row.hemolysisComparison}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
