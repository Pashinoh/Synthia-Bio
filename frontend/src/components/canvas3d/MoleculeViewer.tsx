'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RotateCw, RefreshCw } from 'lucide-react';
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

const STAGE_BG = '#161616';

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

    containerRef.current.innerHTML = '';

    const viewer = window.$3Dmol.createViewer(containerRef.current, { backgroundColor: STAGE_BG });
    viewerRef.current = viewer;

    viewer.addModel(pdbContent, 'pdb');
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

  const chipClass = (active: boolean) =>
    `h-8 px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
      active ? 'bg-[#f4f4f4] text-ink' : 'text-[#c6c6c6] hover:bg-[#262626] hover:text-white'
    }`;

  return (
    <div className="relative flex h-[420px] w-full flex-col overflow-hidden bg-stage lg:h-[520px]">
      {/* Stage label */}
      <div className="pointer-events-none absolute left-4 top-3.5 z-10">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-[#8d8d8d]">
          3D conformation
        </span>
        <span className="block font-mono text-[11px] text-[#f4f4f4]">
          {peptideName || 'Alpha-helix model'}
        </span>
      </div>

      {/* 3D canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        title="Drag to rotate, scroll to zoom"
      />

      {!isScriptLoaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-stage">
          <span className="h-4 w-4 animate-spin border border-[#4589ff] border-t-transparent" aria-hidden />
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#a8a8a8]">
            Initializing WebGL
          </p>
        </div>
      )}

      {/* Single control bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-px bg-[#161616]/72 p-px backdrop-blur-md">
        <div className="flex flex-wrap items-center" role="group" aria-label="Render style">
          {(['cartoon', 'surface', 'stick', 'sphere'] as Display3DMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={active3dMode === mode}
              onClick={() => setActive3dMode(mode)}
              className={chipClass(active3dMode === mode)}
            >
              {mode}
            </button>
          ))}
        </div>

        <span className="mx-1 h-5 w-px bg-[#393939]" aria-hidden />

        <div className="flex flex-wrap items-center" role="group" aria-label="Color map">
          {(['hydrophobicity', 'charge', 'spectrum'] as ColorScheme[]).map((scheme) => (
            <button
              key={scheme}
              type="button"
              aria-pressed={colorScheme === scheme}
              onClick={() => setColorScheme(scheme)}
              className={chipClass(colorScheme === scheme)}
            >
              {scheme === 'hydrophobicity' ? 'hydro' : scheme}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={toggleSpin}
            aria-pressed={isSpinning}
            title={isSpinning ? 'Pause rotation' : 'Resume rotation'}
            className={`h-8 w-8 transition-colors ${
              isSpinning ? 'text-[#4589ff]' : 'text-[#a8a8a8] hover:bg-[#262626] hover:text-white'
            }`}
          >
            <RotateCw className="mx-auto h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={resetView}
            title="Reset camera"
            className="h-8 w-8 text-[#a8a8a8] transition-colors hover:bg-[#262626] hover:text-white"
          >
            <RefreshCw className="mx-auto h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Applies 3Dmol representation and color mapping
 */
function applyStyle(viewer: any, mode: Display3DMode, scheme: ColorScheme) {
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
        map: { N: '#4589ff', O: '#da1e28', C: '#8d8d8d' }
      }
    };
  }

  switch (mode) {
    case 'cartoon':
      viewer.setStyle({}, { cartoon: { ...colorFunc, thickness: 0.5, ribbon: true } });
      break;
    case 'surface':
      viewer.setStyle({}, { cartoon: { color: '#525252' } });
      viewer.addSurface(
        viewer.SurfaceType?.VDW || 1,
        {
          opacity: 0.75,
          colorscheme:
            scheme === 'hydrophobicity' ? { prop: 'b', gradient: 'rwb', min: 15, max: 65 } : undefined,
          color: scheme === 'hydrophobicity' ? undefined : '#4589ff'
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
