'use client';

import React from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { Wand2, Flame, Shield, Layers, Zap } from 'lucide-react';
import { GenerationMode, PoreMechanism, SafetyThreshold } from '@/types/peptide';

const MECHANISMS = [
  { id: 'toroidal', label: 'Toroidal pore', icon: Wand2 },
  { id: 'barrel-stave', label: 'Barrel-stave', icon: Flame },
  { id: 'carpet', label: 'Carpet model', icon: Shield }
] as const;

const SAFETY = [
  { id: 'high-selectivity', label: 'Ultra-low hemolysis' },
  { id: 'balanced', label: 'Balanced penetration' }
] as const;

const MODES: Array<{ id: GenerationMode; label: string; hint: string; icon: typeof Zap }> = [
  { id: 'single', label: 'Single design', hint: 'Auto AI (~1.5s)', icon: Zap },
  { id: 'batch', label: 'Batch 3x', hint: 'Multi-engine screen', icon: Layers }
];

export const ParameterControls: React.FC = () => {
  const {
    designParams,
    generationMode,
    updateDesignParams,
    setGenerationMode,
    generatePeptide,
    isLoading,
    activeOperation,
    selectedPathogen
  } = usePeptideStore();

  const isSynthesizing =
    isLoading && (activeOperation === 'generate' || activeOperation === 'batch');

  return (
    <section className="space-y-5 bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          02 — Design constraints
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          Provider · Auto
        </span>
      </div>

      {/* Sequence length */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label htmlFor="seq-length" className="text-[12px] font-medium text-ink">
            Sequence length
          </label>
          <span className="font-mono text-[12px] tabular-nums text-ink">
            {designParams.sequenceLength} aa
          </span>
        </div>
        <input
          id="seq-length"
          type="range"
          min="12"
          max="28"
          step="1"
          value={designParams.sequenceLength}
          onChange={(e) => updateDesignParams({ sequenceLength: parseInt(e.target.value, 10) })}
          disabled={isLoading}
        />
        <div className="mt-1 flex items-baseline justify-between font-mono text-[10px] text-ink-3">
          <span>12 · compact</span>
          <span>opt. {selectedPathogen.recommendedLength.join('–')}</span>
          <span>28 · extended</span>
        </div>
      </div>

      {/* Mechanism */}
      <fieldset disabled={isLoading} className="disabled:opacity-50">
        <legend className="mb-2 text-[12px] font-medium text-ink">
          Membrane disruption mechanism
        </legend>
        <div className="space-y-1 bg-[#e8e8e8] p-1">
          {MECHANISMS.map((m) => {
            const isSelected = designParams.poreMechanism === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => updateDesignParams({ poreMechanism: m.id as PoreMechanism })}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-surface shadow-[inset_2px_0_0_#0f62fe]'
                    : 'bg-transparent hover:bg-[#dcdcdc]'
                }`}
                aria-label={m.label}
              >
                <m.icon className="h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[12px] font-medium leading-tight text-ink">
                    {m.label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Safety threshold */}
      <fieldset disabled={isLoading} className="disabled:opacity-50">
        <legend className="mb-2 text-[12px] font-medium text-ink">
          Erythrocyte safety threshold
        </legend>
        <div className="grid grid-cols-1 gap-1 bg-[#e8e8e8] p-1 sm:grid-cols-2 lg:grid-cols-1">
          {SAFETY.map((s) => {
            const isSelected = designParams.safetyThreshold === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => updateDesignParams({ safetyThreshold: s.id as SafetyThreshold })}
                className={`px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'bg-surface shadow-[inset_2px_0_0_#0f62fe]'
                    : 'bg-transparent hover:bg-[#dcdcdc]'
                }`}
                aria-label={s.label}
              >
                <span className="block text-[12px] font-medium leading-tight text-ink">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Synthesis Mode (Single auto vs Multi-engine batch) */}
      <fieldset disabled={isLoading} className="disabled:opacity-50">
        <legend className="mb-2 text-[12px] font-medium text-ink">Synthesis workflow</legend>
        <div className="grid grid-cols-2 gap-1 bg-[#e8e8e8] p-1">
          {MODES.map((m) => {
            const isSelected = generationMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setGenerationMode(m.id)}
                className={`px-2.5 py-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-surface shadow-[inset_2px_0_0_#0f62fe]'
                    : 'bg-transparent hover:bg-[#dcdcdc]'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[12px] font-medium leading-tight text-ink">
                  <m.icon className="h-3.5 w-3.5 text-ink-2" aria-hidden />
                  <span>{m.label}</span>
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-ink-3">{m.hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Optional Motif Scaffolding Lock */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="locked-motif" className="text-[12px] font-medium text-ink">
            Scaffold motif lock <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <span className="font-mono text-[10px] text-ink-3">2–12 aa</span>
        </div>
        <input
          id="locked-motif"
          type="text"
          maxLength={12}
          disabled={isLoading}
          value={designParams.lockedMotif || ''}
          placeholder="e.g. KWKLFKK"
          onChange={(e) =>
            updateDesignParams({
              lockedMotif: e.target.value.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '')
            })
          }
          className="h-9 w-full border border-line bg-sunken px-3 font-mono text-[12px] tracking-[0.14em] text-ink placeholder:text-ink-3/70 focus:border-accent focus:outline-none disabled:opacity-50"
        />
        <p className="mt-1 font-mono text-[10px] text-ink-3">
          Preserves conserved active residues during AI design &amp; evolution.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void generatePeptide()}
        disabled={isLoading}
        className="flex h-11 w-full items-center justify-center gap-2 bg-accent font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line-2"
      >
        {isSynthesizing ? (
          <>
            <span className="h-3 w-3 animate-spin border border-white border-t-transparent" aria-hidden />
            {generationMode === 'batch' ? 'Screening 3x batch…' : 'Synthesizing candidate…'}
          </>
        ) : generationMode === 'batch' ? (
          'Run 3x batch screening'
        ) : (
          'Generate therapeutic peptide'
        )}
      </button>
    </section>
  );
};
