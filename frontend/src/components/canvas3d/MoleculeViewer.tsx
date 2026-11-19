'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCw, RefreshCw, ZoomIn, ZoomOut, Sun, Moon, Info, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Display3DMode, ColorScheme, ThemeMode, usePeptideStore } from '@/store/usePeptideStore';
import { AMINO_ACID_TABLE, AminoAcidData } from '@/lib/bio-engine/eisenberg-scale';

interface Viewer3DProps {
  pdbContent: string;
  peptideName?: string;
}

type StageBackground = 'paper' | 'dark';

const STAGE_BG_HEX: Record<StageBackground, string> = {
  // Soft warm archival paper tint — easy on the eyes without harsh white glare
  paper: '#ede9df',
  dark: '#0d0d0f'
};

interface Mol3DAtom {
  resn?: string;
  resi?: number;
  atom?: string;
  elem?: string;
  chain?: string;
}

interface HoveredResidueInfo {
  resi: number;
  resn: string;
  oneLetter: string;
  fullName: string;
  atomCode: string;
  atomLabel: string;
  categoryLabel: string;
  hydrophobicity?: number;
  charge?: number;
}

const THREE_LETTER_TO_AA: Record<string, AminoAcidData> = Object.fromEntries(
  Object.values(AMINO_ACID_TABLE).map((entry) => [entry.threeLetter, entry])
);

const ATOM_ROLE_LABELS: Record<string, string> = {
  N: 'Backbone amide N',
  CA: 'Alpha carbon (Cα)',
  C: 'Carbonyl C',
  O: 'Carbonyl O',
  CB: 'Beta carbon sidechain (Cβ)'
};

const CATEGORY_LABELS: Record<AminoAcidData['category'], string> = {
  positive: 'Cationic (+)',
  negative: 'Anionic (-)',
  hydrophobic: 'Hydrophobic',
  hydrophilic: 'Hydrophilic',
  neutral: 'Neutral'
};

const MODE_DESCRIPTIONS: Record<Display3DMode, string> = {
  cartoon: 'Smooth ribbon tracing the α-helix N -> Cα -> C backbone (secondary fold).',
  surface: 'Solvent-accessible Van der Waals envelope surrounding the internal helix skeleton.',
  stick: 'Covalent bond sticks connecting backbone N, Cα, C, O atoms and Cβ sidechain anchors.',
  sphere: 'Space-filling Van der Waals spheres showing steric atom volumes and helical packing.'
};

function parsePdbSummary(pdb: string): { residueCount: number; atomCount: number } {
  let atomCount = 0;
  const residueIds = new Set<string>();
  const lines = pdb.split('\n');
  for (const line of lines) {
    if (line.startsWith('ATOM  ') || line.startsWith('HETATM')) {
      atomCount += 1;
      const chain = line.slice(21, 22).trim() || 'A';
      const resSeq = line.slice(22, 26).trim();
      if (resSeq) residueIds.add(`${chain}:${resSeq}`);
    }
  }
  return { residueCount: residueIds.size, atomCount };
}

function describeHoveredAtom(atom: Mol3DAtom): HoveredResidueInfo | null {
  if (!atom.resn && atom.resi === undefined) return null;
  const resn = (atom.resn || 'UNK').trim().toUpperCase();
  const aa = THREE_LETTER_TO_AA[resn];
  const atomCode = (atom.atom || atom.elem || '?').trim().toUpperCase();
  return {
    resi: atom.resi ?? 0,
    resn,
    oneLetter: aa?.oneLetter ?? '?',
    fullName: aa?.fullName ?? resn,
    atomCode,
    atomLabel: ATOM_ROLE_LABELS[atomCode] ?? `Atom ${atomCode}`,
    categoryLabel: aa ? CATEGORY_LABELS[aa.category] : 'Residue',
    hydrophobicity: aa?.eisenbergHydrophobicity,
    charge: aa?.chargeAtPh74
  };
}

interface Mol3DViewer {
  addModel: (data: string, format: string) => void;
  setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void;
  setHoverable?: (
    sel: Record<string, unknown>,
    hoverable: boolean,
    hoverCb: (atom: Mol3DAtom) => void,
    unhoverCb: (atom: Mol3DAtom) => void
  ) => void;
  addSurface: (type: number, spec: Record<string, unknown>) => void;
  removeAllSurfaces?: () => void;
  setBackgroundColor?: (hex: string, alpha?: number) => void;
  zoom: (factor: number, animationDuration?: number) => void;
  zoomTo: () => void;
  render: () => void;
  spin: (axis: string | boolean, speed?: number) => void;
  clear?: () => void;
  SurfaceType?: { VDW?: number };
}

interface Mol3DGlobal {
  createViewer: (element: HTMLElement, config: Record<string, unknown>) => Mol3DViewer;
}

declare global {
  interface Window {
    $3Dmol?: Mol3DGlobal;
  }
}

const MOL3D_SCRIPT_SOURCES = [
  '/vendor/3Dmol-min.js',
  'https://3Dmol.org/build/3Dmol-min.js'
] as const;

let mol3dLoadPromise: Promise<void> | null = null;

function loadExternalScript(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (window.$3Dmol) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset['3dmolSrc'] = src;
    script.onload = () => {
      if (window.$3Dmol) {
        resolve();
      } else {
        script.remove();
        reject(new Error(`Loaded ${src} without $3Dmol global`));
      }
    };
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

function ensure3DmolLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.$3Dmol) return Promise.resolve();
  if (mol3dLoadPromise) return mol3dLoadPromise;

  mol3dLoadPromise = (async () => {
    let lastError: Error | null = null;
    for (const src of MOL3D_SCRIPT_SOURCES) {
      try {
        await loadExternalScript(src);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    mol3dLoadPromise = null;
    throw lastError ?? new Error('Unable to load 3Dmol.js WebGL engine');
  })();

  return mol3dLoadPromise;
}

export const MoleculeViewer: React.FC<Viewer3DProps> = React.memo(({ pdbContent, peptideName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Mol3DViewer | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  // Default paused so WebGL doesn't burn 60fps GPU cycles when idle
  const [isSpinning, setIsSpinning] = useState(false);
  const [manualBg, setManualBg] = useState<{ forTheme: ThemeMode; bg: StageBackground } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [hoverRecord, setHoverRecord] = useState<{
    pdb: string;
    info: HoveredResidueInfo;
  } | null>(null);

  const pdbSummary = useMemo(() => parsePdbSummary(pdbContent), [pdbContent]);
  const hoveredInfo = hoverRecord?.pdb === pdbContent ? hoverRecord.info : null;

  const { active3dMode, setActive3dMode, colorScheme, setColorScheme, theme } = usePeptideStore(
    useShallow((s) => ({
      active3dMode: s.active3dMode,
      setActive3dMode: s.setActive3dMode,
      colorScheme: s.colorScheme,
      setColorScheme: s.setColorScheme,
      theme: s.theme
    }))
  );

  // When theme === 'system', follow the OS color-scheme reactively so the 3D
  // preview background matches light/dark system preference.
  //
  // NOTE: initialize to `false` (light/paper) to match the server-rendered HTML
  // and avoid a React hydration mismatch. The real value is resolved in
  // useEffect after hydration; a one-frame light->dark flash is acceptable and
  // unavoidable without an SSR snapshot of the OS color-scheme.
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemDark(mq.matches);
    // Resolve immediately after mount so the 3D stage follows the OS theme.
    setSystemDark(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const themeDefaultBg: StageBackground =
    theme === 'system' ? (systemDark ? 'dark' : 'paper') : theme === 'dark' ? 'dark' : 'paper';
  const effectiveBg: StageBackground =
    manualBg && manualBg.forTheme === theme ? manualBg.bg : themeDefaultBg;
  const effectiveHex = STAGE_BG_HEX[effectiveBg];
  const isPaper = effectiveBg === 'paper';

  // Keep latest visual settings synced cleanly inside effect for model reloads
  const latestConfigRef = useRef({ active3dMode, colorScheme, isSpinning, effectiveHex });
  useEffect(() => {
    latestConfigRef.current = { active3dMode, colorScheme, isSpinning, effectiveHex };
  }, [active3dMode, colorScheme, isSpinning, effectiveHex]);

  // 1. Load 3Dmol.js script asynchronously (self-hosted local bundle first, CDN fallback)
  useEffect(() => {
    let cancelled = false;
    void ensure3DmolLoaded()
      .then(() => {
        if (!cancelled) {
          setLoadError(null);
          setIsScriptLoaded(true);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setLoadError('Failed to initialize the 3Dmol.js WebGL viewer.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadNonce]);

  // 2. Build WebGL viewer & attach normalized capture-phase mouse wheel zoom ONLY on pdbContent change
  useEffect(() => {
    const container = containerRef.current;
    if (!isScriptLoaded || !container || !window.$3Dmol || !pdbContent) return;

    container.innerHTML = '';
    const {
      active3dMode: mode,
      colorScheme: scheme,
      isSpinning: spin,
      effectiveHex: bgHex
    } = latestConfigRef.current;

    let viewer: Mol3DViewer;
    try {
      viewer = window.$3Dmol.createViewer(container, {
        backgroundColor: bgHex,
        hoverDuration: 60
      });
    } catch (err) {
      console.error(err);
      queueMicrotask(() => {
        setLoadError('WebGL context could not be initialized in this browser.');
      });
      return;
    }
    viewerRef.current = viewer;

    viewer.addModel(pdbContent, 'pdb');
    applyStyle(viewer, mode, scheme);
    viewer.setHoverable?.(
      {},
      true,
      (atom) => {
        const info = describeHoveredAtom(atom);
        if (info) setHoverRecord({ pdb: pdbContent, info });
      },
      () => {
        setHoverRecord(null);
      }
    );
    viewer.zoomTo();
    viewer.render();

    if (spin) {
      viewer.spin('y', 0.6);
    }

    // Normalize wheel zoom to standard 3D/map convention: scroll UP zooms IN, scroll DOWN zooms OUT
    const handleWheelCapture = (ev: WheelEvent) => {
      if (Math.abs(ev.deltaY) < 0.01) return;
      ev.preventDefault();
      ev.stopPropagation();
      const step = Math.min(0.25, Math.max(0.08, Math.abs(ev.deltaY) / 850));
      const factor = ev.deltaY < 0 ? 1 + step : 1 / (1 + step);
      viewer.zoom(factor);
    };

    container.addEventListener('wheel', handleWheelCapture, { capture: true, passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheelCapture, { capture: true });
      viewer.spin(false);
      viewer.clear?.();
      viewerRef.current = null;
      container.innerHTML = '';
    };
  }, [isScriptLoaded, pdbContent]);

  // 3. Apply representation / color / background updates IN-PLACE without rebuilding WebGL
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.setBackgroundColor?.(effectiveHex, 1);
    viewer.removeAllSurfaces?.();
    applyStyle(viewer, active3dMode, colorScheme);
    viewer.render();
  }, [active3dMode, colorScheme, effectiveHex]);

  useEffect(() => {
    if (!infoOpen) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setInfoOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [infoOpen]);

  const toggleSpin = () => {
    const next = !isSpinning;
    setIsSpinning(next);
    if (viewerRef.current) {
      if (next) {
        viewerRef.current.spin('y', 0.6);
      } else {
        viewerRef.current.spin(false);
      }
    }
  };

  const handleZoom = (factor: number) => {
    viewerRef.current?.zoom(factor);
  };

  const resetView = () => {
    if (viewerRef.current) {
      viewerRef.current.zoomTo();
      viewerRef.current.render();
    }
  };

  const toggleStageBackground = () => {
    const nextBg: StageBackground = effectiveBg === 'paper' ? 'dark' : 'paper';
    setManualBg(nextBg === themeDefaultBg ? null : { forTheme: theme, bg: nextBg });
  };

  const chipClass = (active: boolean) =>
    isPaper
      ? `h-8 px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
          active
            ? 'bg-[#161616] text-[#f4f4f4]'
            : 'text-[#525252] hover:bg-[#e2ddd2] hover:text-[#161616]'
        }`
      : `h-8 px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
          active
            ? 'bg-[#f4f4f4] text-[#161616]'
            : 'text-[#c6c6c6] hover:bg-[#262626] hover:text-white'
        }`;

  const iconBtnClass = isPaper
    ? 'h-8 w-8 text-[#525252] transition-colors hover:bg-[#e2ddd2] hover:text-[#161616]'
    : 'h-8 w-8 text-[#a8a8a8] transition-colors hover:bg-[#262626] hover:text-white';

  return (
    <div
      className="relative flex h-[340px] w-full flex-col overflow-hidden border border-line transition-colors sm:h-[380px] lg:h-[400px] xl:h-[460px]"
      style={{ backgroundColor: effectiveHex }}
      onMouseLeave={() => setHoverRecord(null)}
    >
      {/* Top HUD: structural title + live hover inspector (left) & dynamic color legend + info button (right) */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 max-w-[65%]">
          <span
            className={`block font-mono text-[10px] uppercase tracking-[0.14em] ${
              isPaper ? 'text-[#525252]' : 'text-[#8d8d8d]'
            }`}
          >
            3D conformation · {pdbSummary.residueCount} aa · {pdbSummary.atomCount} atoms
          </span>
          <span
            className={`block truncate font-mono text-[11px] font-medium ${
              isPaper ? 'text-[#161616]' : 'text-[#f4f4f4]'
            }`}
          >
            {peptideName || 'Alpha-helix model'}
          </span>

          {hoveredInfo ? (
            <div
              className={`mt-1.5 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 border px-2 py-1 font-mono text-[10px] ${
                isPaper
                  ? 'border-[#161616]/25 bg-[#f7f4ec]/95 text-[#161616]'
                  : 'border-[#f4f4f4]/25 bg-[#161616]/90 text-[#f4f4f4]'
              }`}
            >
              <span className="font-semibold">
                Res #{hoveredInfo.resi} · {hoveredInfo.resn} ({hoveredInfo.oneLetter})
              </span>
              <span className={isPaper ? 'text-[#525252]' : 'text-[#c6c6c6]'}>
                {hoveredInfo.atomLabel}
              </span>
              <span className="text-accent">{hoveredInfo.categoryLabel}</span>
              {typeof hoveredInfo.hydrophobicity === 'number' && (
                <span className={isPaper ? 'text-[#525252]' : 'text-[#a8a8a8]'}>
                  H {hoveredInfo.hydrophobicity > 0 ? `+${hoveredInfo.hydrophobicity}` : hoveredInfo.hydrophobicity}
                </span>
              )}
            </div>
          ) : (
            <span
              className={`mt-1 hidden font-mono text-[9.5px] sm:block ${
                isPaper ? 'text-[#736f66]' : 'text-[#8d8d8d]'
              }`}
            >
              Hover structure to inspect residue &amp; atom · Drag rotate · Scroll zoom
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            {/* Dynamic 1-line color legend matching active mode & colorScheme */}
            <div
              className={`hidden items-center gap-2 border px-2 py-1 font-mono text-[9.5px] sm:flex ${
                isPaper
                  ? 'border-[#d5d0c5] bg-[#f7f4ec]/90 text-[#161616]'
                  : 'border-[#34343a] bg-[#161616]/85 text-[#f4f4f4]'
              }`}
            >
              {active3dMode === 'surface' && colorScheme !== 'hydrophobicity' ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 bg-[#4589ff]" aria-hidden />
                  VDW Surface
                </span>
              ) : colorScheme === 'hydrophobicity' ? (
                <>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 bg-[#e53935]" aria-hidden />
                    Hydrophilic
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className={`inline-block h-2 w-2 border ${
                        isPaper ? 'border-[#a8a29e] bg-[#f7f4ec]' : 'border-[#6f6f6f] bg-[#e5e5e5]'
                      }`}
                      aria-hidden
                    />
                    Neutral
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 bg-[#2563eb]" aria-hidden />
                    Hydrophobic
                  </span>
                </>
              ) : colorScheme === 'charge' ? (
                <>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 bg-[#4589ff]" aria-hidden />
                    N (amide)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 bg-[#da1e28]" aria-hidden />
                    O (carbonyl)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 bg-[#7a7a82]" aria-hidden />
                    C (carbon)
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>N-term</span>
                  <span
                    className="inline-block h-2 w-14"
                    style={{
                      background:
                        'linear-gradient(to right, #2563eb, #10b981, #eab308, #ef4444)'
                    }}
                    aria-hidden
                  />
                  <span>C-term</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen((open) => !open)}
              aria-expanded={infoOpen}
              aria-label="Toggle 3D structure information"
              title="3D structure guide & color legend"
              className={`flex h-7 items-center gap-1 border px-2 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                infoOpen
                  ? 'border-accent bg-accent text-white'
                  : isPaper
                    ? 'border-[#d5d0c5] bg-[#f7f4ec]/95 text-[#161616] hover:bg-[#e2ddd2]'
                    : 'border-[#393939] bg-[#161616]/90 text-[#f4f4f4] hover:bg-[#262626]'
              }`}
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
              <span>Info</span>
            </button>
          </div>

          {infoOpen && (
            <div
              role="region"
              aria-label="3D structure information"
              className={`w-72 border p-3 text-[11px] leading-relaxed shadow-lg sm:w-80 ${
                isPaper
                  ? 'border-[#c6c0b4] bg-[#f9f7f2] text-[#161616]'
                  : 'border-[#393939] bg-[#19191c] text-[#f4f4f4]'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2 border-b border-current/15 pb-1.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]">
                  3D Model Anatomy
                </span>
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  aria-label="Close structure guide"
                  className="p-0.5 opacity-70 hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>

              <div className="space-y-2 text-[10.5px]">
                <div>
                  <span className="block font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent">
                    Structure Shown
                  </span>
                  <p className={isPaper ? 'text-[#424242]' : 'text-[#c6c6c6]'}>
                    Amphipathic <strong>α-helix</strong> ({pdbSummary.residueCount} aa,{' '}
                    {pdbSummary.atomCount} atoms, Chain A). Canonical 100° turn and 1.52 Å axial rise
                    per residue modeling backbone <strong>N, Cα, C, O</strong> plus{' '}
                    <strong>Cβ</strong> sidechain anchors.
                  </p>
                </div>

                <div>
                  <span className="block font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent">
                    Render Mode · {active3dMode.toUpperCase()}
                  </span>
                  <p className={isPaper ? 'text-[#424242]' : 'text-[#c6c6c6]'}>
                    {MODE_DESCRIPTIONS[active3dMode]}
                  </p>
                </div>

                <div>
                  <span className="block font-mono text-[9.5px] uppercase tracking-[0.08em] text-accent">
                    Color Scheme · {colorScheme.toUpperCase()}
                  </span>
                  {colorScheme === 'hydrophobicity' ? (
                    <p className={isPaper ? 'text-[#424242]' : 'text-[#c6c6c6]'}>
                      Eisenberg B-factor RWB gradient: <strong>Red</strong> = hydrophilic/cationic
                      residues (K, R, D, E), <strong>White</strong> = neutral (G, P, S, T),{' '}
                      <strong>Blue</strong> = hydrophobic membrane face (I, L, F, V, W).
                    </p>
                  ) : colorScheme === 'charge' ? (
                    <p className={isPaper ? 'text-[#424242]' : 'text-[#c6c6c6]'}>
                      Atomic element map: <strong>Blue</strong> = Nitrogen (amide/cationic),{' '}
                      <strong>Red</strong> = Oxygen (carbonyl/acidic), <strong>Gray</strong> = Carbon
                      backbone &amp; Cβ.
                    </p>
                  ) : (
                    <p className={isPaper ? 'text-[#424242]' : 'text-[#c6c6c6]'}>
                      Sequence progression spectrum flowing smoothly from{' '}
                      <strong>N-terminus (blue)</strong> to <strong>C-terminus (red)</strong>.
                    </p>
                  )}
                </div>

                <div className="border-t border-current/15 pt-1.5 font-mono text-[9.5px] opacity-80">
                  Drag: Rotate · Scroll Up/Down: Zoom · Hover: Inspect residue
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3D canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        title="Drag to rotate, scroll up to zoom in, scroll down to zoom out"
      />

      {(!isScriptLoaded || loadError) && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6 text-center"
          style={{ backgroundColor: effectiveHex }}
        >
          {loadError ? (
            <>
              <p
                className={`max-w-xs font-mono text-[11px] leading-relaxed ${
                  isPaper ? 'text-[#161616]' : 'text-[#f4f4f4]'
                }`}
              >
                {loadError}
              </p>
              <button
                type="button"
                onClick={() => {
                  mol3dLoadPromise = null;
                  setLoadError(null);
                  setIsScriptLoaded(false);
                  setReloadNonce((n) => n + 1);
                }}
                className="border border-accent bg-accent px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-accent-hover"
              >
                Retry WebGL
              </button>
            </>
          ) : (
            <>
              <span className="h-4 w-4 animate-spin border border-accent border-t-transparent" aria-hidden />
              <p
                className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                  isPaper ? 'text-[#525252]' : 'text-[#a8a8a8]'
                }`}
              >
                Initializing WebGL
              </p>
            </>
          )}
        </div>
      )}

      {/* Single control bar */}
      <div
        className={`absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-px p-px ${
          isPaper
            ? 'border border-[#d5d0c5] bg-[#f7f4ec]/95'
            : 'bg-[#161616]/90'
        }`}
      >
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

        <span
          className={`mx-1 h-5 w-px ${isPaper ? 'bg-[#d5d0c5]' : 'bg-[#393939]'}`}
          aria-hidden
        />

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

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleStageBackground}
            aria-label={isPaper ? 'Switch 3D background to dark' : 'Switch 3D background to soft paper'}
            title={isPaper ? 'Switch 3D canvas to dark' : 'Switch 3D canvas to soft paper'}
            className={`flex h-8 items-center gap-1 px-2 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
              isPaper
                ? 'text-[#525252] hover:bg-[#e2ddd2] hover:text-[#161616]'
                : 'text-[#c6c6c6] hover:bg-[#262626] hover:text-white'
            }`}
          >
            {isPaper ? (
              <>
                <Sun className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Paper</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          <span
            className={`mx-0.5 h-5 w-px ${isPaper ? 'bg-[#d5d0c5]' : 'bg-[#393939]'}`}
            aria-hidden
          />

          <button
            type="button"
            onClick={() => handleZoom(1.25)}
            aria-label="Zoom in 3D view"
            title="Zoom in"
            className={iconBtnClass}
          >
            <ZoomIn className="mx-auto h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.8)}
            aria-label="Zoom out 3D view"
            title="Zoom out"
            className={iconBtnClass}
          >
            <ZoomOut className="mx-auto h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={toggleSpin}
            aria-pressed={isSpinning}
            title={isSpinning ? 'Pause rotation' : 'Rotate 3D model'}
            className={`h-8 w-8 transition-colors ${
              isSpinning
                ? 'text-accent'
                : iconBtnClass
            }`}
          >
            <RotateCw className="mx-auto h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={resetView}
            title="Reset camera"
            className={iconBtnClass}
          >
            <RefreshCw className="mx-auto h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
});

MoleculeViewer.displayName = 'MoleculeViewer';

/**
 * Applies 3Dmol representation and color mapping
 */
function applyStyle(viewer: Mol3DViewer, mode: Display3DMode, scheme: ColorScheme) {
  viewer.setStyle({}, {});

  let colorFunc: Record<string, unknown> = { color: 'spectrum' };

  if (scheme === 'hydrophobicity') {
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
        map: { N: '#4589ff', O: '#da1e28', C: '#7a7a82' }
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
