'use client';

import React, { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { PathogenSelector } from '@/components/dashboard/PathogenSelector';
import { ParameterControls } from '@/components/dashboard/ParameterControls';
import { SequenceCard } from '@/components/dashboard/SequenceCard';
import { MoleculeViewer } from '@/components/canvas3d/MoleculeViewer';
import { BiophysicalRadar } from '@/components/charts/BiophysicalRadar';
import { AminoAcidProfile } from '@/components/charts/AminoAcidProfile';
import { SynthesisModal } from '@/components/export/SynthesisModal';
import { usePeptideStore } from '@/store/usePeptideStore';
import { Sparkles, Activity, Dna, AlertCircle } from 'lucide-react';

export default function Home() {
  const { currentPeptide, error } = usePeptideStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation Header */}
      <Header />

      {/* Main Interactive Studio Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Announcement */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-emerald-950/40 border border-cyan-500/20 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest">
                  AI-Powered Antimicrobial Discovery Engine
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                De Novo Peptide Synthesis & 3D Conformation Studio
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Combines Google Gemini 1.5 generative intelligence with zero-hallucination Eisenberg consensus bio-physics to engineer next-generation antimicrobial peptides against critical drug-resistant superbugs.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block font-mono">
                <span className="text-[10px] text-slate-400 block">Active AI Core</span>
                <span className="text-xs font-bold text-cyan-300">Gemini 1.5 Flash</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {error && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dual-Column Responsive Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Controls & Sequence Details (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <PathogenSelector />
            <ParameterControls />
            <SequenceCard onOpenProtocol={() => setIsModalOpen(true)} />
          </div>

          {/* RIGHT COLUMN: 3D Molecular Canvas & Biophysical Analytics (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3D WebGL Canvas Card */}
            {currentPeptide ? (
              <MoleculeViewer
                pdbContent={currentPeptide.pdbContent}
                peptideName={currentPeptide.name}
              />
            ) : (
              <div className="w-full h-[420px] rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center">
                <Dna className="w-8 h-8 text-slate-600 animate-pulse mb-2" />
                <p className="text-xs text-slate-500 font-mono">Select parameters and generate a peptide</p>
              </div>
            )}

            {/* Biophysical Charts Grid */}
            {currentPeptide && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BiophysicalRadar metrics={currentPeptide.metrics} />
                <AminoAcidProfile profile={currentPeptide.aminoAcidProfile} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Synthesis Protocol Modal */}
      <SynthesisModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        peptide={currentPeptide}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500 font-mono">
        <p>SynthiaBio • Built for the STEM2Connect AI Hackathon (Devpost) • Open Source (MIT License)</p>
      </footer>
    </div>
  );
}
