export type PoreMechanism = 'toroidal' | 'barrel-stave' | 'carpet';
export type SafetyThreshold = 'high-selectivity' | 'balanced';
export type HemolysisRisk = 'Low' | 'Moderate' | 'High';
export type GramType = 'positive' | 'negative';
export type WHOPriority = 'Critical' | 'High' | 'Medium';
export type AIProviderPreference = 'auto' | 'gemini' | 'groq' | 'dual';
export type GenerationSource = 'gemini' | 'groq' | 'heuristic';
export type GenerationMode = 'single' | 'batch';

export interface PathogenProfile {
  id: string;
  name: string;
  scientificName: string;
  gramType: GramType;
  whoPriority: WHOPriority;
  targetDiseases: string;
  membraneCharacteristics: {
    outerMembraneCharge: number; // in -mV, e.g. -35
    pgLipidRatio: number; // Phosphatidylglycerol percentage
    barrierDescription: string;
  };
  recommendedLength: [number, number]; // e.g. [14, 22]
  suggestedChargeRange: [number, number]; // e.g. [+5, +8]
}

export interface PeptideDesignParams {
  pathogenId: string;
  customPathogenName?: string;
  sequenceLength: number; // 12 - 28
  poreMechanism: PoreMechanism;
  safetyThreshold: SafetyThreshold;
  provider?: AIProviderPreference;
  autoOptimize?: boolean;
  lockedMotif?: string;
}

export interface BiophysicalMetrics {
  netCharge: number; // e.g. +6.0
  meanHydrophobicity: number; // e.g. 0.42 (Eisenberg scale: -1.42 to +1.38)
  hydrophobicMoment: number; // e.g. 0.58 (> 0.4 is strongly amphipathic)
  isoelectricPoint: number; // pI value, e.g. 10.4
  bomanIndex: number; // in kcal/mol, e.g. 2.1
  aliphaticIndex?: number; // Ikai 1980 thermal-stability proxy
  predictedHemolysisRisk: HemolysisRisk;
  therapeuticSelectivityIndex: number; // 0 - 100
  hydrophobicResidueRatio: number; // 0.0 - 1.0 (e.g. 0.45)
  positiveResidueCount: number; // Lys + Arg
}

// [Phase 2] Charge-vs-pH titration curve types
export interface ChargePhPoint {
  ph: number; // sampled pH value
  charge: number; // net charge (Henderson-Hasselbalch model)
}

export interface ChargePhCurve {
  points: ChargePhPoint[];
  isoelectricPoint: number;
}

// [Phase 2] Protease stability types
export interface CleavageSite {
  position: number;
  enzyme: 'Trypsin' | 'Chymotrypsin' | 'Elastase';
  motif: string;
  mitigationAdvice: string;
}

export interface ProteaseStabilityReport {
  stabilityScore: number; // 0 - 100
  estimatedHalfLifeMinutes: number;
  cleavageSites: CleavageSite[];
  stabilizationStrategies: string[];
}

// [Phase 2] Helical wheel types
export interface HelicalWheelNode {
  position: number;
  residue: string;
  fullName: string;
  angleDeg: number;
  x: number;
  y: number;
  category: 'hydrophobic' | 'hydrophilic' | 'positive' | 'negative' | 'neutral';
  hydrophobicity: number;
}

export interface HelicalWheelProjection {
  nodes: HelicalWheelNode[];
  momentVector: {
    magnitude: number;
    angleDeg: number;
    dx: number;
    dy: number;
  };
  amphipathicFaceQuality: 'Strong Partition' | 'Moderate Partition' | 'Mixed/Weak';
}

// [Phase 2] Synthesis feasibility types
export interface SynthesisFeasibility {
  feasibilityScore: number;
  sppsDifficulty: string;
  aqueousSolubility: string;
  hydrophobicFraction: number;
  chargedFraction: number;
  liabilities: Array<string | { description: string; mitigation?: string }>;
  recommendedMitigations: string[];
}

// [Phase 2] Deterministic In-Silico Pass/Fail Lab Readiness Gates
export type InSilicoGateId =
  | 'CHARGE_TARGET'
  | 'HEMOLYSIS_SAFETY'
  | 'AMPHIPATHIC_PARTITION'
  | 'PROTEASE_RESILIENCE'
  | 'SPPS_MANUFACTURABILITY';

export interface InSilicoGateResult {
  id: InSilicoGateId;
  label: string;
  passed: boolean;
  observed: string;
  threshold: string;
}

export interface InSilicoGateSummary {
  overallStatus: 'PASS' | 'REVIEW' | 'FAIL';
  passedCount: number;
  totalGates: number;
  passRate: number;
  rewardScore: number;
  gates: InSilicoGateResult[];
}

export interface AminoAcidCount {
  code: string;
  name: string;
  count: number;
  percentage: number;
  category: 'hydrophobic' | 'hydrophilic' | 'positive' | 'negative' | 'neutral';
}

export interface SynthesisProtocol {
  nTerminalModification: string;
  cTerminalModification: string;
  recommendedMethod: string;
  purificationTechnique: string;
  storageCondition: string;
}

export interface GeneratedPeptide {
  id: string;
  name: string;
  sequence: string;
  length: number;
  targetPathogen: string;
  mechanism: PoreMechanism;
  molecularRationale: string;
  membraneAffinityExplanation: string;
  aiProviderUsed?: GenerationSource;
  aiModelUsed?: string;
  optimizationSummary?: {
    applied: boolean;
    originalSequence: string;
    originalSelectivity: number;
    originalHemolysisRisk: HemolysisRisk;
    appliedMutations: string[];
    notes: string;
  };
  inSilicoGates?: InSilicoGateSummary;
  metrics: BiophysicalMetrics;
  aminoAcidProfile: AminoAcidCount[];
  pdbContent: string;
  cifContent?: string;
  fastaContent: string;
  synthesisProtocol: SynthesisProtocol;
  synthesisFeasibility?: SynthesisFeasibility;
  createdAt: string;
}

export interface GeneratePeptideRequest {
  pathogenId: string;
  sequenceLength: number;
  poreMechanism: PoreMechanism;
  safetyThreshold: SafetyThreshold;
  customPathogenName?: string;
  provider?: AIProviderPreference;
  autoOptimize?: boolean;
  lockedMotif?: string;
}

export interface GeneratePeptideResponse {
  success: boolean;
  peptide?: GeneratedPeptide;
  error?: string;
  isMockFallback?: boolean;
}

export interface ScreenedPeptideCandidate {
  rank: number;
  compositeFitness: number;
  proteaseStabilityScore: number;
  estimatedHalfLifeMinutes: number;
  selectivityVsPexiganan: number | null;
  selectivityVsMelittin: number | null;
  tradeoffSummary: string;
  peptide: GeneratedPeptide;
}

export interface GenerateBatchResponse {
  success: boolean;
  targetPathogen: string;
  candidateCount: number;
  bestCandidate?: ScreenedPeptideCandidate;
  candidates: ScreenedPeptideCandidate[];
  error?: string;
  isMockFallback?: boolean;
}

export interface MutationCandidate {
  position: number;
  originalResidue: string;
  mutatedResidue: string;
  mutationCode: string;
  mutatedSequence: string;
  metrics: BiophysicalMetrics;
  proteaseStabilityScore: number;
  improvementDelta: number;
  compositeScoreDelta: number;
  rationale: string;
}

export interface EvolutionTrajectory {
  originalSequence: string;
  finalSequence: string;
  roundsExecuted: number;
  lockedPositions?: number[];
  initialMetrics: BiophysicalMetrics;
  finalMetrics: BiophysicalMetrics;
  initialProtease: ProteaseStabilityReport;
  finalProtease: ProteaseStabilityReport;
  initialFitness: number;
  finalFitness: number;
  appliedMutations: string[];
  steps: MutationCandidate[];
}

export interface OptimizePeptideResponse {
  success: boolean;
  originalSequence: string;
  targetPathogenId: string | null;
  lockedPositions?: number[];
  baseMetrics: BiophysicalMetrics;
  recommendedMutations: MutationCandidate[];
  evolutionTrajectory: EvolutionTrajectory;
  error?: string;
}

export interface BenchmarkComparisonItem {
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
  comparisons: BenchmarkComparisonItem[];
  overallVerdict: string;
}

export interface CompareBenchmarksResponse {
  success: boolean;
  report: BenchmarkComparisonReport;
  error?: string;
}
