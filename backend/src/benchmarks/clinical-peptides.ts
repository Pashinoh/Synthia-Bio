import { calculateBiophysicalMetrics } from '../bio-engine/calculators';
import { analyzeProteaseStability } from '../validators/protease-shield';
import { BiophysicalMetrics, HemolysisRisk } from '../types/peptide';

export interface ClinicalReferencePeptide {
  id: string;
  name: string;
  origin: string;
  sequence: string;
  clinicalStatus: string;
  knownLimitation: string;
  metrics: BiophysicalMetrics;
  proteaseStabilityScore: number;
}

export interface BenchmarkDeltaEntry {
  referenceId: string;
  referenceName: string;
  referenceStatus: string;
  referenceMetrics: BiophysicalMetrics;
  referenceProteaseScore: number;
  selectivityDelta: number;
  hydrophobicityDelta: number;
  hydrophobicMomentDelta: number;
  proteaseStabilityDelta: number;
  lengthDelta: number;
  hemolysisComparison: string;
}

export interface BenchmarkComparisonReport {
  candidateName: string;
  sequence: string;
  length: number;
  candidateMetrics: BiophysicalMetrics;
  candidateProteaseScore: number;
  comparisons: BenchmarkDeltaEntry[];
  overallVerdict: string;
}

const HEMOLYSIS_SEVERITY: Record<HemolysisRisk, number> = {
  Low: 0,
  Moderate: 1,
  High: 2
};

const RAW_REFERENCES = [
  {
    id: 'pexiganan-msi78',
    name: 'Pexiganan (MSI-78)',
    origin: 'Synthetic Magainin-2 analog',
    sequence: 'GIGKFLKKAKKFGKAFVKILKK',
    clinicalStatus: 'Phase III Clinical Trials (Topical Diabetic Foot Ulcer Infections)',
    knownLimitation: 'Narrow systemic therapeutic window; topical formulation preferred'
  },
  {
    id: 'magainin-2',
    name: 'Magainin-2',
    origin: 'Xenopus laevis (African Clawed Frog skin)',
    sequence: 'GIGKFLHSAKKFGKAFVGEIMNS',
    clinicalStatus: 'Preclinical / Classic Amphipathic Alpha-Helical Lead',
    knownLimitation: 'Moderate cationic charge and susceptible to serum proteases'
  },
  {
    id: 'll-37',
    name: 'LL-37 (Cathelicidin)',
    origin: 'Human Innate Immune System',
    sequence: 'LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES',
    clinicalStatus: 'Endogenous Human Host Defense Peptide',
    knownLimitation: 'Long sequence (37 aa) increases solid-phase synthesis cost and serum binding'
  },
  {
    id: 'melittin',
    name: 'Melittin (Toxicity Control)',
    origin: 'Apis mellifera (Bee Venom)',
    sequence: 'GIGAVLKVLTTGLPALISWIKRKRQQ',
    clinicalStatus: 'Positive Control for Non-Selective Membrane Lysis',
    knownLimitation: 'Severe human erythrocyte hemolysis (High toxicity)'
  }
];

/**
 * [IRFAN'S MODULE]
 * Returns biophysical & protease metrics for gold-standard clinical AMP references.
 */
export function getClinicalBenchmarks(): ClinicalReferencePeptide[] {
  return RAW_REFERENCES.map((ref) => ({
    ...ref,
    metrics: calculateBiophysicalMetrics(ref.sequence),
    proteaseStabilityScore: analyzeProteaseStability(ref.sequence).stabilityScore
  }));
}

/**
 * Compares an AI-generated or user-submitted peptide against clinical AMP benchmarks.
 */
export function compareAgainstBenchmarks(
  sequence: string,
  candidateName = 'SynthiaBio Candidate'
): BenchmarkComparisonReport {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  const candidateMetrics = calculateBiophysicalMetrics(cleanSeq);
  const candidateProteaseScore = analyzeProteaseStability(cleanSeq).stabilityScore;
  const benchmarks = getClinicalBenchmarks();

  const candidateRisk = HEMOLYSIS_SEVERITY[candidateMetrics.predictedHemolysisRisk];

  const comparisons: BenchmarkDeltaEntry[] = benchmarks.map((ref) => {
    const refRisk = HEMOLYSIS_SEVERITY[ref.metrics.predictedHemolysisRisk];
    let hemolysisComparison = `Matched (${candidateMetrics.predictedHemolysisRisk} vs ${ref.metrics.predictedHemolysisRisk})`;
    if (candidateRisk < refRisk) {
      hemolysisComparison = `Safer (${candidateMetrics.predictedHemolysisRisk} vs ${ref.metrics.predictedHemolysisRisk})`;
    } else if (candidateRisk > refRisk) {
      hemolysisComparison = `Higher risk (${candidateMetrics.predictedHemolysisRisk} vs ${ref.metrics.predictedHemolysisRisk})`;
    }

    return {
      referenceId: ref.id,
      referenceName: ref.name,
      referenceStatus: ref.clinicalStatus,
      referenceMetrics: ref.metrics,
      referenceProteaseScore: ref.proteaseStabilityScore,
      selectivityDelta: candidateMetrics.therapeuticSelectivityIndex - ref.metrics.therapeuticSelectivityIndex,
      hydrophobicityDelta: parseFloat(
        (candidateMetrics.meanHydrophobicity - ref.metrics.meanHydrophobicity).toFixed(3)
      ),
      hydrophobicMomentDelta: parseFloat(
        (candidateMetrics.hydrophobicMoment - ref.metrics.hydrophobicMoment).toFixed(3)
      ),
      proteaseStabilityDelta: candidateProteaseScore - ref.proteaseStabilityScore,
      lengthDelta: cleanSeq.length - ref.sequence.length,
      hemolysisComparison
    };
  });

  const pexiganan = comparisons.find((c) => c.referenceId === 'pexiganan-msi78');
  const melittin = comparisons.find((c) => c.referenceId === 'melittin');

  const pexNote = pexiganan
    ? `Selectivity vs Pexiganan: ${pexiganan.selectivityDelta >= 0 ? '+' : ''}${pexiganan.selectivityDelta} pts.`
    : '';
  const melNote = melittin
    ? `Toxicity margin vs Melittin: ${melittin.selectivityDelta >= 0 ? '+' : ''}${melittin.selectivityDelta} pts (${melittin.hemolysisComparison}).`
    : '';

  const overallVerdict = `${candidateName} (${cleanSeq.length}aa, charge ${candidateMetrics.netCharge >= 0 ? '+' : ''}${candidateMetrics.netCharge}, hemolysis ${candidateMetrics.predictedHemolysisRisk}, selectivity ${candidateMetrics.therapeuticSelectivityIndex}/100). ${pexNote} ${melNote}`.trim();

  return {
    candidateName,
    sequence: cleanSeq,
    length: cleanSeq.length,
    candidateMetrics,
    candidateProteaseScore,
    comparisons,
    overallVerdict
  };
}
