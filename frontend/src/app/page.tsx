'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/react/shallow';
import { Header } from '@/components/dashboard/Header';
import { PathogenSelector } from '@/components/dashboard/PathogenSelector';
import { ParameterControls } from '@/components/dashboard/ParameterControls';
import { SequenceCard } from '@/components/dashboard/SequenceCard';
import { ProteaseShieldPanel } from '@/components/dashboard/ProteaseShieldPanel';
import { BatchCandidatesPanel } from '@/components/dashboard/BatchCandidatesPanel';
import { OptimizationPanel } from '@/components/dashboard/OptimizationPanel';
import { ClinicalBenchmarkPanel } from '@/components/dashboard/ClinicalBenchmarkPanel';
import { MoleculeViewer } from '@/components/canvas3d/MoleculeViewer';
import { BiophysicalRadar } from '@/components/charts/BiophysicalRadar';
import { AminoAcidProfile } from '@/components/charts/AminoAcidProfile';
import { HelicalWheelChart } from '@/components/charts/HelicalWheelChart';
import { ChargePhChart } from '@/components/charts/ChargePhChart';
import { WorkspaceFocusTarget, usePeptideStore } from '@/store/usePeptideStore';

const SynthesisModal = dynamic(
  () => import('@/components/export/SynthesisModal').then((mod) => mod.SynthesisModal),
  { ssr: false }
);

const TutorialModal = dynamic(
  () => import('@/components/dashboard/TutorialModal').then((mod) => mod.TutorialModal),
  { ssr: false }
);

const InteractiveTour = dynamic(
  () => import('@/components/dashboard/InteractiveTour').then((mod) => mod.InteractiveTour),
  { ssr: false }
);

interface WorkspaceSectionProps {
  sectionRef: (el: HTMLDivElement | null) => void;
  isHighlighted: boolean;
  label?: string;
  children: React.ReactNode;
}

function WorkspaceSection({ sectionRef, isHighlighted, label, children }: WorkspaceSectionProps) {
  return (
    <div
      ref={sectionRef}
      className={`transition-shadow duration-300 ${isHighlighted ? 'ring-2 ring-accent' : ''}`}
    >
      {isHighlighted && (
        <div className="flex items-center justify-between gap-2 bg-accent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white">
          <span>Updated</span>
          {label && <span className="truncate normal-case tracking-normal opacity-95">{label}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export default function Home() {
  const {
    currentPeptide,
    batchCandidates,
    error,
    isLoading,
    proteaseReport,
    helicalWheel,
    chargePhCurve,
    optimizationResult,
    benchmarkReport,
    workspaceFocus,
    previousComparison,
    selectBatchCandidate,
    applyOptimizedSequence,
    compareBenchmarks
  } = usePeptideStore(
    useShallow((s) => ({
      currentPeptide: s.currentPeptide,
      batchCandidates: s.batchCandidates,
      error: s.error,
      isLoading: s.isLoading,
      proteaseReport: s.proteaseReport,
      helicalWheel: s.helicalWheel,
      chargePhCurve: s.chargePhCurve,
      optimizationResult: s.optimizationResult,
      benchmarkReport: s.benchmarkReport,
      workspaceFocus: s.workspaceFocus,
      previousComparison: s.previousComparison,
      selectBatchCandidate: s.selectBatchCandidate,
      applyOptimizedSequence: s.applyOptimizedSequence,
      compareBenchmarks: s.compareBenchmarks
    }))
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<{
    target: WorkspaceFocusTarget;
    label: string;
  } | null>(null);

  const rightPaneRef = useRef<HTMLDivElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<WorkspaceFocusTarget, HTMLDivElement | null>>>({});

  const setSectionRef = useCallback(
    (target: WorkspaceFocusTarget) => (el: HTMLDivElement | null) => {
      sectionRefs.current[target] = el;
    },
    []
  );

  useEffect(() => {
    if (!workspaceFocus) return;
    const { target, label } = workspaceFocus;
    let userScrolled = false;

    const markUserScrolled = () => {
      userScrolled = true;
    };

    const alignToTarget = (behavior: ScrollBehavior) => {
      if (userScrolled) return;
      const container = rightPaneRef.current;
      const targetEl = sectionRefs.current[target];
      if (!targetEl) return;

      if (container && container.scrollHeight > container.clientHeight + 4) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();
        const nextTop = container.scrollTop + (targetRect.top - containerRect.top) - 12;
        container.scrollTo({ top: Math.max(0, nextTop), behavior });
      } else {
        targetEl.scrollIntoView({ behavior, block: 'start' });
      }
    };

    const containerNode = rightPaneRef.current;
    containerNode?.addEventListener('wheel', markUserScrolled, { passive: true });
    containerNode?.addEventListener('pointerdown', markUserScrolled, { passive: true });

    const scrollTimer = setTimeout(() => {
      alignToTarget('smooth');
      setActiveHighlight({ target, label });
    }, 30);

    // Re-align briefly if async panels/charts expand above the focused section
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && rightContentRef.current) {
      observer = new ResizeObserver(() => {
        if (userScrolled) return;
        const container = rightPaneRef.current;
        const targetEl = sectionRefs.current[target];
        if (!container || !targetEl) return;
        const drift = targetEl.getBoundingClientRect().top - container.getBoundingClientRect().top - 12;
        if (Math.abs(drift) > 40) {
          alignToTarget('smooth');
        }
      });
      observer.observe(rightContentRef.current);
    }

    const stopObserverTimer = setTimeout(() => {
      observer?.disconnect();
    }, 1000);

    const clearTimer = setTimeout(() => {
      setActiveHighlight((curr) => (curr?.target === target ? null : curr));
    }, 4200);

    return () => {
      containerNode?.removeEventListener('wheel', markUserScrolled);
      containerNode?.removeEventListener('pointerdown', markUserScrolled);
      observer?.disconnect();
      clearTimeout(scrollTimer);
      clearTimeout(stopObserverTimer);
      clearTimeout(clearTimer);
    };
  }, [workspaceFocus]);

  const openProtocol = useCallback(() => setIsModalOpen(true), []);
  const closeProtocol = useCallback(() => setIsModalOpen(false), []);
  const openTutorial = useCallback(() => setIsTutorialOpen(true), []);
  const closeTutorial = useCallback(() => setIsTutorialOpen(false), []);
  const startTour = useCallback(() => setIsTourOpen(true), []);
  const closeTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      localStorage.setItem('synthiabio_tour_completed_v1', 'true');
    } catch {
      // ignore in restricted environments
    }
  }, []);

  // Automatic onboarding tour for first-time visitors
  useEffect(() => {
    try {
      const hasCompletedTour = localStorage.getItem('synthiabio_tour_completed_v1');
      if (!hasCompletedTour) {
        const autoTourTimer = setTimeout(() => {
          setIsTourOpen(true);
        }, 750);
        return () => clearTimeout(autoTourTimer);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleRunCompare = useCallback(
    (seq: string, name: string) => void compareBenchmarks(seq, name),
    [compareBenchmarks]
  );

  const showDiffMetrics =
    Boolean(currentPeptide) &&
    Boolean(previousComparison) &&
    previousComparison?.sequence !== currentPeptide?.sequence;

  return (
    <div className="flex min-h-screen flex-col bg-ground text-ink lg:h-dvh lg:overflow-hidden print:block print:min-h-0 print:h-auto print:overflow-visible print:bg-white print:text-black">
      <div className={`flex min-h-0 flex-1 flex-col ${isModalOpen || isTutorialOpen || isTourOpen ? 'print:hidden' : ''}`}>
        <Header onOpenTutorial={openTutorial} onStartTour={startTour} />

        <main className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col px-3 py-3 sm:px-5 lg:min-h-0 lg:overflow-hidden print:overflow-visible print:px-0 print:py-0">
          {error && (
            <div className="mb-3 shrink-0 border-l-2 border-warn bg-warn-soft px-3 py-2 print:hidden">
              <p className="text-[11px] leading-relaxed text-ink-2">{error}</p>
            </div>
          )}

          <div className="grid flex-1 grid-cols-1 items-start gap-4 lg:min-h-0 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-stretch lg:gap-4 xl:grid-cols-[360px_minmax(0,1fr)] print:block">
            {/* Left Control Rail (independently scrollable vertically, zero horizontal overflow) */}
            <div className="od-scroll min-w-0 space-y-3 lg:h-full lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1 print:mb-4 print:h-auto print:overflow-visible">
              <PathogenSelector />
              <ParameterControls />
              <SequenceCard onOpenProtocol={openProtocol} />
            </div>

            {/* Right Workspace (independently scrollable inside 100vh on desktop) */}
            <div
              ref={rightPaneRef}
              className="od-scroll min-w-0 lg:h-full lg:overflow-x-hidden lg:overflow-y-auto lg:pr-1 print:h-auto print:overflow-visible"
            >
              <div ref={rightContentRef} className="space-y-4">
              <div data-tour="3d-stage">
                <WorkspaceSection
                  sectionRef={setSectionRef('stage')}
                  isHighlighted={activeHighlight?.target === 'stage'}
                  label={activeHighlight?.label}
                >
                  {currentPeptide ? (
                    <MoleculeViewer
                      pdbContent={currentPeptide.pdbContent}
                      peptideName={currentPeptide.name}
                    />
                  ) : (
                    <div className="flex h-[340px] w-full items-center justify-center border border-line bg-stage sm:h-[380px] lg:h-[400px] xl:h-[460px]">
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#a8a8a8]">
                        Generate a candidate to load the structure
                      </p>
                    </div>
                  )}
                </WorkspaceSection>
              </div>

              {currentPeptide && (
                <div data-tour="biophysical-charts" className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div
                      className={`transition-shadow duration-300 ${
                        activeHighlight?.target === 'stage' ? 'ring-2 ring-accent' : ''
                      }`}
                    >
                      <BiophysicalRadar
                        metrics={currentPeptide.metrics}
                        previousMetrics={showDiffMetrics ? previousComparison?.metrics : null}
                        previousName={showDiffMetrics ? previousComparison?.name : null}
                      />
                    </div>
                    <HelicalWheelChart wheel={helicalWheel} />
                  </div>
                  <div className="space-y-4">
                    <AminoAcidProfile profile={currentPeptide.aminoAcidProfile} />
                    <ChargePhChart curve={chargePhCurve} />
                  </div>
                </div>
              )}

              {currentPeptide && batchCandidates.length > 0 && (
                <WorkspaceSection
                  sectionRef={setSectionRef('batch')}
                  isHighlighted={activeHighlight?.target === 'batch'}
                  label={activeHighlight?.label}
                >
                  <BatchCandidatesPanel
                    candidates={batchCandidates}
                    activeSequence={currentPeptide.sequence}
                    onSelect={selectBatchCandidate}
                  />
                </WorkspaceSection>
              )}

              {currentPeptide && optimizationResult && (
                <div data-tour="optimization-section">
                  <WorkspaceSection
                    sectionRef={setSectionRef('optimize')}
                    isHighlighted={activeHighlight?.target === 'optimize'}
                    label={activeHighlight?.label}
                  >
                    <OptimizationPanel
                      result={optimizationResult}
                      activeSequence={currentPeptide.sequence}
                      onApplyEvolved={applyOptimizedSequence}
                    />
                  </WorkspaceSection>
                </div>
              )}

              {currentPeptide && proteaseReport && (
                <WorkspaceSection
                  sectionRef={setSectionRef('protease')}
                  isHighlighted={activeHighlight?.target === 'protease'}
                  label={activeHighlight?.label}
                >
                  <ProteaseShieldPanel report={proteaseReport} />
                </WorkspaceSection>
              )}

              {currentPeptide && (
                <div data-tour="benchmarks-section">
                  <WorkspaceSection
                    sectionRef={setSectionRef('benchmarks')}
                    isHighlighted={activeHighlight?.target === 'benchmarks'}
                    label={activeHighlight?.label}
                  >
                    <ClinicalBenchmarkPanel
                      report={benchmarkReport}
                      activeSequence={currentPeptide.sequence}
                      activeName={currentPeptide.name}
                      isLoading={isLoading}
                      onRunCompare={handleRunCompare}
                    />
                  </WorkspaceSection>
                </div>
              )}

              <footer className="border-t border-line pt-4 pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  <span>SynthiaBio © 2026</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={openTutorial}
                      className="text-ink underline decoration-line-2 underline-offset-4 transition-colors hover:decoration-ink"
                    >
                      Reference Guide
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={startTour}
                      className="text-accent underline decoration-line-2 underline-offset-4 transition-colors hover:decoration-accent"
                    >
                      Live Interactive Tour
                    </button>
                    <span>•</span>
                    <span>In silico · WHO priority pathogens</span>
                  </div>
                </div>
              </footer>
              </div>
            </div>
          </div>
        </main>
      </div>

      {isModalOpen && (
        <SynthesisModal
          isOpen={isModalOpen}
          onClose={closeProtocol}
          peptide={currentPeptide}
        />
      )}

      {isTutorialOpen && (
        <TutorialModal
          isOpen={isTutorialOpen}
          onClose={closeTutorial}
          onStartTour={startTour}
        />
      )}

      {isTourOpen && (
        <InteractiveTour
          isOpen={isTourOpen}
          onClose={closeTour}
          onOpenGuide={openTutorial}
        />
      )}
    </div>
  );
}
