'use client';

import React, { useState } from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { useShallow } from 'zustand/react/shallow';
import { Wand2, Flame, Shield, Layers, Zap, ChevronDown } from 'lucide-react';
import { GenerationMode, PoreMechanism, SafetyThreshold } from '@/types/peptide';

const MECHANISMS = [
  { id: 'toroidal', label: 'Toroidal', icon: Wand2 },
  { id: 'barrel-stave', label: 'Barrel-stave', icon: Flame },
  { id: 'carpet', label: 'Carpet', icon: Shield }
] as const;

const SAFETY = [
  { id: 'high-selectivity', label: 'Low hemolysis' },
  { id: 'balanced', label: 'Balanced' }
] as const;

const MODES: Array<{ id: GenerationMode; label: string; icon: typeof Zap }> = [
  { id: 'single', label: 'Single · Auto', icon: Zap },
  { id: 'batch', label: 'Batch 3x', icon: Layers }
];

export const ParameterControls: React.FC = React.memo(() => {
  const {
    sequenceLength,
    poreMechanism,
    safetyThreshold,
    lockedMotif,
    generationMode,
    recommendedLength,
    isLoading,
    activeOperation,
    updateDesignParams,
    setGenerationMode,
    generatePeptide
  } = usePeptideStore(
    useShallow((s) => ({
      sequenceLength: s.designParams.sequenceLength,
      poreMechanism: s.designParams.poreMechanism,
      safetyThreshold: s.designParams.safetyThreshold,
      lockedMotif: s.designParams.lockedMotif || '',
      generationMode: s.generationMode,
      recommendedLength: s.selectedPathogen.recommendedLength,
      isLoading: s.isLoading,
      activeOperation: s.activeOperation,
      updateDesignParams: s.updateDesignParams,
      setGenerationMode: s.setGenerationMode,
      generatePeptide: s.generatePeptide
    }))
  );

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isSynthesizing =
    isLoading && (activeOperation === 'generate' || activeOperation === 'batch');

  return (
    <section className="space-y-3.5 bg-surface p-4">
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
        <div className="mb-1 flex items-baseline justify-between">
          <label htmlFor="seq-length" className="text-[12px] font-medium text-ink">
            Sequence length
          </label>
          <span className="font-mono text-[12px] tabular-nums text-ink">{sequenceLength} aa</span>
        </div>
        <input
          id="seq-length"
          type="range"
          min="12"
          max="28"
          step="1"
          value={sequenceLength}
          onChange={(e) => updateDesignParams({ sequenceLength: parseInt(e.target.value, 10) })}
          disabled={isLoading}
        />
        <div className="flex items-baseline justify-between font-mono text-[10px] text-ink-3">
          <span>12</span>
          <span>opt. {recommendedLength.join('–')}</span>
          <span>28</span>
        </div>
      </div>

      {/* Mechanism (compact 3-col horizontal grid) */}
      <fieldset disabled={isLoading} className="disabled:opacity-50">
        <legend className="mb-1.5 text-[12px] font-medium text-ink">
          Membrane disruption mechanism
        </legend>
        <div className="grid grid-cols-3 gap-1 bg-track p-1">
          {MECHANISMS.map((m) => {
            const isSelected = poreMechanism === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => updateDesignParams({ poreMechanism: m.id as PoreMechanism })}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 text-center transition-colors ${
                  isSelected
                    ? 'bg-surface shadow-[inset_0_-2px_0_var(--accent)]'
                    : 'bg-transparent hover:bg-track-hover'
                }`}
                aria-label={m.label}
              >
                <m.icon className="h-3.5 w-3.5 shrink-0 text-ink-2" aria-hidden />
                <span className="truncate text-[11px] font-medium leading-tight text-ink">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Safety threshold (compact 2-col horizontal grid) */}
      <fieldset disabled={isLoading} className="disabled:opacity-50">
        <legend className="mb-1.5 text-[12px] font-medium text-ink">
          Erythrocyte safety threshold
        </legend>
        <div className="grid grid-cols-2 gap-1 bg-track p-1">
          {SAFETY.map((s) => {
            const isSelected = safetyThreshold === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => updateDesignParams({ safetyThreshold: s.id as SafetyThreshold })}
                className={`px-2.5 py-2 text-left transition-colors ${
                  isSelected
                    ? 'bg-surface shadow-[inset_2px_0_0_var(--accent)]'
                    : 'bg-transparent hover:bg-track-hover'
                }`}
                aria-label={s.label}
              >
                <span className="block truncate text-[11px] font-medium leading-tight text-ink">
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Compact Synthesis Mode + Collapsible Advanced Motif Lock */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1 bg-track p-1">
          {MODES.map((m) => {
            const isSelected = generationMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={isLoading}
                aria-pressed={isSelected}
                onClick={() => setGenerationMode(m.id)}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 transition-colors disabled:opacity-50 ${
                  isSelected
                    ? 'bg-surface shadow-[inset_2px_0_0_var(--accent)]'
                    : 'bg-transparent hover:bg-track-hover'
                }`}
              >
                <m.icon className="h-3.5 w-3.5 shrink-0 text-ink-2" aria-hidden />
                <span className="text-[11px] font-medium leading-tight text-ink">{m.label}</span>
              </button>
            );
          })}
        </div>

        <div>
          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((open) => !open)}
            className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 transition-colors hover:text-ink"
          >
            <span>
              Advanced · Motif lock{lockedMotif ? ` (${lockedMotif})` : ''}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          {advancedOpen && (
            <div className="mt-2">
              <div className="mb-1 flex items-baseline justify-between">
                <label htmlFor="locked-motif" className="text-[11px] font-medium text-ink">
                  Scaffold motif lock <span className="font-normal text-ink-3">(optional)</span>
                </label>
                <span className="font-mono text-[10px] text-ink-3">2–12 aa</span>
              </div>
              <input
                id="locked-motif"
                type="text"
                maxLength={12}
                disabled={isLoading}
                value={lockedMotif}
                placeholder="e.g. KWKLFKK"
                onChange={(e) =>
                  updateDesignParams({
                    lockedMotif: e.target.value.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '')
                  })
                }
                className="h-8 w-full border border-line bg-sunken px-2.5 font-mono text-[12px] tracking-[0.14em] text-ink placeholder:text-ink-3/70 focus:border-accent focus:outline-none disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void generatePeptide()}
        disabled={isLoading}
        className="flex h-10 w-full items-center justify-center gap-2 bg-accent-btn font-mono text-[11px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line-2"
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
});

ParameterControls.displayName = 'ParameterControls';
