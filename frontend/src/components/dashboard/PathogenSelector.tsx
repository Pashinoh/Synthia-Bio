'use client';

import React from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { WHO_PATHOGENS } from '@/lib/pathogens';

export const PathogenSelector: React.FC = () => {
  const { selectedPathogen, setSelectedPathogen, isLoading } = usePeptideStore();

  return (
    <section className="bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
          01 — Target pathogen
        </h2>
        <span className="font-mono text-[11px] text-ink-3">
          {selectedPathogen.membraneCharacteristics.outerMembraneCharge} mV surface
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 bg-[#e8e8e8] p-0.5">
        {WHO_PATHOGENS.map((pathogen) => {
          const isSelected = selectedPathogen.id === pathogen.id;
          return (
            <button
              key={pathogen.id}
              type="button"
              onClick={() => setSelectedPathogen(pathogen)}
              disabled={isLoading}
              aria-pressed={isSelected}
              className={`group relative flex flex-col justify-between p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? 'bg-surface shadow-[inset_2px_0_0_#0f62fe]'
                  : 'bg-transparent hover:bg-[#dcdcdc]'
              }`}
            >
              <span className="block text-[13px] font-semibold leading-tight text-ink">
                {pathogen.name}
              </span>
              <span className="mt-1 block font-mono text-[10px] italic text-ink-3">
                Charge {pathogen.membraneCharacteristics.outerMembraneCharge} e
              </span>

              {/* Detail on hover / keyboard focus */}
              <span
                role="tooltip"
                className="pointer-events-none absolute left-2 top-full z-30 mt-1 w-60 border-l-2 border-accent bg-stage p-3 text-[11px] font-normal leading-relaxed text-[#f4f4f4] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
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
};