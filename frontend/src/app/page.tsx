'use client';

import React, { useState } from 'react';
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
import { SynthesisModal } from '@/components/export/SynthesisModal';
import { usePeptideStore } from '@/store/usePeptideStore';

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
    selectBatchCandidate,
    applyOptimizedSequence,
    compareBenchmarks
  } = usePeptideStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-ground text-ink">
      <Header />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
            In silico · WHO priority pathogens
          </p>
        </div>

        {error && (
          <div className="mb-5 border-l-2 border-warn bg-warn-soft px-3 py-2.5">
            <p className="text-[11px] leading-relaxed text-ink-2">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] lg:gap-6">
          {/* Control rail */}
          <div className="space-y-4">
            <PathogenSelector />
            <ParameterControls />
            <SequenceCard onOpenProtocol={() => setIsModalOpen(true)} />
          </div>

          {/* Workspace */}
          <div className="space-y-4">
            {currentPeptide ? (
              <MoleculeViewer
                pdbContent={currentPeptide.pdbContent}
                peptideName={currentPeptide.name}
              />
            ) : (
              <div className="flex h-[420px] w-full items-center justify-center bg-stage lg:h-[520px]">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#a8a8a8]">
                  Generate a candidate to load the structure
                </p>
              </div>
            )}

            {currentPeptide && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <BiophysicalRadar metrics={currentPeptide.metrics} />
                  <HelicalWheelChart wheel={helicalWheel} />
                </div>
                <div className="space-y-4">
                  <AminoAcidProfile profile={currentPeptide.aminoAcidProfile} />
                  <ChargePhChart curve={chargePhCurve} />
                </div>
              </div>
            )}

            {currentPeptide && proteaseReport && <ProteaseShieldPanel report={proteaseReport} />}

            {currentPeptide && batchCandidates.length > 0 && (
              <BatchCandidatesPanel
                candidates={batchCandidates}
                activeSequence={currentPeptide.sequence}
                onSelect={selectBatchCandidate}
              />
            )}

            {currentPeptide && optimizationResult && (
              <OptimizationPanel
                result={optimizationResult}
                activeSequence={currentPeptide.sequence}
                onApplyEvolved={applyOptimizedSequence}
              />
            )}

            {currentPeptide && (
              <ClinicalBenchmarkPanel
                report={benchmarkReport}
                activeSequence={currentPeptide.sequence}
                activeName={currentPeptide.name}
                isLoading={isLoading}
                onRunCompare={(seq, name) => void compareBenchmarks(seq, name)}
              />
            )}
          </div>
        </div>
      </main>

      <SynthesisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        peptide={currentPeptide}
      />

      <footer className="mt-6 border-t border-line">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-4 px-5 py-6 sm:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            SynthiaBio © 2026. All rights reserved.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
            Open source
          </p>
        </div>
      </footer>
    </div>
  );
}