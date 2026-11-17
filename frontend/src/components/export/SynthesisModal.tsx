'use client';

import React, { useEffect } from 'react';
import { GeneratedPeptide } from '@/types/peptide';
import { X, Printer, ShieldAlert } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  peptide: GeneratedPeptide | null;
}

export const SynthesisModal: React.FC<ModalProps> = ({ isOpen, onClose, peptide }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !peptide) return null;

  const spec = [
    ['Method', peptide.synthesisProtocol.recommendedMethod],
    ['N-terminus', peptide.synthesisProtocol.nTerminalModification],
    ['C-terminus', peptide.synthesisProtocol.cTerminalModification],
    ['Purification', peptide.synthesisProtocol.purificationTechnique],
    ['Storage', peptide.synthesisProtocol.storageCondition]
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm print:static print:inset-auto print:block print:bg-white print:p-0 print:backdrop-blur-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="synthesis-title"
        data-pdf-sheet
        onClick={(event) => event.stopPropagation()}
        style={{ fontFamily: '"Times New Roman", Times, serif', color: '#000000' }}
        className="pdf-sheet-typography flex max-h-[90vh] w-full max-w-2xl flex-col border border-neutral-400 bg-white text-black shadow-2xl print:max-h-none print:max-w-none print:w-full print:border-0 print:shadow-none print:overflow-visible"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-black/40 px-6 py-4 print:px-0 print:pt-0 print:pb-3">
          <div>
            <h2 id="synthesis-title" className="text-[20px] font-bold leading-tight text-black">
              Wet-Lab Peptide Synthesis Specification
            </h2>
            <p className="mt-1 text-[12px] uppercase tracking-[0.06em] text-black">
              Solid-Phase Peptide Synthesis (SPPS) Sheet · SynthiaBio
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              style={{ fontFamily: 'var(--font-ibm-plex-sans), system-ui, sans-serif', color: '#ffffff' }}
              className="flex h-8 items-center gap-1.5 bg-[#0f62fe] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#0043ce]"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{ color: '#161616' }}
              className="flex h-8 w-8 items-center justify-center border border-neutral-300 text-neutral-800 transition-colors hover:bg-neutral-100"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="od-scroll flex-1 space-y-5 overflow-y-auto px-6 py-5 text-black print:overflow-visible print:px-0 print:py-4">
          <div className="grid grid-cols-2 border border-black/40">
            {[
              ['Candidate', peptide.name],
              ['Target Pathogen', peptide.targetPathogen],
              ['Length', `${peptide.length} aa`],
              ['Net Charge (pH 7.4)', `+${peptide.metrics.netCharge} e`]
            ].map(([label, value], idx) => (
              <div
                key={label}
                className={`px-4 py-2.5 ${idx % 2 === 0 ? 'border-r border-black/30' : ''} ${
                  idx < 2 ? 'border-b border-black/30' : ''
                }`}
              >
                <span className="block text-[11px] font-bold uppercase tracking-[0.05em] text-black">
                  {label}
                </span>
                <span className="mt-0.5 block text-[14px] font-semibold text-black">{value}</span>
              </div>
            ))}
          </div>

          <div>
            <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.05em] text-black">
              Primary Amino Acid Sequence
            </span>
            <p className="break-all border border-black bg-white px-3.5 py-2.5 text-[15px] font-bold leading-relaxed tracking-[0.14em] text-black">
              {peptide.sequence}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em] text-black">
              Biophysical Validation Summary
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-y border-black/35 py-2.5 text-[13px] text-black sm:grid-cols-4">
              <div>
                <span className="block text-[11px] font-bold uppercase">Selectivity</span>
                <span className="font-semibold">{peptide.metrics.therapeuticSelectivityIndex}/100</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase">Hemolysis Risk</span>
                <span className="font-semibold">{peptide.metrics.predictedHemolysisRisk}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase">Moment (μH)</span>
                <span className="font-semibold">{peptide.metrics.hydrophobicMoment}</span>
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase">Hydrophobicity</span>
                <span className="font-semibold">{peptide.metrics.meanHydrophobicity}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em] text-black">
              Chemical Synthesis Protocol
            </h3>
            <dl className="border-t border-black/40">
              {spec.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[130px_1fr] gap-4 border-b border-black/25 py-2"
                >
                  <dt className="text-[12.5px] font-bold text-black">{label}</dt>
                  <dd className="text-[13px] leading-relaxed text-black">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {peptide.synthesisFeasibility && (
            <div>
              <h3 className="mb-2 text-[12px] font-bold uppercase tracking-[0.06em] text-black">
                Synthesis Feasibility
              </h3>
              <div className="space-y-1.5 border-b border-black/25 pb-2.5">
                {[
                  ['Feasibility Score', `${peptide.synthesisFeasibility.feasibilityScore}/100`],
                  ['SPPS Difficulty', peptide.synthesisFeasibility.sppsDifficulty],
                  ['Aqueous Solubility', peptide.synthesisFeasibility.aqueousSolubility]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3 text-[13px] text-black">
                    <span className="font-bold">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {peptide.synthesisFeasibility.liabilities.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {peptide.synthesisFeasibility.liabilities.map((liability, i) => (
                    <li key={i} className="flex gap-2.5 border-l-2 border-black pl-3 py-1">
                      <span className="text-[13px] font-bold text-black" aria-hidden>
                        !
                      </span>
                      <p className="text-[12.5px] leading-relaxed text-black">
                        {typeof liability === 'string' ? liability : liability.description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-2.5 border border-black/40 border-l-4 border-l-black px-3.5 py-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-black" aria-hidden />
            <p className="text-[12px] leading-relaxed text-black">
              Generated for in-silico and experimental research validation under the STEM2Connect
              Hackathon guidelines. Perform in vitro minimum inhibitory concentration (MIC) assays
              before in vivo testing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-black/40 px-6 py-3.5 print:px-0">
          <span className="text-[11.5px] uppercase tracking-[0.06em] text-black">
            SynthiaBio Engine · Printable Laboratory Record
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: 'var(--font-ibm-plex-sans), system-ui, sans-serif', color: '#161616' }}
            className="h-9 border border-neutral-400 px-4 text-[11px] font-medium text-neutral-900 transition-colors hover:bg-neutral-100 print:hidden"
          >
            Close sheet
          </button>
        </div>
      </div>
    </div>
  );
};
