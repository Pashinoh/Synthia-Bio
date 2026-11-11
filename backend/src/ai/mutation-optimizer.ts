import { calculateBiophysicalMetrics } from '../bio-engine/calculators';
import { analyzeProteaseStability, ProteaseStabilityReport } from '../validators/protease-shield';
import { BiophysicalMetrics, HemolysisRisk, PathogenProfile } from '../types/peptide';

export interface MutationCandidate {
  position: number; // 1-indexed
  originalResidue: string;
  mutatedResidue: string;
  mutationCode: string; // e.g. "I8K"
  mutatedSequence: string;
  metrics: BiophysicalMetrics;
  proteaseStabilityScore: number;
  improvementDelta: number;
  compositeScoreDelta: number;
  rationale: string;
}

export interface PeptideFitnessEvaluation {
  sequence: string;
  metrics: BiophysicalMetrics;
  protease: ProteaseStabilityReport;
  compositeScore: number;
}

export interface EvolutionTrajectory {
  originalSequence: string;
  finalSequence: string;
  roundsExecuted: number;
  initialMetrics: BiophysicalMetrics;
  finalMetrics: BiophysicalMetrics;
  initialProtease: ProteaseStabilityReport;
  finalProtease: ProteaseStabilityReport;
  initialFitness: number;
  finalFitness: number;
  appliedMutations: string[];
  steps: MutationCandidate[];
}

interface SubstitutionOption {
  aa: string;
  reason: string;
}

const SUBSTITUTION_POOL: SubstitutionOption[] = [
  { aa: 'K', reason: 'Increases cationic charge to boost anionic bacterial membrane selectivity with lower lysis than Arg clusters' },
  { aa: 'R', reason: 'Adds bidentate guanidinium H-bonding to displace LPS divalent cations on Gram-negative outer membranes' },
  { aa: 'A', reason: 'Moderates hydrophobic density to reduce human erythrocyte hemolysis while preserving alpha-helical propensity' },
  { aa: 'S', reason: 'Introduces compact polar hydroxyl group on the hydrophilic face to lower cytotoxicity risk' },
  { aa: 'Q', reason: 'Balances polar amphipathicity via amide H-bonding while softening excessive hydrophobic clustering' },
  { aa: 'L', reason: 'Stabilizes the helical hydrophobic core for effective bilayer partitioning' },
  { aa: 'I', reason: 'Refines beta-branched hydrophobic packing without introducing excessive tryptophan hemolysis' },
  { aa: 'V', reason: 'Tunes moderate hydrophobicity to keep Eisenberg mean hydrophobicity inside the safe window' },
  { aa: 'W', reason: 'Strengthens interfacial lipid bilayer anchoring via indole ring when hydrophobic moment is low' },
  { aa: 'G', reason: 'Relieves local steric strain and adjusts hydrophobic clustering along the helix axis' }
];

const HEMOLYSIS_RANK: Record<HemolysisRisk, number> = {
  Low: 0,
  Moderate: 1,
  High: 2
};

export function sanitizePeptideSequence(sequence: string): string {
  return sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
}

/**
 * Evaluates a peptide sequence using deterministic biophysical metrics,
 * serum protease stability, charge targeting, and sequence-diversity guards.
 */
export function evaluatePeptideFitness(
  sequence: string,
  pathogen?: PathogenProfile
): PeptideFitnessEvaluation {
  const cleanSeq = sanitizePeptideSequence(sequence);
  const metrics = calculateBiophysicalMetrics(cleanSeq);
  const protease = analyzeProteaseStability(cleanSeq);

  let score = metrics.therapeuticSelectivityIndex;

  // Hemolysis safety gradient
  if (metrics.predictedHemolysisRisk === 'Low') score += 20;
  else if (metrics.predictedHemolysisRisk === 'Moderate') score -= 12;
  else score -= 45;

  // Continuous penalty above safe Eisenberg hydrophobicity ceiling (0.42)
  if (metrics.meanHydrophobicity > 0.42) {
    score -= (metrics.meanHydrophobicity - 0.42) * 35;
  }

  // Reward strong amphipathic moment inside ideal [0.42, 0.68] band
  if (metrics.hydrophobicMoment >= 0.42 && metrics.hydrophobicMoment <= 0.68) {
    score += 8;
  } else if (metrics.hydrophobicMoment < 0.38) {
    score -= (0.38 - metrics.hydrophobicMoment) * 30;
  }

  // Pathogen-specific net charge targeting
  const [minCharge, maxCharge] = pathogen?.suggestedChargeRange ?? [4, 8];
  if (metrics.netCharge >= minCharge && metrics.netCharge <= maxCharge) {
    score += 10;
  } else {
    const dist = metrics.netCharge < minCharge ? minCharge - metrics.netCharge : metrics.netCharge - maxCharge;
    score -= dist * 4;
  }

  // Serum protease resistance tie-breaker (from Pas's protease-shield module)
  score += protease.stabilityScore * 0.15;

  // Diversity guard: penalize homopolymer runs (e.g. KKK / WWW) and tandem repeats (KWKWKW)
  if (/(.)\1\1/.test(cleanSeq)) {
    score -= 18;
  }
  const uniqueResidues = new Set(cleanSeq).size;
  const minDesiredUnique = Math.min(6, Math.max(4, Math.floor(cleanSeq.length / 3)));
  if (uniqueResidues < minDesiredUnique) {
    score -= (minDesiredUnique - uniqueResidues) * 12;
  }
  if (/(.{2})\1\1/.test(cleanSeq)) {
    score -= 22;
  }

  return {
    sequence: cleanSeq,
    metrics,
    protease,
    compositeScore: parseFloat(score.toFixed(2))
  };
}

function collectSingleStepMutations(
  cleanSeq: string,
  baseEval: PeptideFitnessEvaluation,
  pathogen?: PathogenProfile
): MutationCandidate[] {
  const candidates: MutationCandidate[] = [];
  const baseHemolysis = HEMOLYSIS_RANK[baseEval.metrics.predictedHemolysisRisk];

  for (let i = 0; i < cleanSeq.length; i++) {
    const orig = cleanSeq[i];
    for (const sub of SUBSTITUTION_POOL) {
      if (orig === sub.aa) continue;

      const mutatedSeq = cleanSeq.slice(0, i) + sub.aa + cleanSeq.slice(i + 1);
      const nextEval = evaluatePeptideFitness(mutatedSeq, pathogen);
      const nextHemolysis = HEMOLYSIS_RANK[nextEval.metrics.predictedHemolysisRisk];

      // Never accept mutations that make erythrocyte toxicity worse
      if (nextHemolysis > baseHemolysis) continue;

      const selectivityDelta =
        nextEval.metrics.therapeuticSelectivityIndex - baseEval.metrics.therapeuticSelectivityIndex;
      const compositeDelta = parseFloat((nextEval.compositeScore - baseEval.compositeScore).toFixed(2));
      const improvedHemolysis = nextHemolysis < baseHemolysis;

      if (compositeDelta > 0.25 || selectivityDelta > 0 || improvedHemolysis) {
        candidates.push({
          position: i + 1,
          originalResidue: orig,
          mutatedResidue: sub.aa,
          mutationCode: `${orig}${i + 1}${sub.aa}`,
          mutatedSequence: mutatedSeq,
          metrics: nextEval.metrics,
          proteaseStabilityScore: nextEval.protease.stabilityScore,
          improvementDelta: selectivityDelta,
          compositeScoreDelta: compositeDelta,
          rationale: improvedHemolysis
            ? `${sub.reason} (reduces predicted hemolysis to ${nextEval.metrics.predictedHemolysisRisk})`
            : sub.reason
        });
      }
    }
  }

  return candidates.sort((a, b) => {
    if (b.compositeScoreDelta !== a.compositeScoreDelta) {
      return b.compositeScoreDelta - a.compositeScoreDelta;
    }
    if (b.improvementDelta !== a.improvementDelta) {
      return b.improvementDelta - a.improvementDelta;
    }
    return b.proteaseStabilityScore - a.proteaseStabilityScore;
  });
}

/**
 * [IRFAN'S MODULE]
 * In-Silico Directed Evolution & Single-Point Mutation Scanner.
 * Scans residue substitutions to maximize Therapeutic Selectivity Index,
 * lower human erythrocyte hemolysis, and respect serum protease stability.
 */
export function scanBeneficialMutations(
  sequence: string,
  pathogen?: PathogenProfile
): MutationCandidate[] {
  const cleanSeq = sanitizePeptideSequence(sequence);
  if (!cleanSeq) {
    throw new Error('Sequence must contain at least one valid amino acid residue');
  }

  const baseEval = evaluatePeptideFitness(cleanSeq, pathogen);
  return collectSingleStepMutations(cleanSeq, baseEval, pathogen).slice(0, 5);
}

/**
 * Multi-round in-silico directed evolution (beam depth 1 greedy hill-climbing with safety locks).
 * Iteratively applies non-redundant residue substitutions up to `maxRounds`
 * until biophysical selectivity, hemolysis safety, and pathogen charge targets converge.
 */
export function evolvePeptideSequence(
  sequence: string,
  pathogen?: PathogenProfile,
  maxRounds = 3
): EvolutionTrajectory {
  const cleanSeq = sanitizePeptideSequence(sequence);
  if (!cleanSeq) {
    throw new Error('Sequence must contain at least one valid amino acid residue');
  }

  const initialEval = evaluatePeptideFitness(cleanSeq, pathogen);
  let currentSeq = cleanSeq;
  let currentEval = initialEval;
  const mutatedPositions = new Set<number>();
  const steps: MutationCandidate[] = [];

  const boundedRounds = Math.max(1, Math.min(5, maxRounds));

  for (let round = 0; round < boundedRounds; round++) {
    const candidates = collectSingleStepMutations(currentSeq, currentEval, pathogen).filter(
      (c) => !mutatedPositions.has(c.position)
    );

    if (candidates.length === 0) break;

    const best = candidates[0];
    if (best.compositeScoreDelta <= 0.5 && best.improvementDelta <= 0) break;

    mutatedPositions.add(best.position);
    steps.push(best);
    currentSeq = best.mutatedSequence;
    currentEval = evaluatePeptideFitness(currentSeq, pathogen);
  }

  return {
    originalSequence: cleanSeq,
    finalSequence: currentSeq,
    roundsExecuted: steps.length,
    initialMetrics: initialEval.metrics,
    finalMetrics: currentEval.metrics,
    initialProtease: initialEval.protease,
    finalProtease: currentEval.protease,
    initialFitness: initialEval.compositeScore,
    finalFitness: currentEval.compositeScore,
    appliedMutations: steps.map((s) => s.mutationCode),
    steps
  };
}
