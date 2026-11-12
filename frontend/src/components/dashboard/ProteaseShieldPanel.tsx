'use client';

import React from 'react';
import { ProteaseStabilityReport } from '@/types/peptide';

interface ProteaseShieldPanelProps {
  report: ProteaseStabilityReport | null;
}

const enzymeColor: Record<string, string> = {
  Trypsin: '#EF4444',
  Chymotrypsin: '#F59E0B',
  Elastase: '#10B981'
};

export const ProteaseShieldPanel: React.FC<ProteaseShieldPanelProps> = ({ report }) => {
  if (!report) {
    return (
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col items-center justify-center h-64">
        <p className="text-xs text-slate-500 font-mono">Validate a peptide to view protease shield</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md shadow-xl flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 font-mono">Protease Stability Shield</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
          Score: {report.stabilityScore}
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-mono mb-1">Stability Score</div>
          <div className="text-lg font-bold font-mono text-emerald-400">{report.stabilityScore}</div>
          <div className="text-[10px] text-slate-500 mt-1">0 – 100 scale</div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-mono mb-1">Est. Half-Life</div>
          <div className="text-lg font-bold font-mono text-cyan-400">{report.estimatedHalfLifeMinutes} min</div>
          <div className="text-[10px] text-slate-500 mt-1">Serum stability estimate</div>
        </div>
      </div>

      {/* Cleavage sites */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
            Cleavage Sites ({report.cleavageSites.length})
          </h4>
        </div>
        {report.cleavageSites.length === 0 ? (
          <p className="text-[10px] text-slate-500 font-mono italic">No cleavage sites detected</p>
        ) : (
          <div className="space-y-1">
            {report.cleavageSites.map((site, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/50">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono text-[10px]`} style={{ backgroundColor: enzymeColor[site.enzyme] + '20', color: enzymeColor[site.enzyme], border: '1px solid ' + enzymeColor[site.enzyme] + '40' }}>
                    {site.enzyme}
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">{site.motif}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">Pos {site.position}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stabilization strategies */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider mb-2">
          Stabilization Strategies
        </h4>
        <ul className="space-y-1">
          {report.stabilizationStrategies.map((strategy, i) => (
            <li key={i} className="flex items-start gap-2 p-2 rounded bg-slate-950/50 border border-slate-800/50">
              <span className="text-[9px] text-emerald-400 shrink-0">▸</span>
              <p className="text-[10px] text-slate-300 leading-relaxed">{strategy}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
