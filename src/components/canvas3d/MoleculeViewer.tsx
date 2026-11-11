'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCw, ZoomIn, Eye, Layers, Palette, RefreshCw } from 'lucide-react';
import { Display3DMode, ColorScheme, usePeptideStore } from '@/store/usePeptideStore';

interface Viewer3DProps {
  pdbContent: string;
  peptideName?: string;
}

// Declare 3Dmol on window
declare global {
  interface Window {
    $3Dmol?: {
      createViewer: (element: HTMLElement, config: Record<string, unknown>) => any;
    };
  }
}

export const MoleculeViewer: React.FC<Viewer3DProps> = ({ pdbContent, peptideName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isSpinning, setIsSpinning] = useState(true);

  const { active3dMode, setActive3dMode, colorScheme, setColorScheme } = usePeptideStore();

  // 1. Load 3Dmol.js script dynamically if not present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.$3Dmol) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://3Dmol.org/build/3Dmol-min.js';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => console.error('Failed to load 3Dmol.js script from CDN');
    document.head.appendChild(script);

    return () => {
      // Keep script cached in head
    };
  }, []);

  // 2. Render and style the 3D molecule
  const renderMolecule = useCallback(() => {
    if (!containerRef.current || !window.$3Dmol || !pdbContent) return;

    // Clear previous viewer if any
    containerRef.current.innerHTML = '';

    const config = { backgroundColor: '#090D16' };
    const viewer = window.$3Dmol.createViewer(containerRef.current, config);
    viewerRef.current = viewer;

    // Add model from PDB string
    viewer.addModel(pdbContent, 'pdb');

    // Apply color styling based on selected scheme
    applyStyle(viewer, active3dMode, colorScheme);

    viewer.zoomTo();
    viewer.render();

    if (isSpinning) {
      viewer.spin('y', 0.8);
    }
  }, [pdbContent, active3dMode, colorScheme, isSpinning]);

  useEffect(() => {
    if (isScriptLoaded) {
      renderMolecule();
    }
  }, [isScriptLoaded, renderMolecule]);

  // Handle spin toggle
  const toggleSpin = () => {
    if (!viewerRef.current) return;
    if (isSpinning) {
      viewerRef.current.spin(false);
      setIsSpinning(false);
    } else {
      viewerRef.current.spin('y', 0.8);
      setIsSpinning(true);
    }
  };

  const resetView = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomTo();
      viewerRef.current.render();
    }
  };

  return (
    <div className="relative w-full h-[420px] lg:h-[480px] bg-slate-950/80 rounded-2xl border border-cyan-500/20 overflow-hidden shadow-2xl backdrop-blur-md flex flex-col">
      {/* Top Floating Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 rounded-xl px-3 py-1.5 shadow-lg backdrop-blur-md">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">
            {peptideName || '3D Alpha-Helix'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
            WebGL
          </span>
        </div>

        {/* View Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 rounded-xl p-1 shadow-lg backdrop-blur-md">
          <button
            onClick={toggleSpin}
            title={isSpinning ? 'Pause rotation' : 'Auto rotate'}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              isSpinning ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            title="Reset Camera Center"
            className="p-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full flex-1 cursor-grab active:cursor-grabbing"
        title="Click and drag to rotate, scroll to zoom"
      />

      {!isScriptLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs font-mono text-cyan-300">Initializing WebGL Molecular Engine...</p>
        </div>
      )}

      {/* Bottom Floating Mode Switcher */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Render Style Mode */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 border border-slate-700/60 rounded-xl p-1 shadow-lg backdrop-blur-md">
          <Layers className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
          {(['cartoon', 'surface', 'stick', 'sphere'] as Display3DMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActive3dMode(mode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                active3dMode === mode
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Color Palette Scheme */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 border border-slate-700/60 rounded-xl p-1 shadow-lg backdrop-blur-md">
          <Palette className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
          {(['hydrophobicity', 'charge', 'spectrum'] as ColorScheme[]).map((scheme) => (
            <button
              key={scheme}
              onClick={() => setColorScheme(scheme)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                colorScheme === scheme
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {scheme}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Applies 3Dmol representation and color mapping
 */
function applyStyle(viewer: any, mode: Display3DMode, scheme: ColorScheme) {
  // Clear any existing styles
  viewer.setStyle({}, {});

  let colorFunc: Record<string, unknown> = { color: 'spectrum' };

  if (scheme === 'hydrophobicity') {
    // Red/Orange for Hydrophobic (high bfactor), Cyan/Blue for Hydrophilic
    colorFunc = {
      colorscheme: {
        prop: 'b',
        gradient: 'rwb',
        min: 15,
        max: 65
      }
    };
  } else if (scheme === 'charge') {
    colorFunc = {
      colorscheme: {
        prop: 'elem',
        map: { N: '#00F0FF', O: '#EF4444', C: '#64748B' }
      }
    };
  }

  switch (mode) {
    case 'cartoon':
      viewer.setStyle({}, { cartoon: { ...colorFunc, thickness: 0.5, ribbon: true } });
      break;
    case 'surface':
      viewer.setStyle({}, { cartoon: { color: '#334155' } });
      viewer.addSurface(
        viewer.SurfaceType?.VDW || 1,
        {
          opacity: 0.75,
          colorscheme: scheme === 'hydrophobicity' ? { prop: 'b', gradient: 'rwb', min: 15, max: 65 } : undefined,
          color: scheme === 'hydrophobicity' ? undefined : '#00F0FF'
        }
      );
      break;
    case 'stick':
      viewer.setStyle({}, { stick: { ...colorFunc, radius: 0.25 } });
      break;
    case 'sphere':
      viewer.setStyle({}, { sphere: { ...colorFunc, scale: 0.3 } });
      break;
    default:
      viewer.setStyle({}, { cartoon: colorFunc });
  }
}
