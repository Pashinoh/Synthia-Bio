'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePeptideStore } from '@/store/usePeptideStore';
import { ChevronDown, Check, Copy, Download, FileText, ShieldAlert } from 'lucide-react';
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

export const SequenceCard: React.FC<CardProps> = ({ onOpenProtocol }) => {
  const { currentPeptide, validateStability, isLoading, generation } = usePeptideStore();
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

  const closeMenu = () => {
    setMenuOpen(false);
    buttonRef.current?.focus();
  };

  const handleCopyFasta = async () => {
    try {
      await navigator.clipboard.writeText(currentPeptide.fastaContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (insecure context) — no-op
    }
    closeMenu();
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
    closeMenu();
  };

  const handleOpenProtocol = () => {
    onOpenProtocol();
    closeMenu();
  };

  return (
    <section className="bg-surface">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-[15px] font-semibold tracking-tight text-ink">
              {currentPeptide.name}
            </h2>
            <span className="bg-sunken px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-2">
              Gen {String(generation).padStart(2, '0')}
            </span>
            <span className="font-mono text-[10px] text-ink-3">{currentPeptide.length} aa</span>
          </div>
          <p className="mt-1 truncate text-[11px] text-ink-3">
            Target · {currentPeptide.targetPathogen}
          </p>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
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
              {[
                { label: 'Copy FASTA', hint: '.fasta', icon: Copy, onSelect: handleCopyFasta },
                { label: 'Download PDB', hint: '.pdb', icon: Download, onSelect: handleDownloadPdb },
                { label: 'Lab sheet', hint: 'print', icon: FileText, onSelect: handleOpenProtocol }
              ].map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  type="button"
                  onClick={() => void item.onSelect()}
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
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
            Primary sequence
          </span>
          {copied && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-3">
              <Check className="h-3 w-3" aria-hidden /> copied
            </span>
          )}
        </div>
        <div className="od-scroll mt-2 flex flex-wrap gap-y-0.5 bg-sunken px-3 py-2.5 font-mono text-[13px] leading-6 tracking-[0.16em]">
          {currentPeptide.sequence.split('').map((residue, idx) => (
            <span
              key={idx}
              title={`${idx + 1} · ${AMINO_ACID_TABLE[residue]?.fullName || residue} (${AMINO_ACID_TABLE[residue]?.category ?? 'unknown'})`}
              className={`cursor-default transition-colors hover:bg-[#e0e0e0] ${residueTone(residue)}`}
            >
              {residue}
            </span>
          ))}
        </div>
      </div>

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

      <div className="p-5 pt-4">
        <button
          type="button"
          onClick={() => void validateStability(currentPeptide.sequence)}
          disabled={isLoading}
          className="flex h-10 w-full items-center justify-center gap-2 border border-line-2 text-[11px] font-medium text-ink transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          {isLoading ? 'Validating stability…' : 'Validate stability'}
        </button>
      </div>
    </section>
  );
};
