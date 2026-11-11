'use client';

import React from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { Sliders, Sparkles, Wand2, Shield, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PoreMechanism, SafetyThreshold } from '@/types/peptide';

export const ParameterControls: React.FC = () => {
  const { designParams, updateDesignParams, generatePeptide, isLoading, selectedPathogen } = usePeptideStore();

  const handleGenerate = async () => {
    await generatePeptide();
    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#00F0FF', '#10B981', '#F59E0B']
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>2. Biophysical Design Constraints</span>
        </label>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          In-Silico Tuning
        </span>
      </div>

      {/* Sequence Length Slider */}
      <div>
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-slate-300 font-medium">Peptide Sequence Length</span>
          <span className="font-mono text-cyan-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {designParams.sequenceLength} Amino Acids
          </span>
        </div>
        <input
          type="range"
          min="12"
          max="28"
          step="1"
          value={designParams.sequenceLength}
          onChange={(e) => updateDesignParams({ sequenceLength: parseInt(e.target.value) })}
          disabled={isLoading}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
          <span>12 aa (Compact)</span>
          <span className="text-slate-400">Optimum: {selectedPathogen.recommendedLength.join(' - ')} aa</span>
          <span>28 aa (Extended)</span>
        </div>
      </div>

      {/* Target Pore Mechanism */}
      <div>
        <label className="text-xs text-slate-300 font-medium block mb-1.5">
          Membrane Disruption Mechanism
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'toroidal', label: 'Toroidal Pore', icon: Wand2, desc: 'Lipid bending & hole formation' },
              { id: 'barrel-stave', label: 'Barrel-Stave', icon: Flame, desc: 'Transmembrane stave bundle' },
              { id: 'carpet', label: 'Carpet Model', icon: Shield, desc: 'Detergent-like dissolution' }
            ] as const
          ).map((m) => {
            const isSelected = designParams.poreMechanism === m.id;
            return (
              <button
                key={m.id}
                onClick={() => updateDesignParams({ poreMechanism: m.id as PoreMechanism })}
                disabled={isLoading}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <m.icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{m.label}</span>
                </div>
                <p className="text-[9px] text-slate-500 line-clamp-1">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selectivity vs Toxicity */}
      <div>
        <label className="text-xs text-slate-300 font-medium block mb-1.5">
          Erythrocyte Safety Threshold
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'high-selectivity', label: 'Ultra-Low Hemolysis', desc: 'Prioritizes safety for human host cells' },
              { id: 'balanced', label: 'Balanced Penetration', desc: 'Higher potency against thick biofilm barriers' }
            ] as const
          ).map((s) => {
            const isSelected = designParams.safetyThreshold === s.id;
            return (
              <button
                key={s.id}
                onClick={() => updateDesignParams({ safetyThreshold: s.id as SafetyThreshold })}
                disabled={isLoading}
                className={`p-2 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-400 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <p className="text-xs font-semibold">{s.label}</p>
                <p className="text-[10px] text-slate-500">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-bold font-mono text-sm tracking-wide shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>SYNTHESIZING DE NOVO CANDIDATE...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>GENERATE THERAPEUTIC PEPTIDE</span>
          </>
        )}
      </button>
    </div>
  );
};
