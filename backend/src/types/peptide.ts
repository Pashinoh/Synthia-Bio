export type PoreMechanism = 'toroidal' | 'barrel-stave' | 'carpet';
export type SafetyThreshold = 'high-selectivity' | 'balanced';
export type HemolysisRisk = 'Low' | 'Moderate' | 'High';
export type GramType = 'positive' | 'negative';
export type WHOPriority = 'Critical' | 'High' | 'Medium';
export type AIProviderPreference = 'auto' | 'gemini' | 'groq' | 'dual';
export type GenerationSource = 'gemini' | 'groq' | 'heuristic';

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
}

export interface BiophysicalMetrics {
  netCharge: number; // e.g. +6.0
  meanHydrophobicity: number; // e.g. 0.42 (Eisenberg scale: -1.42 to +1.38)
  hydrophobicMoment: number; // e.g. 0.58 (> 0.4 is strongly amphipathic)
  isoelectricPoint: number; // pI value, e.g. 10.4
  bomanIndex: number; // in kcal/mol, e.g. 2.1
  aliphaticIndex: number; // Ikai 1980 thermal-stability proxy (X(Ala)+2.9X(Val)+3.9X(Ile+Leu))
  predictedHemolysisRisk: HemolysisRisk;
  therapeuticSelectivityIndex: number; // 0 - 100
  hydrophobicResidueRatio: number; // 0.0 - 1.0 (e.g. 0.45)
  positiveResidueCount: number; // Lys + Arg
}

export interface AminoAcidCount {
  code: string;
  name: string;
  count: number;
  percentage: number;
  category: 'hydrophobic' | 'hydrophilic' | 'positive' | 'negative' | 'neutral';
}

export interface SynthesisProtocol {
  nTerminalModification: string; // e.g. "Free amine (unblocked)"
  cTerminalModification: string; // e.g. "C-terminal amidation (-CONH2) recommended for in vivo stability"
  recommendedMethod: string; // e.g. "Solid-Phase Peptide Synthesis (Fmoc-SPPS)"
  purificationTechnique: string; // e.g. "Reverse-Phase HPLC (RP-HPLC) >95% purity"
  storageCondition: string; // e.g. "Lyophilized powder at -20°C"
}

export interface ClosedLoopOptimizationSummary {
  applied: boolean;
  originalSequence: string;
  originalSelectivity: number;
  originalHemolysisRisk: HemolysisRisk;
  appliedMutations: string[];
  notes: string;
}

export interface GeneratedPeptide {
  id: string;
  name: string;
  sequence: string; // One-letter code, e.g. "KWKLFKKIEKVGQNVRDG"
  length: number;
  targetPathogen: string;
  mechanism: PoreMechanism;
  molecularRationale: string;
  membraneAffinityExplanation: string;
  aiProviderUsed?: GenerationSource;
  aiModelUsed?: string;
  optimizationSummary?: ClosedLoopOptimizationSummary;
  metrics: BiophysicalMetrics;
  aminoAcidProfile: AminoAcidCount[];
  pdbContent: string; // Valid 3D atomic coordinates in PDB format
  fastaContent: string;
  synthesisProtocol: SynthesisProtocol;
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
}

export interface GeneratePeptideResponse {
  success: boolean;
  peptide?: GeneratedPeptide;
  error?: string;
  isMockFallback?: boolean;
}
