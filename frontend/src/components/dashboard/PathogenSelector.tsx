'use client';

import React from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { WHO_PATHOGENS } from '@/lib/pathogens';
import { Bug, ShieldAlert, Check } from 'lucide-react';

export const PathogenSelector: React.FC = () => {
  const { selectedPathogen, setSelectedPathogen, isLoading } = usePeptideStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Bug className="w-4 h-4 text-cyan-400" />
          <span>1. Select Target Superbug (WHO List)</span>
        </label>
        <span className="text-[11px] font-mono text-cyan-400">
          Surface Potential: {selectedPathogen.membraneCharacteristics.outerMembraneCharge} mV
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {WHO_PATHOGENS.map((pathogen) => {
          const isSelected = selectedPathogen.id === pathogen.id;
          return (
            <button
              key={pathogen.id}
              onClick={() => setSelectedPathogen(pathogen)}
              disabled={isLoading}
              className={`relative text-left p-3 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <span className="font-bold text-slate-100 font-mono text-sm">{pathogen.name}</span>
                  <p className="text-[10px] text-slate-400 italic line-clamp-1">{pathogen.scientificName}</p>
                </div>
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    pathogen.whoPriority === 'Critical'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {pathogen.whoPriority}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
                <span>Gram-{pathogen.gramType === 'positive' ? 'Pos (+)' : 'Neg (-)'}</span>
                <span className="text-cyan-300">Target Charge: {pathogen.suggestedChargeRange.join('..')}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected pathogen context alert */}
      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="text-slate-200 font-semibold">{selectedPathogen.name} Membrane: </span>
          {selectedPathogen.membraneCharacteristics.barrierDescription}
        </p>
      </div>
    </div>
  );
};
