'use client';

import React from 'react';
import { ProteaseStabilityReport } from '@/types/peptide';

interface ProteaseShieldPanelProps {
  report: ProteaseStabilityReport | null;
}

const enzymeTone: Record<string, string> = {
  Trypsin: 'text-danger bg-danger-soft',
  Chymotrypsin: 'text-warn bg-warn-soft',
  Elastase: 'text-ink-2 bg-sunken'
};

export const ProteaseShieldPanel: React.FC<ProteaseShieldPanelProps> = React.memo(({ report }) => {
  if (!report) {
    return (
      <section className="flex h-64 flex-col bg-surface p-5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Protease shield
        </h3>
        <div className="flex flex-1 items-center justify-center">
          <p className="font-mono text-[11px] text-ink-3">Run stability validation</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface">
      <div className="flex items-baseline justify-between gap-3 p-5 pb-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          Protease shield
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
          Serum stability
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-line">
        <div className="bg-sunken px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            Stability score
          </span>
          <p className="mt-1 font-mono text-[26px] leading-none tabular-nums text-ink">
            {report.stabilityScore}
            <span className="ml-1 text-[11px] text-ink-3">/100</span>
          </p>
        </div>
        <div className="bg-sunken px-5 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            Est. half-life
          </span>
          <p className="mt-1 font-mono text-[26px] leading-none tabular-nums text-ink">
            {report.estimatedHalfLifeMinutes}
            <span className="ml-1 text-[11px] text-ink-3">min</span>
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            Cleavage sites
          </h4>
          <span className="font-mono text-[10px] tabular-nums text-ink-3">
            {report.cleavageSites.length}
          </span>
        </div>

        {report.cleavageSites.length === 0 ? (
          <p className="font-mono text-[11px] text-ink-3">No cleavage sites detected</p>
        ) : (
          <ul className="border-t border-line">
            {report.cleavageSites.map((site, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 border-b border-line py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] ${
                      enzymeTone[site.enzyme] ?? 'bg-sunken text-ink-2'
                    }`}
                  >
                    {site.enzyme}
                  </span>
                  <span className="truncate font-mono text-[11px] text-ink">{site.motif}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-3">
                  pos {site.position}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-5 pb-5">
        <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
          Stabilization strategies
        </h4>
        <ul className="space-y-2">
          {report.stabilizationStrategies.map((strategy, i) => (
            <li key={i} className="flex gap-3 border-l-2 border-line-2 pl-3">
              <span className="font-mono text-[10px] tabular-nums text-ink-3">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[11px] leading-relaxed text-ink-2">{strategy}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
});

ProteaseShieldPanel.displayName = 'ProteaseShieldPanel';
