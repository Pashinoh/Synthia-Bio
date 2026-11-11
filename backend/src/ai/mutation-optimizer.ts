import { calculateBiophysicalMetrics } from '../bio-engine/calculators';
import { BiophysicalMetrics } from '../types/peptide';

export interface MutationCandidate {
  position: number; // 1-indexed
  originalResidue: string;
  mutatedResidue: string;
  mutationCode: string; // e.g. "I8K"
  mutatedSequence: string;
  metrics: BiophysicalMetrics;
  improvementDelta: number;
  rationale: string;
}

/**
 * [IRFAN'S MODULE]
 * In-Silico Directed Evolution & Single-Point Mutation Scanner.
 * Scans single-residue substitutions to maximize Therapeutic Selectivity Index
 * and reduce human erythrocyte hemolysis without requiring heavy ML training.
 */
export function scanBeneficialMutations(sequence: string): MutationCandidate[] {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  const baseMetrics = calculateBiophysicalMetrics(cleanSeq);
  const candidates: MutationCandidate[] = [];

  const substitutionPool = [
    { aa: 'K', reason: 'Increases cationic net charge to boost bacterial membrane selectivity' },
    { aa: 'R', reason: 'Adds bidentate guanidinium H-bonding with anionic phosphate headgroups' },
    { aa: 'A', reason: 'Moderates excessive hydrophobic moment to lower human erythrocyte hemolysis' },
    { aa: 'W', reason: 'Enhances interfacial lipid bilayer anchoring via indole ring' }
  ];

  for (let i = 0; i < cleanSeq.length; i++) {
    const orig = cleanSeq[i];
    for (const sub of substitutionPool) {
      if (orig === sub.aa) continue;

      const mutatedSeq = cleanSeq.slice(0, i) + sub.aa + cleanSeq.slice(i + 1);
      const newMetrics = calculateBiophysicalMetrics(mutatedSeq);
      const delta = newMetrics.therapeuticSelectivityIndex - baseMetrics.therapeuticSelectivityIndex;

      if (delta > 0 || (baseMetrics.predictedHemolysisRisk !== 'Low' && newMetrics.predictedHemolysisRisk === 'Low')) {
        candidates.push({
          position: i + 1,
          originalResidue: orig,
          mutatedResidue: sub.aa,
          mutationCode: `${orig}${i + 1}${sub.aa}`,
          mutatedSequence: mutatedSeq,
          metrics: newMetrics,
          improvementDelta: delta,
          rationale: sub.reason
        });
      }
    }
  }

  return candidates
    .sort((a, b) => b.metrics.therapeuticSelectivityIndex - a.metrics.therapeuticSelectivityIndex)
    .slice(0, 5);
}
