'use client';

import React from 'react';
import { GeneratedPeptide } from '@/types/peptide';
import { X, Printer, Beaker, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  peptide: GeneratedPeptide | null;
}

export const SynthesisModal: React.FC<ModalProps> = ({ isOpen, onClose, peptide }) => {
  if (!isOpen || !peptide) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <Beaker className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white font-mono">Wet-Lab Synthesis Specification</h2>
              <p className="text-xs text-slate-400">Standard Solid-Phase Peptide Synthesis (SPPS) Sheet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Sheet</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto font-mono text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px]">CANDIDATE CODE</span>
              <span className="font-bold text-cyan-300">{peptide.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">TARGET PATHOGEN</span>
              <span className="font-bold text-slate-200">{peptide.targetPathogen}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">RESIDUE COUNT</span>
              <span className="text-slate-200">{peptide.length} Amino Acids</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">NET CHARGE (pH 7.4)</span>
              <span className="font-bold text-emerald-400">+{peptide.metrics.netCharge} e</span>
            </div>
          </div>

          {/* Sequence Display */}
          <div>
            <span className="text-slate-400 text-[11px] block mb-1">TARGET AMINO ACID SEQUENCE:</span>
            <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold tracking-widest break-all">
              {peptide.sequence}
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Chemical Synthesis Protocol</span>
            </h3>

            <div className="space-y-2 border-l-2 border-slate-700 pl-4">
              <div>
                <span className="text-slate-400 font-semibold">Recommended Method:</span>
                <p className="text-slate-300">{peptide.synthesisProtocol.recommendedMethod}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">N-Terminal Modification:</span>
                <p className="text-slate-300">{peptide.synthesisProtocol.nTerminalModification}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">C-Terminal Modification:</span>
                <p className="text-slate-300">{peptide.synthesisProtocol.cTerminalModification}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Purification Standard:</span>
                <p className="text-slate-300">{peptide.synthesisProtocol.purificationTechnique}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Storage & Reconstitution:</span>
                <p className="text-slate-300">{peptide.synthesisProtocol.storageCondition}</p>
              </div>
            </div>
          </div>

          {/* Caution Alert */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This candidate is generated for computational in-silico and experimental research validation under the STEM2Connect Hackathon guidelines. Perform in vitro minimum inhibitory concentration (MIC) assays prior to in vivo testing.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">Generated by SynthiaBio Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Close Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
