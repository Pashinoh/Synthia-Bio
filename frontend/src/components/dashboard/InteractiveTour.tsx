'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  BookOpen,
  Info,
  Sliders,
  Target,
  Zap,
  Activity,
  Dna,
  Layers,
  FileText,
  Rotate3d
} from 'lucide-react';

export interface TourStepSpec {
  label: string;
  value: string;
}

export interface TourStep {
  targetSelector: string;
  stepNumber: string;
  category: string;
  title: string;
  description: string;
  specs: TourStepSpec[];
  tipTitle: string;
  tipText: string;
  icon: React.ComponentType<{ className?: string }>;
  preferredPlacement?: 'right' | 'left' | 'bottom' | 'top';
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="pathogen-selector"]',
    stepNumber: '01 / 08',
    category: 'Target Profile',
    title: 'WHO Priority Pathogen Selection',
    description:
      'Select a target bacterial strain from the WHO critical pathogen catalog. Each profile loads calibrated outer membrane potential, lipopolysaccharide structure, and target peptide lengths.',
    specs: [
      { label: 'Priority strains', value: 'A. baumannii, P. aeruginosa, K. pneumoniae, MRSA' },
      { label: 'Membrane potential', value: '-20 to -40 mV outer surface charge' },
      { label: 'Length window', value: '12 to 28 residues (optimum 16 to 22)' }
    ],
    tipTitle: 'Membrane Electrostatics',
    tipText:
      'Gram-negative lipid A phosphorylation provides the negative surface potential required for initial cationic peptide association.',
    icon: Target,
    preferredPlacement: 'right'
  },
  {
    targetSelector: '[data-tour="parameter-controls"]',
    stepNumber: '02 / 08',
    category: 'Biophysical Constraints',
    title: 'Disruption Mechanism & Safety Thresholds',
    description:
      'Set primary peptide parameters including sequence length, membrane disruption pore model, safety threshold for red blood cell hemolysis, and optional scaffold motif locks.',
    specs: [
      { label: 'Pore models', value: 'Toroidal (wormhole), Barrel-stave, Carpet' },
      { label: 'Hemolysis ceiling', value: 'Low hemolysis (<=10%) or Balanced' },
      { label: 'Scaffold lock', value: '2 to 12 aa motif constraint (e.g., KWK)' }
    ],
    tipTitle: 'Pore Mechanics',
    tipText:
      'Toroidal pores induce lipid monolayer curvature, while barrel-stave bundles insert perpendicularly into the hydrophobic core.',
    icon: Sliders,
    preferredPlacement: 'right'
  },
  {
    targetSelector: '[data-tour="generation-actions"]',
    stepNumber: '03 / 08',
    category: 'Synthesis Engine',
    title: 'De Novo Candidate Generation & Batch Screening',
    description:
      'Generate candidate peptides using the in-silico synthesis engine. Choose between single-lead generation or 3x batch screening to evaluate structural divergence in parallel.',
    specs: [
      { label: 'Optimization', value: 'Simulated annealing with Boltzmann acceptance' },
      { label: 'Screening mode', value: 'Single lead candidate or 3x batch evaluation' },
      { label: 'Fallback', value: 'Deterministic Eisenberg heuristic if API key is absent' }
    ],
    tipTitle: 'Dual-Track Pipeline',
    tipText:
      'Batch screening evaluates three distinct candidate trajectories simultaneously, ranking variants by predicted therapeutic index.',
    icon: Zap,
    preferredPlacement: 'right'
  },
  {
    targetSelector: '[data-tour="sequence-card"]',
    stepNumber: '04 / 08',
    category: 'Candidate Telemetry',
    title: 'Sequence Verification & In-Silico Gates',
    description:
      'Review color-coded chemical classes across the peptide chain and check automated in-silico pass/review/fail criteria before downstream wet-lab validation.',
    specs: [
      { label: 'Blue residues', value: 'Basic cationic (Lys, Arg, His)' },
      { label: 'Dark residues', value: 'Hydrophobic core (Leu, Phe, Trp, Ile, Val)' },
      { label: 'Red residues', value: 'Acidic anionic (Asp, Glu)' }
    ],
    tipTitle: 'Clearance Criteria',
    tipText:
      'In-silico gates confirm net charge > +3e, mean hydrophobicity > 0.35, and predicted hemolysis below the safety threshold.',
    icon: Activity,
    preferredPlacement: 'right'
  },
  {
    targetSelector: '[data-tour="3d-stage"]',
    stepNumber: '05 / 08',
    category: 'Structural Inspection',
    title: '3D Alpha-Helix Molecular Studio',
    description:
      'Inspect the folded Cartesian coordinates rendered in real time. Hover over individual atoms for chemical telemetry, toggle color schemes, and view secondary structure geometry.',
    specs: [
      { label: 'Camera controls', value: 'Left-click drag rotate, right-click pan, scroll zoom' },
      { label: 'Color mapping', value: 'HYDRO (Eisenberg), CHARGE (dipole), SPECTRUM (N to C)' },
      { label: 'Anatomy guide', value: 'Click (i) for alpha-helix pitch and hydrogen bonding data' }
    ],
    tipTitle: 'Spatial Amphipathicity',
    tipText:
      'Canonical alpha-helices feature 3.6 residues per turn with a 1.52 Angstrom translation per residue along the central helical axis.',
    icon: Rotate3d,
    preferredPlacement: 'bottom'
  },
  {
    targetSelector: '[data-tour="biophysical-charts"]',
    stepNumber: '06 / 08',
    category: 'Diagnostics',
    title: 'Biophysical Profiling & Helical Wheel',
    description:
      'Analyze the 5-axis radar chart, 2D polar projection of helical face segregation, amino acid frequency histogram, and charge titration across pH 2 through 12.',
    specs: [
      { label: 'Radar axes', value: 'Charge, Hydrophobicity, Amphipathicity, Boman, Selectivity' },
      { label: 'Helical wheel', value: 'Polar vs non-polar face arc separation in 2D' },
      { label: 'Isoelectric point', value: 'Net charge titration from pH 2 to 12' }
    ],
    tipTitle: 'Face Segregation',
    tipText:
      'A pronounced amphipathic hydrophobic moment confirms that cationic charges and non-polar side chains segregate onto opposite helical faces.',
    icon: Dna,
    preferredPlacement: 'left'
  },
  {
    targetSelector: '[data-tour="optimization-section"]',
    stepNumber: '07 / 08',
    category: 'Directed Evolution',
    title: 'Proteolytic Stabilization & Mutational Scans',
    description:
      'Run in-silico directed evolution to identify point mutations that eliminate protease cleavage targets (trypsin, chymotrypsin, elastase) while maintaining antimicrobial potency.',
    specs: [
      { label: 'Cleavage enzymes', value: 'Trypsin (K/R), Chymotrypsin (F/W/Y/L), Elastase (A/V/G)' },
      { label: 'Mutation engine', value: 'Point substitutions (e.g., E9Q, A5L) with delta fitness' },
      { label: 'Application', value: 'One-click candidate replacement via Apply Evolved' }
    ],
    tipTitle: 'Serum Half-Life',
    tipText:
      'Eliminating vulnerable dibasic cleavage motifs significantly extends peptide half-life in human serum without sacrificing minimum inhibitory concentration.',
    icon: Layers,
    preferredPlacement: 'left'
  },
  {
    targetSelector: '[data-tour="export-spps"]',
    stepNumber: '08 / 08',
    category: 'Wet-Lab Transfer',
    title: 'Synthesis Protocols & Lab Sheet Export',
    description:
      'Export structure files in FASTA, PDB, or mmCIF formats, or open the formal synthesis specification for Solid-Phase Peptide Synthesis (SPPS) with monochrome print styling.',
    specs: [
      { label: 'File formats', value: 'FASTA (.fasta), PDB (.pdb), mmCIF (.cif)' },
      { label: 'Synthesis method', value: 'Microwave-assisted Fmoc/tBu SPPS protocol' },
      { label: 'Modifications', value: 'N-terminal acetylation (N-Ac), C-terminal amidation (C-NH2)' }
    ],
    tipTitle: 'Lab Specifications',
    tipText:
      'Terminal capping protects against aminopeptidase and carboxypeptidase degradation, while RP-HPLC purity >95% is verified via MALDI-TOF mass spectrometry.',
    icon: FileText,
    preferredPlacement: 'right'
  }
];

export const TOUR_STORAGE_KEY = 'synthiabio_tour_completed_v1';

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGuide?: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  isOpen,
  onClose,
  onOpenGuide
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const StepIcon = step.icon;

  const updateTargetPosition = useCallback(() => {
    if (!isOpen) return;
    const currentStepConfig = TOUR_STEPS[currentStep];
    if (!currentStepConfig) return;

    let el = document.querySelector(currentStepConfig.targetSelector) as HTMLElement | null;
    if (!el && currentStepConfig.targetSelector === '[data-tour="optimization-section"]') {
      el = document.querySelector('[data-tour="sequence-card"]') as HTMLElement | null;
    }
    if (!el && currentStepConfig.targetSelector === '[data-tour="export-spps"]') {
      el = document.querySelector('[data-tour="sequence-card"]') as HTMLElement | null;
    }

    if (!el) {
      setTargetRect(null);
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right
    });
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    const frameId = requestAnimationFrame(() => {
      updateTargetPosition();
    });

    const handleResizeOrScroll = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

    const scrollTimer = setTimeout(updateTargetPosition, 120);
    const retryTimer = setTimeout(updateTargetPosition, 350);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll);
      clearTimeout(scrollTimer);
      clearTimeout(retryTimer);
    };
  }, [isOpen, currentStep, updateTargetPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentStep((curr) => Math.min(curr + 1, TOUR_STEPS.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep((curr) => Math.max(curr - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((curr) => curr + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setCurrentStep((curr) => Math.max(curr - 1, 0));
  };

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  let popoverStyle: React.CSSProperties = {};

  if (isDesktop && targetRect) {
    const pad = 16;
    const popoverWidth = 420;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = targetRect.right + pad;
    let top = targetRect.top;

    if (step.preferredPlacement === 'left' || left + popoverWidth > viewportWidth - 20) {
      if (targetRect.left - popoverWidth - pad > 20) {
        left = targetRect.left - popoverWidth - pad;
      } else {
        left = Math.max(20, Math.min(viewportWidth - popoverWidth - 20, targetRect.left));
        top = targetRect.bottom + pad;
      }
    } else if (step.preferredPlacement === 'bottom') {
      left = Math.max(20, Math.min(viewportWidth - popoverWidth - 20, targetRect.left));
      top = targetRect.bottom + pad;
    }

    top = Math.max(20, Math.min(viewportHeight - 480, top));

    popoverStyle = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 60
    };
  } else {
    popoverStyle = {
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      right: '16px',
      maxWidth: '560px',
      margin: '0 auto',
      maxHeight: '85vh',
      zIndex: 60
    };
  }

  const progressPercent = Math.round(((currentStep + 1) / TOUR_STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Background scrim */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Target element highlight frame: clean CAD/workbench borders without endless glow */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.max(0, targetRect.top - 4)}px`,
            left: `${Math.max(0, targetRect.left - 4)}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
            pointerEvents: 'none',
            zIndex: 55
          }}
          className="border-2 border-accent transition-all duration-200"
        >
          {/* Subtle corner crosshairs */}
          <span className="absolute -top-1 -left-1 h-2 w-2 border-t-2 border-l-2 border-white" aria-hidden="true" />
          <span className="absolute -top-1 -right-1 h-2 w-2 border-t-2 border-r-2 border-white" aria-hidden="true" />
          <span className="absolute -bottom-1 -left-1 h-2 w-2 border-b-2 border-l-2 border-white" aria-hidden="true" />
          <span className="absolute -bottom-1 -right-1 h-2 w-2 border-b-2 border-r-2 border-white" aria-hidden="true" />
        </div>
      )}

      {/* Popover Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        role="dialog"
        aria-label="Interactive Tour Walkthrough"
        className="flex flex-col border border-line bg-surface p-5 text-ink shadow-xl transition-all duration-150 od-scroll overflow-y-auto"
      >
        {/* Top ribbon: step indicator, category, and close */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 items-center gap-1.5 bg-accent px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
              <StepIcon className="h-3 w-3" aria-hidden="true" />
              <span>Step {step.stepNumber}</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
              {step.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-ink-3 tabular-nums">
              {progressPercent}%
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Exit interactive tour"
              title="Exit tour (Esc)"
              className="flex h-7 w-7 items-center justify-center border border-line bg-sunken text-ink-2 transition-colors hover:bg-track-hover hover:text-ink active:bg-track"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1 w-full bg-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full bg-accent transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step jump pills */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 od-scroll">
          {TOUR_STEPS.map((s, idx) => {
            const isCurrent = idx === currentStep;
            return (
              <button
                key={s.stepNumber}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Jump to step ${idx + 1}: ${s.title}`}
                className={`flex shrink-0 items-center px-2 py-1 font-mono text-[9px] uppercase tracking-[0.06em] transition-colors ${
                  isCurrent
                    ? 'border-b-2 border-accent bg-sunken font-bold text-accent'
                    : 'text-ink-3 hover:bg-sunken hover:text-ink'
                }`}
              >
                <span>{s.stepNumber.split(' / ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Card Body */}
        <div className="space-y-3.5 py-3">
          <div>
            <h3 className="text-[16px] font-semibold text-ink leading-snug">
              {step.title}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
              {step.description}
            </p>
          </div>

          {/* Structured telemetry / specs */}
          <div className="border border-line bg-sunken p-2.5 space-y-1.5">
            <span className="block font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-3">
              Target Parameters &amp; Indicators
            </span>
            <div className="space-y-1">
              {step.specs.map((item) => (
                <div key={item.label} className="flex items-baseline justify-between gap-3 text-[11px]">
                  <span className="font-mono text-ink-3 text-[10px] uppercase tracking-[0.04em] shrink-0">
                    {item.label}
                  </span>
                  <span className="font-medium text-ink text-right truncate">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Biophysical insight box */}
          <div className="border-l-2 border-accent bg-accent-soft p-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
              <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{step.tipTitle}</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
              {step.tipText}
            </p>
          </div>
        </div>

        {/* Card Footer Controls */}
        <div className="flex items-center justify-between border-t border-line pt-3 mt-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={handlePrev}
              aria-label="Previous step"
              className="flex h-8 items-center gap-1 border border-line bg-sunken px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-track-hover active:bg-track disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back</span>
            </button>

            {onOpenGuide && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenGuide();
                }}
                title="Open comprehensive reference guide"
                className="hidden sm:flex h-8 items-center gap-1 border border-line bg-sunken px-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-2 transition-colors hover:bg-track-hover hover:text-ink active:bg-track"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Docs</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden lg:inline font-mono text-[9px] text-ink-3">
              Press [Left] [Right] or [Esc]
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="flex h-8 items-center gap-1.5 bg-accent-btn px-3.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-white transition-colors hover:bg-accent-hover active:bg-accent-hover"
            >
              {currentStep < TOUR_STEPS.length - 1 ? (
                <>
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Finish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
