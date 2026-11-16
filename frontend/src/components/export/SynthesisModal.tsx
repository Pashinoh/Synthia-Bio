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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="synthesis-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col bg-surface"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id="synthesis-title" className="text-[15px] font-semibold text-ink">
              Wet-lab synthesis specification
            </h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              Solid-phase peptide synthesis sheet
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-8 items-center gap-1.5 px-2.5 text-[11px] text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="od-scroll flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-px bg-line">
            {[
              ['Candidate', peptide.name],
              ['Target', peptide.targetPathogen],
              ['Length', `${peptide.length} aa`],
              ['Net charge', `+${peptide.metrics.netCharge} e`]
            ].map(([label, value]) => (
              <div key={label} className="bg-sunken px-4 py-3">
                <span className="block font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                  {label}
                </span>
                <span className="mt-0.5 block font-mono text-[12px] text-ink">{value}</span>
              </div>
            ))}
          </div>

          <div>
            <span className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
              Sequence
            </span>
            <p className="break-all bg-sunken px-3 py-2.5 font-mono text-[13px] tracking-[0.14em] text-ink">
              {peptide.sequence}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              Chemical synthesis protocol
            </h3>
            <dl className="border-t border-line">
              {spec.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[110px_1fr] gap-3 border-b border-line py-2"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                    {label}
                  </dt>
                  <dd className="text-[11px] leading-relaxed text-ink-2">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {peptide.synthesisFeasibility && (
            <div>
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                Synthesis feasibility
              </h3>
              <div className="space-y-1">
                {[
                  ['Feasibility', `${peptide.synthesisFeasibility.feasibilityScore}/100`],
                  ['SPPS difficulty', peptide.synthesisFeasibility.sppsDifficulty],
                  ['Solubility', peptide.synthesisFeasibility.aqueousSolubility]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] text-ink-3">{label}</span>
                    <span className="font-mono text-[11px] tabular-nums text-ink">{value}</span>
                  </div>
                ))}
              </div>

              {peptide.synthesisFeasibility.liabilities.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {peptide.synthesisFeasibility.liabilities.map((liability, i) => (
                    <li key={i} className="flex gap-2 border-l-2 border-warn bg-warn-soft px-2.5 py-1.5">
                      <span className="font-mono text-[10px] text-warn" aria-hidden>
                        !
                      </span>
                      <p className="text-[11px] leading-relaxed text-ink-2">
                        {typeof liability === 'string' ? liability : liability.description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-2.5 border-l-2 border-warn bg-warn-soft px-3 py-2.5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
            <p className="text-[11px] leading-relaxed text-ink-2">
              Generated for in-silico and experimental research validation under the STEM2Connect
              Hackathon guidelines. Perform in vitro minimum inhibitory concentration (MIC) assays
              before in vivo testing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            SynthiaBio engine
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 border border-line-2 px-4 text-[11px] font-medium text-ink transition-colors hover:bg-sunken"
          >
            Close sheet
          </button>
        </div>
      </div>
    </div>
  );
};
