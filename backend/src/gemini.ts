import { GoogleGenAI } from '@google/genai';
import {
  ClosedLoopOptimizationSummary,
  PathogenProfile,
  PeptideDesignParams
} from './types/peptide';
import {
  AMP_SYSTEM_INSTRUCTION,
  buildPeptidePrompt,
  normalizeAiPeptideOutput,
  RawAiPeptideOutput,
  sanitizeLockedMotif
} from './ai/prompt-utils';
import { generateWithGroq, ProviderGenerationResult } from './ai/groq-client';
import {
  evaluatePeptideFitness,
  evolvePeptideSequence,
  resolveLockedPositions
} from './ai/mutation-optimizer';
import { analyzeSynthesisFeasibility } from './ai/synthesis-feasibility';

export type { RawAiPeptideOutput } from './ai/prompt-utils';

export interface SynthesizedPeptideResult extends ProviderGenerationResult {
  optimizationSummary?: ClosedLoopOptimizationSummary;
}

const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

async function callGeminiProvider(
  pathogen: PathogenProfile,
  params: PeptideDesignParams,
  timeoutMs = 10000
): Promise<ProviderGenerationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildPeptidePrompt(pathogen, params),
        config: {
          systemInstruction: AMP_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          temperature: attempt === 0 ? 0.7 : 0.85,
          abortSignal: AbortSignal.timeout(timeoutMs)
        }
      });

      const text = response.text?.trim() || '';
      return {
        output: normalizeAiPeptideOutput(text, pathogen, params.sequenceLength),
        provider: 'gemini',
        model
      };
    } catch (err) {
      lastError = err;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini generation failed');
}

async function collectDualProviderCandidates(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): Promise<ProviderGenerationResult[]> {
  const tasks: Promise<ProviderGenerationResult>[] = [];
  if (process.env.GEMINI_API_KEY) {
    tasks.push(callGeminiProvider(pathogen, params, 10000));
  }
  if (process.env.GROQ_API_KEY) {
    tasks.push(generateWithGroq(pathogen, params));
  }
  if (tasks.length === 0) return [];

  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((r): r is PromiseFulfilledResult<ProviderGenerationResult> => r.status === 'fulfilled')
    .map((r) => r.value);
}

async function selectCandidateByProvider(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): Promise<ProviderGenerationResult> {
  const preference = params.provider || 'auto';

  if (preference === 'gemini') {
    try {
      return await callGeminiProvider(pathogen, params, 12000);
    } catch (err) {
      console.error('[SynthiaBio Gemini] Error, falling back to heuristic:', err);
      return { output: generateHeuristicPeptide(pathogen, params), provider: 'heuristic', model: 'deterministic-motif' };
    }
  }

  if (preference === 'groq') {
    try {
      return await generateWithGroq(pathogen, params);
    } catch (err) {
      console.error('[SynthiaBio Groq] Error, falling back to heuristic:', err);
      return { output: generateHeuristicPeptide(pathogen, params), provider: 'heuristic', model: 'deterministic-motif' };
    }
  }

  if (preference === 'dual') {
    const viable = await collectDualProviderCandidates(pathogen, params);

    if (viable.length === 1) {
      return viable[0];
    }

    if (viable.length > 1) {
      return viable.sort((a, b) => {
        const evalA = evaluatePeptideFitness(a.output.sequence, pathogen);
        const evalB = evaluatePeptideFitness(b.output.sequence, pathogen);
        return evalB.compositeScore - evalA.compositeScore;
      })[0];
    }

    console.warn('[SynthiaBio Dual] Both Gemini and Groq failed; using heuristic fallback.');
    return { output: generateHeuristicPeptide(pathogen, params), provider: 'heuristic', model: 'deterministic-motif' };
  }

  // Default 'auto' cascade: Groq (low-latency ~1s, low-reasoning-token) -> Gemini -> Deterministic Heuristic
  if (process.env.GROQ_API_KEY) {
    try {
      return await generateWithGroq(pathogen, params);
    } catch (groqErr) {
      console.warn('[SynthiaBio Router] Groq failed, failing over to Gemini:', groqErr);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGeminiProvider(pathogen, params, 8000);
    } catch (geminiErr) {
      console.warn('[SynthiaBio Router] Gemini failover also failed, using heuristic:', geminiErr);
    }
  }

  return {
    output: generateHeuristicPeptide(pathogen, params),
    provider: 'heuristic',
    model: 'deterministic-motif'
  };
}

const MAX_BATCH_PAIRWISE_IDENTITY = 0.82;

/**
 * Computes normalized positional sequence identity (0.0 - 1.0) between two sequences
 * to prevent near-duplicate variants from crowding multi-candidate batch screening.
 */
export function computeSequenceIdentity(seqA: string, seqB: string): number {
  const maxLen = Math.max(seqA.length, seqB.length);
  if (maxLen === 0) return 1;
  const minLen = Math.min(seqA.length, seqB.length);
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (seqA[i] === seqB[i]) matches++;
  }
  return parseFloat((matches / maxLen).toFixed(3));
}

function selectDiverseBatchCandidates(
  rankedCandidates: SynthesizedPeptideResult[],
  boundedMax: number
): SynthesizedPeptideResult[] {
  const selected: SynthesizedPeptideResult[] = [];
  const deferred: SynthesizedPeptideResult[] = [];

  for (const candidate of rankedCandidates) {
    const tooSimilar = selected.some(
      (picked) =>
        computeSequenceIdentity(picked.output.sequence, candidate.output.sequence) >
        MAX_BATCH_PAIRWISE_IDENTITY
    );

    if (!tooSimilar) {
      selected.push(candidate);
      if (selected.length >= boundedMax) break;
    } else {
      deferred.push(candidate);
    }
  }

  for (const backup of deferred) {
    if (selected.length >= boundedMax) break;
    selected.push(backup);
  }

  return selected;
}

function applyClosedLoopRefinement(
  selected: ProviderGenerationResult,
  pathogen: PathogenProfile,
  enabled: boolean,
  lockedMotif?: string
): SynthesizedPeptideResult {
  if (!enabled) {
    return selected;
  }

  const initialEval = evaluatePeptideFitness(selected.output.sequence, pathogen);
  const { metrics } = initialEval;
  const [minCharge, maxCharge] = pathogen.suggestedChargeRange;

  const needsRefinement =
    metrics.predictedHemolysisRisk !== 'Low' ||
    metrics.therapeuticSelectivityIndex < 90 ||
    metrics.netCharge < minCharge ||
    metrics.netCharge > maxCharge ||
    metrics.hydrophobicMoment < 0.4;

  if (!needsRefinement) {
    return selected;
  }

  const lockedPositions = resolveLockedPositions(selected.output.sequence, undefined, lockedMotif);
  const trajectory = evolvePeptideSequence(selected.output.sequence, pathogen, 2, lockedPositions);
  if (trajectory.appliedMutations.length === 0 || trajectory.finalFitness <= trajectory.initialFitness) {
    return selected;
  }

  const refinementNote = `Closed-loop refinement applied ${trajectory.appliedMutations.join(', ')}: selectivity ${trajectory.initialMetrics.therapeuticSelectivityIndex} -> ${trajectory.finalMetrics.therapeuticSelectivityIndex}, hemolysis ${trajectory.initialMetrics.predictedHemolysisRisk} -> ${trajectory.finalMetrics.predictedHemolysisRisk}.`;

  return {
    ...selected,
    output: {
      ...selected.output,
      sequence: trajectory.finalSequence,
      molecularRationale: `${selected.output.molecularRationale} [${refinementNote}]`
    },
    optimizationSummary: {
      applied: true,
      originalSequence: trajectory.originalSequence,
      originalSelectivity: trajectory.initialMetrics.therapeuticSelectivityIndex,
      originalHemolysisRisk: trajectory.initialMetrics.predictedHemolysisRisk,
      appliedMutations: trajectory.appliedMutations,
      notes: refinementNote
    }
  };
}

/**
 * Orchestrates multi-provider AMP synthesis (Gemini + Groq + Heuristic fallback)
 * followed by deterministic closed-loop biophysical optimization.
 */
export async function synthesizePeptideWithAI(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): Promise<SynthesizedPeptideResult> {
  const selected = await selectCandidateByProvider(pathogen, params);
  return applyClosedLoopRefinement(selected, pathogen, params.autoOptimize !== false, params.lockedMotif);
}

/**
 * Generates and ranks multiple distinct, sequence-diverse candidate peptides across active AI engines
 * plus directed-evolution optimization so callers can inspect trade-offs side by side.
 */
export async function synthesizeBatchWithAI(
  pathogen: PathogenProfile,
  params: PeptideDesignParams,
  maxCandidates = 3
): Promise<SynthesizedPeptideResult[]> {
  const boundedMax = Math.max(2, Math.min(4, Math.round(maxCandidates)));
  const preference = params.provider || 'dual';

  let rawPool: ProviderGenerationResult[] = [];
  if (preference === 'gemini') {
    rawPool = [await selectCandidateByProvider(pathogen, { ...params, provider: 'gemini' })];
  } else if (preference === 'groq') {
    rawPool = [await selectCandidateByProvider(pathogen, { ...params, provider: 'groq' })];
  } else {
    rawPool = await collectDualProviderCandidates(pathogen, params);
  }

  // Always include deterministic baseline motif so screening stays robust offline and adds diversity
  rawPool.push({
    output: generateHeuristicPeptide(pathogen, params),
    provider: 'heuristic',
    model: 'deterministic-motif'
  });

  const deduped = new Map<string, SynthesizedPeptideResult>();
  const register = (item: SynthesizedPeptideResult) => {
    const seq = item.output.sequence;
    if (!deduped.has(seq)) {
      deduped.set(seq, item);
    }
  };

  for (const rawItem of rawPool) {
    register(rawItem);
    if (params.autoOptimize !== false) {
      const refined = applyClosedLoopRefinement(rawItem, pathogen, true, params.lockedMotif);
      if (refined.optimizationSummary?.applied) {
        register({
          ...refined,
          output: {
            ...refined.output,
            candidateName: `${refined.output.candidateName}-Opt`
          }
        });
      }
    }
  }

  // Ensure at least 2 distinct candidates even when offline by running multi-round evolution on best seed
  if (deduped.size < boundedMax && params.autoOptimize !== false) {
    const topSeed = Array.from(deduped.values())[0];
    if (topSeed) {
      const lockedPositions = resolveLockedPositions(topSeed.output.sequence, undefined, params.lockedMotif);
      const traj = evolvePeptideSequence(topSeed.output.sequence, pathogen, 3, lockedPositions);
      if (traj.appliedMutations.length > 0 && !deduped.has(traj.finalSequence)) {
        const note = `Directed evolution applied ${traj.appliedMutations.join(', ')}: selectivity ${traj.initialMetrics.therapeuticSelectivityIndex} -> ${traj.finalMetrics.therapeuticSelectivityIndex}.`;
        register({
          ...topSeed,
          output: {
            ...topSeed.output,
            candidateName: `${topSeed.output.candidateName}-Evo`,
            sequence: traj.finalSequence,
            molecularRationale: `${topSeed.output.molecularRationale} [${note}]`
          },
          optimizationSummary: {
            applied: true,
            originalSequence: traj.originalSequence,
            originalSelectivity: traj.initialMetrics.therapeuticSelectivityIndex,
            originalHemolysisRisk: traj.initialMetrics.predictedHemolysisRisk,
            appliedMutations: traj.appliedMutations,
            notes: note
          }
        });
      }
    }
  }

  const scoreItem = (item: SynthesizedPeptideResult): number => {
    const fit = evaluatePeptideFitness(item.output.sequence, pathogen).compositeScore;
    const spps = analyzeSynthesisFeasibility(item.output.sequence).feasibilityScore;
    return fit + spps * 0.15;
  };

  const rankedPool = Array.from(deduped.values()).sort((a, b) => scoreItem(b) - scoreItem(a));
  return selectDiverseBatchCandidates(rankedPool, boundedMax);
}

/**
 * Backwards-compatible helper returning raw peptide fields from AI generation.
 */
export async function generatePeptideWithGemini(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): Promise<RawAiPeptideOutput> {
  const result = await synthesizePeptideWithAI(pathogen, { ...params, provider: params.provider || 'auto' });
  return result.output;
}

/**
 * Deterministic heuristic generator based on standard amphipathic motif (i, i+3, i+4)
 * Ensures 100% offline uptime and preserves any requested scaffold motif.
 */
export function generateHeuristicPeptide(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): RawAiPeptideOutput {
  const length = params.sequenceLength;
  const motif = ['K', 'W', 'K', 'L', 'F', 'K', 'K', 'I', 'V', 'K', 'L', 'L', 'K', 'S', 'K', 'K', 'V', 'L', 'K', 'R', 'A', 'K', 'I', 'L', 'K', 'Q', 'K', 'L'];
  const lockedPrefix = sanitizeLockedMotif(params.lockedMotif, length) || '';
  let seq = lockedPrefix;
  for (let i = lockedPrefix.length; i < length; i++) {
    seq += motif[i % motif.length];
  }

  return {
    candidateName: `Synthia-${pathogen.id.toUpperCase()}-Opt${length}`,
    sequence: seq,
    molecularRationale: `Generated using an optimized (i, i+3, i+4) amphipathic alpha-helical repeat${lockedPrefix ? ` anchored around conserved motif ${lockedPrefix}` : ''}. Alternating Lysine (K) residues align along the polar azimuth at 100-degree pitch intervals to destabilize ${pathogen.name} lipid packing while hydrophobic Leu/Ile/Trp residues insert into the hydrocarbon core.`,
    membraneAffinityExplanation: `Targets the ${pathogen.membraneCharacteristics.outerMembraneCharge} mV outer potential of ${pathogen.scientificName} via high polycationic field density, initiating lipid headgroup displacement.`
  };
}
