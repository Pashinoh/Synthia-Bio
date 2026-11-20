'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePeptideStore } from '@/store/usePeptideStore';
import {
  ChevronDown,
  Check,
  Copy,
  Download,
  FileText,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { AMINO_ACID_TABLE } from '@/lib/bio-engine/eisenberg-scale';

interface CardProps {
  onOpenProtocol: () => void;
}

const residueTone = (residue: string) => {
  const category = AMINO_ACID_TABLE[residue]?.category;
  if (category === 'positive') return 'text-accent';
  if (category === 'hydrophobic') return 'text-ink font-semibold';
  if (category === 'negative') return 'text-danger';
  return 'text-ink-3';
};

const gateStatusTone = {
  PASS: 'bg-accent-soft text-accent',
  REVIEW: 'bg-warn-soft text-warn',
  FAIL: 'bg-danger-soft text-danger'
} as const;

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const SequenceCard: React.FC<CardProps> = React.memo(({ onOpenProtocol }) => {
  const {
    currentPeptide,
    validateStability,
    optimizeCurrentPeptide,
    isLoading,
    activeOperation,
    generation,
    previousComparison
  } = usePeptideStore(
    useShallow((s) => ({
      currentPeptide: s.currentPeptide,
      validateStability: s.validateStability,
      optimizeCurrentPeptide: s.optimizeCurrentPeptide,
      isLoading: s.isLoading,
      activeOperation: s.activeOperation,
      generation: s.generation,
      previousComparison: s.previousComparison
    }))
  );
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  if (!currentPeptide) return null;

  const baseSlug = currentPeptide.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const gates = currentPeptide.inSilicoGates;
  const baselineSequence = currentPeptide.optimizationSummary?.applied
    ? currentPeptide.optimizationSummary.originalSequence
    : previousComparison && previousComparison.sequence !== currentPeptide.sequence
      ? previousComparison.sequence
      : null;
  const showPositionalDiff =
    Boolean(baselineSequence) && baselineSequence?.length === currentPeptide.sequence.length;
  const mutatedCount = showPositionalDiff && baselineSequence
    ? currentPeptide.sequence
        .split('')
        .filter((res, idx) => baselineSequence[idx] !== res).length
    : 0;

  const handleExportAction = async (action: 'fasta' | 'pdb' | 'cif' | 'sheet') => {
    if (action === 'fasta') {
      try {
        await navigator.clipboard.writeText(currentPeptide.fastaContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard unavailable
      }
    } else if (action === 'pdb') {
      triggerDownload(currentPeptide.pdbContent, `${baseSlug}.pdb`, 'chemical/x-pdb');
    } else if (action === 'cif' && currentPeptide.cifContent) {
      triggerDownload(currentPeptide.cifContent, `${baseSlug}.cif`, 'chemical/x-mmcif');
    } else if (action === 'sheet') {
      onOpenProtocol();
    }
    setMenuOpen(false);
    buttonRef.current?.focus();
  };

  const exportMenuItems: Array<{
    action: 'fasta' | 'pdb' | 'cif' | 'sheet';
    label: string;
    hint: string;
    icon: typeof Copy;
  }> = [
    { action: 'fasta', label: 'Copy FASTA', hint: '.fasta', icon: Copy },
    { action: 'pdb', label: 'Download PDB', hint: '.pdb', icon: Download },
    ...(currentPeptide.cifContent
      ? [{ action: 'cif' as const, label: 'Download mmCIF', hint: '.cif', icon: Download }]
      : []),
    { action: 'sheet', label: 'Lab sheet', hint: 'pdf / print', icon: FileText }
  ];

  return (
    <section data-tour="sequence-card" className="bg-surface">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-[15px] font-semibold tracking-tight text-ink">
              {currentPeptide.name}
            </h2>
            <span className="bg-sunken px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2">
              Gen {String(generation).padStart(2, '0')}
            </span>
            {currentPeptide.aiProviderUsed && (
              <span className="bg-sunken px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                {currentPeptide.aiProviderUsed}
              </span>
            )}
            <span className="font-mono text-[10px] text-ink-3">{currentPeptide.length} aa</span>
          </div>
          <p className="mt-1 truncate text-[11px] text-ink-3">
            Target · {currentPeptide.targetPathogen}
          </p>
        </div>

        <div className="relative shrink-0" ref={menuRef} data-tour="export-spps">
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className={`flex h-8 items-center gap-1.5 px-2.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
              menuOpen ? 'bg-stage text-white' : 'bg-sunken text-ink-2 hover:text-ink'
            }`}
          >
            <span>{copied ? 'Copied' : 'Export'}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label="Export candidate"
              className="absolute right-0 top-full z-40 mt-1 w-56 border-t-2 border-accent bg-stage py-1"
            >
              {exportMenuItems.map((item) => (
                <button
                  key={item.action}
                  role="menuitem"
                  type="button"
                  onClick={() => void handleExportAction(item.action)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[12px] text-[#f4f4f4] hover:bg-[#262626] focus-visible:bg-[#262626] focus-visible:outline-none"
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 text-[#a8a8a8]" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  <span className="font-mono text-[10px] text-[#8d8d8d]">{item.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Residue chain */}
      <div className="px-5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
            Primary sequence
          </span>
          <div className="flex items-center gap-2">
            {mutatedCount > 0 && (
              <span className="bg-accent-soft px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent">
                {mutatedCount} {mutatedCount === 1 ? 'mutation' : 'mutations'}
              </span>
            )}
            {copied && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
                <Check className="h-3 w-3" aria-hidden /> copied
              </span>
            )}
          </div>
        </div>
        <div className="od-scroll mt-2 flex flex-wrap gap-y-0.5 bg-sunken px-3 py-2.5 font-mono text-[13px] leading-6 tracking-[0.16em]">
          {currentPeptide.sequence.split('').map((residue, idx) => {
            const prevResidue = showPositionalDiff && baselineSequence ? baselineSequence[idx] : null;
            const isMutated = Boolean(prevResidue) && prevResidue !== residue;
            const aaName = AMINO_ACID_TABLE[residue]?.fullName || residue;
            const aaCat = AMINO_ACID_TABLE[residue]?.category ?? 'unknown';

            return (
              <span
                key={idx}
                title={
                  isMutated && prevResidue
                    ? `Pos ${idx + 1} · Mutated ${prevResidue} -> ${residue} (${aaName}, ${aaCat})`
                    : `${idx + 1} · ${aaName} (${aaCat})`
                }
                className={`cursor-default transition-colors hover:bg-track-hover ${
                  isMutated
                    ? 'border-b-2 border-accent bg-accent-soft px-0.5 font-semibold text-accent'
                    : residueTone(residue)
                }`}
              >
                {residue}
              </span>
            );
          })}
        </div>
      </div>

      {/* In-Silico Lab Gates Summary (from Backend RFD4-inspired evaluation) */}
      {gates && (
        <div className="mt-4 px-5">
          <div className="flex items-center justify-between gap-2 bg-sunken px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-2">
              In-silico gates · {gates.passedCount}/{gates.totalGates}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tabular-nums text-ink-3">
                Reward {gates.rewardScore}
              </span>
              <span
                className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
                  gateStatusTone[gates.overallStatus]
                }`}
              >
                {gates.overallStatus}
              </span>
            </div>
          </div>
          <div className="mt-1 grid grid-cols-1 gap-1 border border-line bg-surface p-2">
            {gates.gates.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="flex min-w-0 items-center gap-1.5 truncate text-ink-2">
                  <span
                    className={`font-mono font-bold ${g.passed ? 'text-accent' : 'text-danger'}`}
                  >
                    {g.passed ? '✓' : '✕'}
                  </span>
                  <span className="truncate">{g.label}</span>
                </span>
                <span className="shrink-0 font-mono text-ink-3">{g.observed}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      <div className="mt-4 space-y-2 px-5">
        <div className="bg-sunken px-3 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Rationale
          </span>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
            {currentPeptide.molecularRationale}
          </p>
        </div>
        <div className="bg-sunken px-3 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Membrane affinity
          </span>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
            {currentPeptide.membraneAffinityExplanation}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-5 pt-4">
        <button
          type="button"
          onClick={() => void validateStability(currentPeptide.sequence)}
          disabled={isLoading}
          className="flex h-10 items-center justify-center gap-1.5 border border-line-2 px-2 text-[11px] font-medium text-ink transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{isLoading && activeOperation === 'validate' ? 'Validating…' : 'Stability'}</span>
        </button>

        <button
          type="button"
          onClick={() => void optimizeCurrentPeptide(3)}
          disabled={isLoading}
          className="flex h-10 items-center justify-center gap-1.5 border border-line-2 px-2 text-[11px] font-medium text-ink transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          <span>{isLoading && activeOperation === 'optimize' ? 'Optimizing…' : 'Optimize'}</span>
        </button>
      </div>
    </section>
  );
});

SequenceCard.displayName = 'SequenceCard';
