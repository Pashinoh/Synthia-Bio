'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Dna,
  Layers,
  Compass,
  Crosshair,
  Activity,
  ShieldCheck,
  BarChart3,
  FileText,
  MousePointer,
  Rotate3d,
  Printer,
  CheckCircle2,
  Sliders
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

interface StepItem {
  id: string;
  badge: string;
  title: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

const STEPS: StepItem[] = [
  {
    id: 'overview',
    badge: 'Step 01',
    title: 'De Novo AMR Studio Pipeline',
    shortDesc: 'End-to-end computational pipeline from WHO pathogen to wet-lab synthesis',
    icon: Dna,
    content: (
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          <strong className="text-ink">SynthiaBio</strong> is an autonomous <em>in-silico</em> biophysical engine engineered to design <em>de novo</em> antimicrobial peptides (AMPs) targeting critical antimicrobial resistance (AMR) superbugs on the WHO Priority Pathogens list.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
              <Sliders className="h-3.5 w-3.5" />
              <span>1. Parametric Design</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
              Select target ESKAPE pathogens, configure residue lengths (12–28 aa), lytic pore mechanisms, and hemolysis safety thresholds.
            </p>
          </div>

          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
              <Rotate3d className="h-3.5 w-3.5" />
              <span>2. 3D Studio & Simulation</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
              Inspect secondary alpha-helix folding in real-time WebGL, Eisenberg hydrophobicity gradients, and live residue HUD telemetry.
            </p>
          </div>

          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
              <Activity className="h-3.5 w-3.5" />
              <span>3. Evolution & Synthesis</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
              Execute in-silico directed evolution, verify serum protease stability, and export lab-ready SPPS synthesis specifications.
            </p>
          </div>
        </div>

        <div className="border-l-2 border-accent bg-accent-soft p-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent font-semibold">
            Biophysical Advantage: De Novo AMPs vs Small-Molecule Antibiotics
          </h4>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
            Unlike small-molecule antibiotics that target single bacterial enzymes (which rapidly develop resistance via point mutations), cationic AMPs physically disrupt the negatively charged phospholipid bilayer, drastically lowering the risk of bacterial resistance.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'params',
    badge: 'Step 02',
    title: 'Target Pathogens & Design Constraints',
    shortDesc: 'Calibrating bacterial membrane potential, helical length, and pore models',
    icon: Sliders,
    content: (
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          The left control rail configures biological targets and biophysical boundary conditions prior to generative synthesis.
        </p>

        <div className="space-y-2.5">
          <div className="border border-line bg-sunken p-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              1. Target Pathogens (WHO Priority AMR List)
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              Choose between <em>Acinetobacter baumannii</em>, <em>Pseudomonas aeruginosa</em>, <em>Klebsiella pneumoniae</em>, <em>Staphylococcus aureus (MRSA)</em>, or <em>Mycobacterium tuberculosis</em>. Each strain possesses distinct surface charge densities (-20 to -40 mV) and cell wall barriers governing binding affinity.
            </p>
          </div>

          <div className="border border-line bg-sunken p-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              2. Sequence Length & Pore Lysis Mechanism
            </span>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-ink-3">
              <li><strong className="text-ink">Length (12–28 aa):</strong> 16–22 amino acids is the canonical sweet spot for spanning a bacterial bilayer with a stable amphipathic alpha-helix.</li>
              <li><strong className="text-ink">Toroidal (Wormhole):</strong> Peptides induce lipid monolayer bending, forming water-filled transient toroidal pores.</li>
              <li><strong className="text-ink">Barrel-Stave:</strong> Helices insert perpendicular to the membrane, forming a parallel cylindrical stave pore.</li>
              <li><strong className="text-ink">Carpet:</strong> Peptides accumulate parallel to the membrane surface until reaching critical threshold for detergent-like dissolution.</li>
            </ul>
          </div>

          <div className="border border-line bg-sunken p-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              3. Hemolysis Threshold & Locked Motifs
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              Enforce a strict maximum erythrocyte hemolysis rate (&le;10% recommended). You can also lock essential sequence motifs (e.g. <code className="bg-surface px-1 py-0.5 font-mono text-accent">KWK</code> or <code className="bg-surface px-1 py-0.5 font-mono text-accent">KRKR</code>) to preserve validated binding anchors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-sunken px-3 py-2 font-mono text-[10px] text-ink-2">
          <span className="bg-accent px-1.5 py-0.5 text-white font-semibold">SYNTHESIS TIP</span>
          <span>Use <strong>Batch 3x</strong> to generate and rank three distinct structural variants simultaneously in parallel.</span>
        </div>
      </div>
    )
  },
  {
    id: 'viewer3d',
    badge: 'Step 03',
    title: '3D Molecular Studio & HUD Telemetry',
    shortDesc: 'WebGL 3D interaction, secondary structure coloring, and atomic hover HUD',
    icon: Rotate3d,
    content: (
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          The main viewport renders real-time 3D Cartesian coordinates of the folded alpha-helical peptide computed dynamically via WebGL.
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase text-ink">
              <MousePointer className="h-3.5 w-3.5 text-accent" />
              <span>Camera Controls</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-ink-3">
              <li><strong className="text-ink">[Left Click + Drag]:</strong> 360&deg; Rotation</li>
              <li><strong className="text-ink">[Right Click + Drag]:</strong> Pan / Translate</li>
              <li><strong className="text-ink">[Scroll Wheel]:</strong> Zoom In / Out</li>
            </ul>
          </div>

          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase text-ink">
              <Layers className="h-3.5 w-3.5 text-accent" />
              <span>Color Mapping</span>
            </div>
            <ul className="mt-2 space-y-1 text-[11px] text-ink-3">
              <li><strong className="text-ink">HYDRO:</strong> Eisenberg scale</li>
              <li><strong className="text-ink">CHARGE:</strong> Blue (+) &amp; Red (-)</li>
              <li><strong className="text-ink">SPECTRUM:</strong> N &rarr; C Rainbow</li>
            </ul>
          </div>

          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase text-ink">
              <Crosshair className="h-3.5 w-3.5 text-accent" />
              <span>Live HUD Inspector</span>
            </div>
            <p className="mt-2 text-[11px] text-ink-3">
              Hover over any residue to trigger the live HUD card: residue position, 3-letter code, IUPAC chemical name, partial charge, and Eisenberg hydrophobicity score.
            </p>
          </div>
        </div>

        <div className="border border-line bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              Helix Anatomy Guide (i)
            </span>
            <span className="font-mono text-[10px] text-ink-3">3.6 aa / turn · 1.5 &Aring; pitch</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
            Click the <code className="bg-sunken px-1 font-mono text-ink">(i)</code> button in the top-right corner of the 3D viewer to open the PDB-standard alpha-helix geometry sheet, detailing C=O &middot;&middot;&middot; H-N hydrogen bonding patterns and spatial amphipathicity.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'evolution',
    badge: 'Step 04',
    title: 'In-Silico Directed Evolution',
    shortDesc: 'Automated point mutation screening for enhanced stability and selectivity',
    icon: Activity,
    content: (
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          Natural antimicrobial peptides are frequently degraded by serum proteases. <strong>Directed Evolution</strong> applies computational mutation trees to engineer proteolytic resilience without loss of antibacterial potency.
        </p>

        <div className="space-y-2.5">
          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
                Launching Directed Evolution
              </span>
              <span className="bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent font-semibold">Button: Optimize</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              Click <strong className="text-ink">Optimize</strong> on the Sequence Card. The evolutionary algorithm evaluates substitution trees, targeting residues that reinforce protease shielding and optimize amphipathic moments.
            </p>
          </div>

          <div className="border border-line bg-sunken p-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              Delta Fitness &amp; Mutational Telemetry
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              The Optimization Panel presents precise substitutions (e.g. <code className="font-mono text-accent">E9Q</code> for charge neutralization, <code className="font-mono text-accent">A5L</code> for hydrophobic core stabilization), along with quantified deltas in overall fitness, stability, and selectivity index.
            </p>
          </div>

          <div className="border border-line bg-sunken p-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              Adopting Mutated Variants (Apply Evolved)
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              Click <strong className="text-ink">Apply evolved</strong> to promote the mutant variant to the active studio candidate. The 3D viewer instantly refolds the mutated sequence, and the biophysical radar maps comparative deltas against the parental lead!
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'validation',
    badge: 'Step 05',
    title: 'Stability Validation & Clinical Benchmarks',
    shortDesc: 'Enzymatic cleavage screening and comparison against clinical gold standards',
    icon: ShieldCheck,
    content: (
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          Prior to wet-lab synthesis, candidates undergo multi-parameter biophysical clearance and clinical benchmark testing:
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <span>Protease Shield Panel</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
              Click <strong className="text-ink">Stability</strong> to forecast predicted serum half-life and map cleavage sites across key human proteases:
            </p>
            <ul className="mt-2 space-y-1 text-[10px] font-mono text-ink-2">
              <li>&bull; <strong className="text-ink">Trypsin:</strong> Cleaves after basic Lys (K) &amp; Arg (R)</li>
              <li>&bull; <strong className="text-ink">Chymotrypsin:</strong> Cleaves aromatic Phe/Trp/Tyr</li>
              <li>&bull; <strong className="text-ink">Elastase:</strong> Cleaves small aliphatic Ala/Val/Gly</li>
            </ul>
          </div>

          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              <BarChart3 className="h-4 w-4 text-accent" />
              <span>Clinical Benchmark Panel</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
              Click <strong className="text-ink">Run compare</strong> to benchmark your candidate against global reference peptides:
            </p>
            <ul className="mt-2 space-y-1 text-[10px] font-mono text-ink-2">
              <li>&bull; <strong className="text-ink">Pexiganan (MSI-78):</strong> Clinical lead for diabetic foot ulcer</li>
              <li>&bull; <strong className="text-ink">Magainin-2:</strong> Amphipathic Xenopus frog skin AMP</li>
              <li>&bull; <strong className="text-ink">LL-37:</strong> Human cathelicidin immune defense</li>
              <li>&bull; <strong className="text-ink">Melittin:</strong> Toxic control lead (honeybee venom)</li>
            </ul>
          </div>
        </div>

        <div className="border-l-2 border-accent bg-accent-soft p-3">
          <h4 className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent font-semibold">
            Diagnostic Charts: Helical Wheel &amp; Charge-pH Titration
          </h4>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-2">
            Inspect the 2D polar <strong>Helical Wheel</strong> to verify clean segregation between the cationic binding face and hydrophobic insertion face, and review the <strong>Charge vs pH</strong> titration curve to confirm net positive charge at physiological pH 7.4.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'export',
    badge: 'Step 06',
    title: 'Lab-Ready Export & SPPS Protocol',
    shortDesc: 'Download FASTA/PDB/mmCIF and formal academic PDF synthesis specifications',
    icon: FileText,
    content: (
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          Once your candidate passes all <em>in-silico</em> clearance gates, the design can be transferred immediately to wet-lab synthesis or commercial peptide manufacturers.
        </p>

        <div className="space-y-2.5">
          <div className="border border-line bg-sunken p-3">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
              1. Computational Structure Export
            </span>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-ink-3">
              <li><strong className="text-ink">Copy FASTA:</strong> Copies standardized bioinformatics header and single-letter sequence for BLAST and alignment searches.</li>
              <li><strong className="text-ink">Download PDB (.pdb):</strong> Atomic Cartesian coordinate file formatted for molecular docking (AutoDock, GROMACS, PyMOL).</li>
              <li><strong className="text-ink">Download mmCIF (.cif):</strong> Modern PDBx/mmCIF macro-molecular structure format.</li>
            </ul>
          </div>

          <div className="border border-line bg-sunken p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
                2. Wet-Lab Synthesis Specification (Lab sheet)
              </span>
              <span className="bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent font-semibold">PDF Ready</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              Open <strong className="text-ink">Lab sheet</strong> to generate an industry-standard <em>Solid-Phase Peptide Synthesis (SPPS)</em> specification detailing Fmoc chemistry, N-terminal acetylation, C-terminal amidation, RP-HPLC &gt;95% purification standards, and lyophilized -20&deg;C storage protocols.
            </p>
          </div>

          <div className="border border-line bg-surface p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase text-ink">
              <Printer className="h-3.5 w-3.5 text-accent" />
              <span>Print / Save as PDF</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              The Lab sheet features a formal, academic <em>Times New Roman</em> black-and-white print stylesheet ready for direct physical printing or saving as a submission-grade PDF.
            </p>
          </div>
        </div>
      </div>
    )
  }
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, onStartTour }) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setActiveStep((curr) => Math.min(curr + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setActiveStep((curr) => Math.max(curr - 1, 0));
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentStepData = STEPS[activeStep];
  const StepIcon = currentStepData.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col border border-line bg-surface text-ink shadow-2xl transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center bg-accent text-white">
              <BookOpen className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2
                id="tutorial-modal-title"
                className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
              >
                SynthiaBio Studio Reference Guide
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                In-Silico De Novo Antimicrobial Peptide Design Workflow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onStartTour && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartTour();
                }}
                className="flex h-7 items-center gap-1.5 bg-accent px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-accent-hover"
              >
                <Compass className="h-3 w-3" />
                <span className="hidden sm:inline">Start Live Tour</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close guide"
              className="flex h-7 w-7 items-center justify-center border border-line bg-sunken text-ink-2 transition-colors hover:bg-track-hover hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Step Selector Ribbon */}
        <div className="od-scroll flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-sunken px-3 py-2 sm:px-6">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 font-mono text-[11px] transition-colors ${
                  isActive
                    ? 'border-b-2 border-accent bg-surface font-semibold text-accent shadow-xs'
                    : 'text-ink-2 hover:bg-surface/50 hover:text-ink'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-accent' : 'text-ink-3'}`} />
                <span className="hidden md:inline">{step.badge}:</span>
                <span className="truncate max-w-[130px] sm:max-w-none">{step.title.split(' ')[0]} {step.title.split(' ')[1] || ''}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="od-scroll flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                {currentStepData.badge}
              </span>
              <div className="flex items-center gap-2">
                <StepIcon className="h-4 w-4 text-accent" />
                <h3 className="text-[17px] font-semibold text-ink">
                  {currentStepData.title}
                </h3>
              </div>
            </div>
            <span className="font-mono text-[11px] text-ink-3">
              Step {activeStep + 1} of {STEPS.length}
            </span>
          </div>

          {currentStepData.content}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-line bg-sunken px-5 py-3 sm:px-6">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((curr) => Math.max(curr - 1, 0))}
            className="flex h-8 items-center gap-1.5 border border-line bg-surface px-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink transition-colors hover:bg-track-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 transition-all ${
                  idx === activeStep ? 'w-6 bg-accent' : 'w-2 bg-line hover:bg-ink-3'
                }`}
              />
            ))}
          </div>

          {activeStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveStep((curr) => Math.min(curr + 1, STEPS.length - 1))}
              className="flex h-8 items-center gap-1.5 bg-accent px-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-accent-hover"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 items-center gap-1.5 bg-accent px-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-accent-hover"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Start Exploring</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
