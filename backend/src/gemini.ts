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
  RawAiPeptideOutput
} from './ai/prompt-utils';
import { generateWithGroq, ProviderGenerationResult } from './ai/groq-client';
import { evaluatePeptideFitness, evolvePeptideSequence } from './ai/mutation-optimizer';

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
  const response = await ai.models.generateContent({
    model,
    contents: buildPeptidePrompt(pathogen, params),
    config: {
      systemInstruction: AMP_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(timeoutMs)
    }
  });

  const text = response.text?.trim() || '';
  return {
    output: normalizeAiPeptideOutput(text, pathogen, params.sequenceLength),
    provider: 'gemini',
    model
  };
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
    const settled = await Promise.allSettled([
      callGeminiProvider(pathogen, params),
      generateWithGroq(pathogen, params)
    ]);

    const viable = settled
      .filter((r): r is PromiseFulfilledResult<ProviderGenerationResult> => r.status === 'fulfilled')
      .map((r) => r.value);

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

  // Default 'auto' cascade: Gemini (7.5s cap) -> Groq -> Deterministic Heuristic
  if (process.env.GEMINI_API_KEY) {
    try {
      return await callGeminiProvider(pathogen, params, 7500);
    } catch (geminiErr) {
      console.warn('[SynthiaBio Router] Gemini failed/timed out, failing over to Groq:', geminiErr);
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      return await generateWithGroq(pathogen, params);
    } catch (groqErr) {
      console.warn('[SynthiaBio Router] Groq failover also failed, using heuristic:', groqErr);
    }
  }

  return {
    output: generateHeuristicPeptide(pathogen, params),
    provider: 'heuristic',
    model: 'deterministic-motif'
  };
}

function applyClosedLoopRefinement(
  selected: ProviderGenerationResult,
  pathogen: PathogenProfile,
  enabled: boolean
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

  const trajectory = evolvePeptideSequence(selected.output.sequence, pathogen, 2);
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
  return applyClosedLoopRefinement(selected, pathogen, params.autoOptimize !== false);
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
 * Ensures 100% offline uptime and zero-crash guarantee.
 */
export function generateHeuristicPeptide(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): RawAiPeptideOutput {
  const length = params.sequenceLength;
  const motif = ['K', 'W', 'K', 'L', 'F', 'K', 'K', 'I', 'V', 'K', 'L', 'L', 'K', 'S', 'K', 'K', 'V', 'L', 'K', 'R', 'A', 'K', 'I', 'L', 'K', 'Q', 'K', 'L'];
  let seq = '';
  for (let i = 0; i < length; i++) {
    seq += motif[i % motif.length];
  }

  return {
    candidateName: `Synthia-${pathogen.id.toUpperCase()}-Opt${length}`,
    sequence: seq,
    molecularRationale: `Generated using an optimized (i, i+3, i+4) amphipathic alpha-helical repeat. Alternating Lysine (K) residues align along the polar azimuth at 100-degree pitch intervals to destabilize ${pathogen.name} lipid packing while hydrophobic Leu/Ile/Trp residues insert into the hydrocarbon core.`,
    membraneAffinityExplanation: `Targets the ${pathogen.membraneCharacteristics.outerMembraneCharge} mV outer potential of ${pathogen.scientificName} via high polycationic field density, initiating lipid headgroup displacement.`
  };
}
