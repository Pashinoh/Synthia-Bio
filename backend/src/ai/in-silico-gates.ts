import {
  BiophysicalMetrics,
  InSilicoGateResult,
  InSilicoGateSummary,
  PathogenProfile,
  SynthesisFeasibilityReport
} from '../types/peptide';
import { ProteaseStabilityReport } from '../validators/protease-shield';

const HEMOLYSIS_REWARD: Record<BiophysicalMetrics['predictedHemolysisRisk'], number> = {
  Low: 1.0,
  Moderate: 0.45,
  High: 0.0
};

export interface GateEvaluationInput {
  metrics: BiophysicalMetrics;
  protease: ProteaseStabilityReport;
  synthesisFeasibility: SynthesisFeasibilityReport;
  pathogen?: PathogenProfile;
}

/**
 * Evaluates a candidate AMP against deterministic binary in-silico lab gates
 * and computes a normalized multi-objective reward score (0-100).
 */
export function evaluateInSilicoGates(input: GateEvaluationInput): InSilicoGateSummary {
  const { metrics, protease, synthesisFeasibility, pathogen } = input;
  const [minCharge, maxCharge] = pathogen?.suggestedChargeRange ?? [4, 8];

  const gates: InSilicoGateResult[] = [
    {
      id: 'CHARGE_TARGET',
      label: 'Pathogen Cationic Charge Window',
      passed: metrics.netCharge >= minCharge && metrics.netCharge <= maxCharge,
      observed: `+${metrics.netCharge}`,
      threshold: `+${minCharge} to +${maxCharge}`
    },
    {
      id: 'HEMOLYSIS_SAFETY',
      label: 'Human Erythrocyte Safety',
      passed: metrics.predictedHemolysisRisk === 'Low',
      observed: metrics.predictedHemolysisRisk,
      threshold: 'Low Risk'
    },
    {
      id: 'AMPHIPATHIC_PARTITION',
      label: 'Amphipathic Helical Partition',
      passed: metrics.hydrophobicMoment >= 0.4 && metrics.meanHydrophobicity <= 0.45,
      observed: `muH ${metrics.hydrophobicMoment} | H ${metrics.meanHydrophobicity}`,
      threshold: 'muH >= 0.40 & Mean H <= 0.45'
    },
    {
      id: 'PROTEASE_RESILIENCE',
      label: 'Serum Protease Stability',
      passed: protease.stabilityScore >= 35,
      observed: `${protease.stabilityScore}/100 (~${protease.estimatedHalfLifeMinutes} min)`,
      threshold: '>= 35/100'
    },
    {
      id: 'SPPS_MANUFACTURABILITY',
      label: 'Fmoc-SPPS Lab Feasibility & Solubility',
      passed:
        synthesisFeasibility.feasibilityScore >= 70 &&
        synthesisFeasibility.aqueousSolubility !== 'Low',
      observed: `${synthesisFeasibility.feasibilityScore}/100 (${synthesisFeasibility.aqueousSolubility})`,
      threshold: '>= 70/100 & Soluble'
    }
  ];

  const passedCount = gates.filter((g) => g.passed).length;
  const totalGates = gates.length;
  const passRate = parseFloat((passedCount / totalGates).toFixed(2));

  // Normalized scalar reward combining selectivity, safety, amphipathicity, protease shield, and SPPS
  const weightedReward =
    (metrics.therapeuticSelectivityIndex / 100) * 0.3 +
    HEMOLYSIS_REWARD[metrics.predictedHemolysisRisk] * 0.25 +
    Math.min(1, metrics.hydrophobicMoment / 0.65) * 0.15 +
    Math.min(1, protease.stabilityScore / 80) * 0.15 +
    (synthesisFeasibility.feasibilityScore / 100) * 0.15;

  const rewardScore = Math.round(Math.max(0, Math.min(100, weightedReward * 100)));

  let overallStatus: InSilicoGateSummary['overallStatus'] = 'REVIEW';
  if (metrics.predictedHemolysisRisk === 'High' || passedCount <= 2) {
    overallStatus = 'FAIL';
  } else if (passedCount === totalGates || (passedCount >= 4 && metrics.predictedHemolysisRisk === 'Low')) {
    overallStatus = 'PASS';
  }

  return {
    overallStatus,
    passedCount,
    totalGates,
    passRate,
    rewardScore,
    gates
  };
}
