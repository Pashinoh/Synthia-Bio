'use client';

import React from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { Wand2, Flame, Shield } from 'lucide-react';
import { PoreMechanism, SafetyThreshold } from '@/types/peptide';

const MECHANISMS = [
  { id: 'toroidal', label: 'Toroidal pore', icon: Wand2 },
  { id: 'barrel-stave', label: 'Barrel-stave', icon: Flame },
  { id: 'carpet', label: 'Carpet model', icon: Shield }
] as const;

const SAFETY = [
  { id: 'high-selectivity', label: 'Ultra-low hemolysis' },
  { id: 'balanced', label: 'Balanced penetration' }
] as const;

export const ParameterControls: React.FC = () => {
  const { designParams, updateDesignParams, generatePeptide, isLoading, selectedPathogen } =
    usePeptideStore();

  return (
    <section className="space-y-5 bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          02 — Design constraints
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          In silico
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
          onChange={(e) => updateDesignParams({ sequenceLength: parseInt(e.target.value) })}
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

      <button
        type="button"
        onClick={() => void generatePeptide()}
        disabled={isLoading}
        className="flex h-11 w-full items-center justify-center gap-2 bg-accent font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line-2"
      >
        {isLoading ? (
          <>
            <span className="h-3 w-3 animate-spin border border-white border-t-transparent" aria-hidden />
            Synthesizing candidate
          </>
        ) : (
          'Generate therapeutic peptide'
        )}
      </button>
    </section>
  );
};