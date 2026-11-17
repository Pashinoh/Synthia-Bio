'use client';

import React from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { WHO_PATHOGENS } from '@/lib/pathogens';

export const PathogenSelector: React.FC = React.memo(() => {
  const selectedPathogen = usePeptideStore((s) => s.selectedPathogen);
  const setSelectedPathogen = usePeptideStore((s) => s.setSelectedPathogen);
  const isLoading = usePeptideStore((s) => s.isLoading);

  return (
    <section className="bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          01 — Target pathogen
        </h2>
        <span className="font-mono text-[11px] text-ink-3">
          {selectedPathogen.membraneCharacteristics.outerMembraneCharge} mV surface
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 bg-track p-0.5">
        {WHO_PATHOGENS.map((pathogen, idx) => {
          const isSelected = selectedPathogen.id === pathogen.id;
          return (
            <button
              key={pathogen.id}
              type="button"
              onClick={() => setSelectedPathogen(pathogen)}
              disabled={isLoading}
              aria-pressed={isSelected}
              className={`group relative flex flex-col justify-between px-2.5 py-1.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? 'bg-surface shadow-[inset_2px_0_0_var(--accent)]'
                  : 'bg-transparent hover:bg-track-hover'
              }`}
            >
              <span className="block text-[12px] font-semibold leading-tight text-ink">
                {pathogen.name}
              </span>
              <span className="mt-0.5 block font-mono text-[10px] italic text-ink-3">
                Charge {pathogen.membraneCharacteristics.outerMembraneCharge} e
              </span>

              {/* Detail on hover / keyboard focus (anchored left/right so it never overflows the sidebar) */}
              <span
                role="tooltip"
                className={`pointer-events-none absolute z-30 w-52 border-l-2 border-accent bg-stage p-3 text-[11px] font-normal leading-relaxed text-[#f4f4f4] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${
                  idx % 2 === 1 ? 'right-0' : 'left-0'
                } ${idx >= 4 ? 'bottom-full mb-1' : 'top-full mt-1'}`}
              >
                <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[#a8a8a8]">
                  {pathogen.whoPriority} priority
                </span>
                <span className="mt-1 block">{pathogen.membraneCharacteristics.barrierDescription}</span>
                <span className="mt-2 block font-mono text-[10px] text-[#a8a8a8]">
                  Suggested length {pathogen.recommendedLength.join('–')} aa
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
});

PathogenSelector.displayName = 'PathogenSelector';
