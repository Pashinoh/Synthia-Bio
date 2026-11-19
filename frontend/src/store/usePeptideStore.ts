import { create } from 'zustand';
import {
  BenchmarkComparisonReport,
  BiophysicalMetrics,
  ChargePhCurve,
  GeneratedPeptide,
  GenerationMode,
  HelicalWheelProjection,
  OptimizePeptideResponse,
  PathogenProfile,
  PeptideDesignParams,
  ProteaseStabilityReport,
  ScreenedPeptideCandidate,
  CompareBenchmarksResponse,
  GenerateBatchResponse,
  GeneratePeptideResponse
} from '@/types/peptide';
import { DEFAULT_PATHOGEN } from '@/lib/pathogens';
import { MOCK_GENERATED_PEPTIDE } from '@/lib/mock-data';
import { calculateBiophysicalMetrics, getAminoAcidProfile } from '@/lib/bio-engine/calculators';
import { generateAlphaHelixPDB } from '@/lib/bio-engine/pdb-generator';

export type Display3DMode = 'cartoon' | 'surface' | 'stick' | 'sphere';
export type ColorScheme = 'hydrophobicity' | 'charge' | 'spectrum';
export type ActiveOperation = 'idle' | 'generate' | 'batch' | 'validate' | 'optimize' | 'benchmark';
export type ThemeMode = 'light' | 'dark';
export type WorkspaceFocusTarget =
  | 'stage'
  | 'charts'
  | 'protease'
  | 'batch'
  | 'optimize'
  | 'benchmarks';

export interface WorkspaceFocus {
  target: WorkspaceFocusTarget;
  label: string;
  nonce: number;
}

export interface PreviousComparison {
  sequence: string;
  name: string;
  metrics: BiophysicalMetrics;
}

function nextWorkspaceFocus(
  current: WorkspaceFocus | null,
  target: WorkspaceFocusTarget,
  label: string
): WorkspaceFocus {
  return { target, label, nonce: (current?.nonce ?? 0) + 1 };
}

function toComparisonSnapshot(peptide: GeneratedPeptide | null): PreviousComparison | null {
  if (!peptide) return null;
  return {
    sequence: peptide.sequence,
    name: peptide.name,
    metrics: peptide.metrics
  };
}

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'
).replace(/\/+$/, '');

class HttpStatusError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function postJson<T extends { success: boolean; error?: string }>(
  url: string,
  body: unknown,
  timeoutMs = 15000
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after') || response.headers.get('Retry-After');
    const seconds = retryAfter ? parseInt(retryAfter, 10) : 45;
    throw new HttpStatusError(429, `Rate limit exceeded. Try again in ${seconds}s.`);
  }

  const data = (await response.json()) as T;
  if (!response.ok || !data.success) {
    throw new HttpStatusError(response.status, data.error || `Request failed (${response.status})`);
  }

  return data;
}

interface PeptideState {
  selectedPathogen: PathogenProfile;
  designParams: PeptideDesignParams;
  generationMode: GenerationMode;
  currentPeptide: GeneratedPeptide | null;
  batchCandidates: ScreenedPeptideCandidate[];
  proteaseReport: ProteaseStabilityReport | null;
  helicalWheel: HelicalWheelProjection | null;
  chargePhCurve: ChargePhCurve | null;
  optimizationResult: OptimizePeptideResponse | null;
  benchmarkReport: BenchmarkComparisonReport | null;
  isLoading: boolean;
  activeOperation: ActiveOperation;
  error: string | null;
  active3dMode: Display3DMode;
  colorScheme: ColorScheme;
  theme: ThemeMode;
  generation: number;
  workspaceFocus: WorkspaceFocus | null;
  previousComparison: PreviousComparison | null;

  // Actions
  setSelectedPathogen: (pathogen: PathogenProfile) => void;
  updateDesignParams: (params: Partial<PeptideDesignParams>) => void;
  setGenerationMode: (mode: GenerationMode) => void;
  setActive3dMode: (mode: Display3DMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setTheme: (theme: ThemeMode) => void;
  initTheme: () => void;
  generatePeptide: () => Promise<void>;
  selectBatchCandidate: (candidate: ScreenedPeptideCandidate) => void;
  validateStability: (sequence: string) => Promise<void>;
  optimizeCurrentPeptide: (rounds?: number) => Promise<void>;
  applyOptimizedSequence: () => void;
  compareBenchmarks: (sequence: string, candidateName?: string) => Promise<void>;
  resetToMock: () => void;
}

async function fetchAuxiliaryAnalytics(
  sequence: string,
  candidateName: string,
  set: (partial: Partial<PeptideState>) => void
): Promise<void> {
  const [stabilityRes, benchmarkRes] = await Promise.allSettled([
    postJson<{
      success: boolean;
      error?: string;
      proteaseReport: ProteaseStabilityReport;
      helicalWheel: HelicalWheelProjection;
      chargePhCurve: ChargePhCurve;
    }>(`${BACKEND_URL}/api/validate-stability`, { sequence }, 10000),
    postJson<CompareBenchmarksResponse>(
      `${BACKEND_URL}/api/benchmarks/compare`,
      { sequence, candidateName },
      10000
    )
  ]);

  const updates: Partial<PeptideState> = {};
  if (stabilityRes.status === 'fulfilled') {
    updates.proteaseReport = stabilityRes.value.proteaseReport;
    updates.helicalWheel = stabilityRes.value.helicalWheel;
    updates.chargePhCurve = stabilityRes.value.chargePhCurve;
  }
  if (benchmarkRes.status === 'fulfilled') {
    updates.benchmarkReport = benchmarkRes.value.report;
  }
  if (Object.keys(updates).length > 0) {
    set(updates);
  }
}

export const usePeptideStore = create<PeptideState>((set, get) => ({
  selectedPathogen: DEFAULT_PATHOGEN,
  designParams: {
    pathogenId: DEFAULT_PATHOGEN.id,
    sequenceLength: 18,
    poreMechanism: 'toroidal',
    safetyThreshold: 'high-selectivity',
    provider: 'auto',
    autoOptimize: true,
    lockedMotif: ''
  },
  generationMode: 'single',
  currentPeptide: MOCK_GENERATED_PEPTIDE,
  batchCandidates: [],
  proteaseReport: null,
  helicalWheel: null,
  chargePhCurve: null,
  optimizationResult: null,
  benchmarkReport: null,
  isLoading: false,
  activeOperation: 'idle',
  error: null,
  active3dMode: 'cartoon',
  colorScheme: 'hydrophobicity',
  theme: 'light',
  generation: 1,
  workspaceFocus: null,
  previousComparison: null,

  setSelectedPathogen: (pathogen) => {
    set({
      selectedPathogen: pathogen,
      designParams: {
        ...get().designParams,
        pathogenId: pathogen.id,
        sequenceLength: Math.round((pathogen.recommendedLength[0] + pathogen.recommendedLength[1]) / 2)
      }
    });
  },

  updateDesignParams: (params) => {
    set({
      designParams: {
        ...get().designParams,
        ...params
      }
    });
  },

  setGenerationMode: (mode) => set({ generationMode: mode }),
  setActive3dMode: (mode) => set({ active3dMode: mode }),
  setColorScheme: (scheme) => set({ colorScheme: scheme }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      document.documentElement.dataset.theme = theme;
      window.localStorage.setItem('synthia-theme', theme);
    }
    set({ theme });
  },

  initTheme: () => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('synthia-theme');
    const prefersDark =
      saved === 'dark' ||
      (!saved && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
    const next: ThemeMode = prefersDark ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    set({ theme: next });
  },

  resetToMock: () => {
    set({
      currentPeptide: MOCK_GENERATED_PEPTIDE,
      batchCandidates: [],
      proteaseReport: null,
      helicalWheel: null,
      chargePhCurve: null,
      optimizationResult: null,
      benchmarkReport: null,
      error: null,
      isLoading: false,
      activeOperation: 'idle',
      workspaceFocus: null,
      previousComparison: null
    });
  },

  validateStability: async (sequence: string) => {
    set({ isLoading: true, activeOperation: 'validate', error: null });

    try {
      const data = await postJson<{
        success: boolean;
        error?: string;
        proteaseReport: ProteaseStabilityReport;
        helicalWheel: HelicalWheelProjection;
        chargePhCurve: ChargePhCurve;
      }>(`${BACKEND_URL}/api/validate-stability`, { sequence });

      set({
        proteaseReport: data.proteaseReport,
        helicalWheel: data.helicalWheel,
        chargePhCurve: data.chargePhCurve,
        isLoading: false,
        activeOperation: 'idle',
        error: null,
        workspaceFocus: nextWorkspaceFocus(
          get().workspaceFocus,
          'protease',
          'Protease shield & charge stability updated'
        )
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown validation error';
      set({
        proteaseReport: null,
        helicalWheel: null,
        chargePhCurve: null,
        isLoading: false,
        activeOperation: 'idle',
        error: errorMessage
      });
    }
  },

  compareBenchmarks: async (sequence: string, candidateName?: string) => {
    set({ isLoading: true, activeOperation: 'benchmark', error: null });
    try {
      const data = await postJson<CompareBenchmarksResponse>(
        `${BACKEND_URL}/api/benchmarks/compare`,
        { sequence, candidateName: candidateName || get().currentPeptide?.name }
      );
      set({
        benchmarkReport: data.report,
        isLoading: false,
        activeOperation: 'idle',
        error: null,
        workspaceFocus: nextWorkspaceFocus(
          get().workspaceFocus,
          'benchmarks',
          'Clinical benchmark comparison ready'
        )
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Benchmark comparison failed';
      set({ isLoading: false, activeOperation: 'idle', error: msg });
    }
  },

  optimizeCurrentPeptide: async (rounds = 3) => {
    const { currentPeptide, selectedPathogen, designParams } = get();
    if (!currentPeptide) return;

    set({ isLoading: true, activeOperation: 'optimize', error: null });
    try {
      const cleanMotif = designParams.lockedMotif?.trim() || undefined;
      const data = await postJson<OptimizePeptideResponse>(`${BACKEND_URL}/api/optimize`, {
        sequence: currentPeptide.sequence,
        pathogenId: selectedPathogen.id,
        rounds,
        ...(cleanMotif ? { lockedMotif: cleanMotif } : {})
      });

      set({
        optimizationResult: data,
        isLoading: false,
        activeOperation: 'idle',
        error: null,
        workspaceFocus: nextWorkspaceFocus(
          get().workspaceFocus,
          'optimize',
          'Directed evolution mutations ready'
        )
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mutation optimization failed';
      set({ isLoading: false, activeOperation: 'idle', error: msg });
    }
  },

  applyOptimizedSequence: () => {
    const { currentPeptide, optimizationResult } = get();
    if (!currentPeptide || !optimizationResult) return;

    const traj = optimizationResult.evolutionTrajectory;
    if (!traj.finalSequence || traj.finalSequence === currentPeptide.sequence) return;

    const nextName = currentPeptide.name.endsWith('-Opt')
      ? currentPeptide.name
      : `${currentPeptide.name}-Opt`;
    const nextMetrics = traj.finalMetrics ?? calculateBiophysicalMetrics(traj.finalSequence);
    const nextProfile = getAminoAcidProfile(traj.finalSequence);
    const nextPdb = generateAlphaHelixPDB(traj.finalSequence, nextName);

    const updatedPeptide: GeneratedPeptide = {
      ...currentPeptide,
      name: nextName,
      sequence: traj.finalSequence,
      length: traj.finalSequence.length,
      metrics: nextMetrics,
      aminoAcidProfile: nextProfile,
      pdbContent: nextPdb,
      cifContent: undefined,
      inSilicoGates: undefined,
      fastaContent: `>${nextName} | Evolved: ${traj.appliedMutations.join(', ')} | Target: ${currentPeptide.targetPathogen}\n${traj.finalSequence}`,
      optimizationSummary: {
        applied: true,
        originalSequence: traj.originalSequence,
        originalSelectivity: traj.initialMetrics.therapeuticSelectivityIndex,
        originalHemolysisRisk: traj.initialMetrics.predictedHemolysisRisk,
        appliedMutations: traj.appliedMutations,
        notes: `Applied directed evolution (${traj.appliedMutations.join(', ')}): fitness ${traj.initialFitness} -> ${traj.finalFitness}`
      }
    };

    set({
      currentPeptide: updatedPeptide,
      proteaseReport: traj.finalProtease,
      helicalWheel: null,
      chargePhCurve: null,
      benchmarkReport: null,
      generation: get().generation + 1,
      error: null,
      previousComparison: toComparisonSnapshot(currentPeptide),
      workspaceFocus: nextWorkspaceFocus(
        get().workspaceFocus,
        'stage',
        'Evolved peptide applied to 3D & metrics'
      )
    });

    void fetchAuxiliaryAnalytics(updatedPeptide.sequence, updatedPeptide.name, set);
  },

  selectBatchCandidate: (candidate) => {
    const previous = get().currentPeptide;
    set({
      currentPeptide: candidate.peptide,
      proteaseReport: null,
      helicalWheel: null,
      chargePhCurve: null,
      optimizationResult: null,
      benchmarkReport: null,
      generation: get().generation + 1,
      error: null,
      previousComparison:
        previous && previous.sequence !== candidate.peptide.sequence
          ? toComparisonSnapshot(previous)
          : get().previousComparison,
      workspaceFocus: nextWorkspaceFocus(
        get().workspaceFocus,
        'stage',
        `Loaded batch candidate #${candidate.rank}`
      )
    });

    void fetchAuxiliaryAnalytics(candidate.peptide.sequence, candidate.peptide.name, set);
  },

  generatePeptide: async () => {
    const { designParams, selectedPathogen, generationMode } = get();
    const isBatch = generationMode === 'batch';

    set({
      isLoading: true,
      activeOperation: isBatch ? 'batch' : 'generate',
      error: null,
      optimizationResult: null
    });

    const cleanMotif = designParams.lockedMotif?.trim() || undefined;
    const basePayload = {
      pathogenId: selectedPathogen.id,
      sequenceLength: designParams.sequenceLength,
      poreMechanism: designParams.poreMechanism,
      safetyThreshold: designParams.safetyThreshold,
      customPathogenName: designParams.customPathogenName,
      autoOptimize: designParams.autoOptimize !== false,
      ...(cleanMotif ? { lockedMotif: cleanMotif } : {})
    };

    try {
      if (isBatch) {
        const data = await postJson<GenerateBatchResponse>(
          `${BACKEND_URL}/api/generate-batch`,
          { ...basePayload, provider: 'dual', maxCandidates: 3 },
          25000
        );

        const picked = data.bestCandidate?.peptide || data.candidates[0]?.peptide;
        if (!picked) {
          throw new Error('Batch screening returned no candidates');
        }

        const previousSnap = toComparisonSnapshot(get().currentPeptide);
        set({
          currentPeptide: picked,
          batchCandidates: data.candidates,
          proteaseReport: null,
          helicalWheel: null,
          chargePhCurve: null,
          benchmarkReport: null,
          generation: get().generation + 1,
          isLoading: false,
          activeOperation: 'idle',
          error: null,
          previousComparison: previousSnap,
          workspaceFocus: nextWorkspaceFocus(
            get().workspaceFocus,
            'batch',
            '3x batch candidates ranked'
          )
        });

        void fetchAuxiliaryAnalytics(picked.sequence, picked.name, set);
        return;
      }

      const payload = { ...basePayload, provider: designParams.provider || 'auto' };
      let data: GeneratePeptideResponse;

      try {
        data = await postJson<GeneratePeptideResponse>(
          `${BACKEND_URL}/api/generate`,
          payload,
          18000
        );
      } catch (backendErr) {
        // Fallback to Next.js internal route only on network/reachability errors, not 429/400 API responses
        if (backendErr instanceof HttpStatusError) {
          throw backendErr;
        }
        data = await postJson<GeneratePeptideResponse>('/api/generate', payload, 15000);
      }

      if (!data.peptide) {
        throw new Error('Backend returned empty peptide payload');
      }

      const previousSnap = toComparisonSnapshot(get().currentPeptide);
      set({
        currentPeptide: data.peptide,
        batchCandidates: [],
        proteaseReport: null,
        helicalWheel: null,
        chargePhCurve: null,
        benchmarkReport: null,
        generation: get().generation + 1,
        isLoading: false,
        activeOperation: 'idle',
        error: null,
        previousComparison: previousSnap,
        workspaceFocus: nextWorkspaceFocus(
          get().workspaceFocus,
          'stage',
          'De novo peptide structure generated'
        )
      });

      void fetchAuxiliaryAnalytics(data.peptide.sequence, data.peptide.name, set);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown generation error';
      set({
        currentPeptide: get().currentPeptide ?? MOCK_GENERATED_PEPTIDE,
        isLoading: false,
        activeOperation: 'idle',
        error: errorMessage
      });
    }
  }
}));
