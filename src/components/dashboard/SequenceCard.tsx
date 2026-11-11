'use client';

import React, { useState } from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { Copy, Check, Download, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import { AMINO_ACID_TABLE } from '@/lib/bio-engine/eisenberg-scale';

interface CardProps {
  onOpenProtocol: () => void;
}

export const SequenceCard: React.FC<CardProps> = ({ onOpenProtocol }) => {
  const { currentPeptide } = usePeptideStore();
  const [copied, setCopied] = useState(false);

  if (!currentPeptide) return null;

  const handleCopyFasta = () => {
    navigator.clipboard.writeText(currentPeptide.fastaContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdb = () => {
    const blob = new Blob([currentPeptide.pdbContent], { type: 'chemical/x-pdb' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPeptide.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getResidueColor = (char: string) => {
    const data = AMINO_ACID_TABLE[char];
    if (!data) return 'text-slate-200';
    if (data.category === 'positive') return 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30';
    if (data.category === 'hydrophobic') return 'text-amber-400 bg-amber-950/40 border-amber-500/30';
    if (data.category === 'negative') return 'text-red-400 bg-red-950/40 border-red-500/30';
    return 'text-blue-300 bg-blue-950/40 border-blue-500/30';
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-xl space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold font-mono text-cyan-300">{currentPeptide.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              {currentPeptide.length} Residues
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Target: {currentPeptide.targetPathogen}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyFasta}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-mono text-slate-200 transition-all shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'FASTA'}</span>
          </button>

          <button
            onClick={handleDownloadPdb}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-xs font-mono text-cyan-300 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.PDB File</span>
          </button>

          <button
            onClick={onOpenProtocol}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-xs font-mono text-emerald-300 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lab Sheet</span>
          </button>
        </div>
      </div>

      {/* Visual Sequence Chain */}
      <div>
        <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
          Primary Amino Acid Sequence
        </label>
        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-sm">
          {currentPeptide.sequence.split('').map((residue, idx) => (
            <span
              key={idx}
              title={`Pos ${idx + 1}: ${AMINO_ACID_TABLE[residue]?.fullName || residue} (${AMINO_ACID_TABLE[residue]?.category})`}
              className={`w-7 h-8 flex items-center justify-center rounded-lg font-bold border transition-transform hover:scale-110 cursor-pointer ${getResidueColor(
                residue
              )}`}
            >
              {residue}
            </span>
          ))}
        </div>
      </div>

      {/* Scientific Rationale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Biochemical Rationale</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{currentPeptide.molecularRationale}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Membrane Affinity Mode</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{currentPeptide.membraneAffinityExplanation}</p>
        </div>
      </div>
    </div>
  );
};
