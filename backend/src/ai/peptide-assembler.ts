import { calculateBiophysicalMetrics, getAminoAcidProfile } from '../bio-engine/calculators';
import { generateAlphaHelixPDB } from '../bio-engine/pdb-generator';
import {
  ClosedLoopOptimizationSummary,
  GeneratedPeptide,
  GenerationSource,
  PathogenProfile,
  PoreMechanism
} from '../types/peptide';
import { RawAiPeptideOutput } from './prompt-utils';
import { analyzeSynthesisFeasibility } from './synthesis-feasibility';

export interface AssemblePeptideInput {
  idSuffix?: string;
  rawAiOutput: RawAiPeptideOutput;
  pathogen: PathogenProfile;
  mechanism: PoreMechanism;
  provider: GenerationSource;
  model: string;
  optimizationSummary?: ClosedLoopOptimizationSummary;
}

/**
 * Shared builder assembling biophysical metrics, .PDB coordinates,
 * FASTA record, and manufacturability-aware Fmoc-SPPS synthesis protocol.
 */
export function assembleGeneratedPeptide(input: AssemblePeptideInput): GeneratedPeptide {
  const { rawAiOutput, pathogen, mechanism, provider, model, optimizationSummary } = input;
  const metrics = calculateBiophysicalMetrics(rawAiOutput.sequence);
  const aminoAcidProfile = getAminoAcidProfile(rawAiOutput.sequence);
  const pdbContent = generateAlphaHelixPDB(rawAiOutput.sequence, rawAiOutput.candidateName);
  const synthesisFeasibility = analyzeSynthesisFeasibility(rawAiOutput.sequence);

  const suffix = input.idSuffix ? `-${input.idSuffix}` : '';
  const hasDoubleCoupling = synthesisFeasibility.liabilities.some(
    (l) => l.code === 'BETA_BRANCHED_CLUSTER' || l.code === 'HYDROPHOBIC_STRETCH'
  );

  return {
    id: `synthia-${Date.now().toString(36)}${suffix}`,
    name: rawAiOutput.candidateName,
    sequence: rawAiOutput.sequence,
    length: rawAiOutput.sequence.length,
    targetPathogen: `${pathogen.name} (${pathogen.scientificName})`,
    mechanism,
    molecularRationale: rawAiOutput.molecularRationale,
    membraneAffinityExplanation: rawAiOutput.membraneAffinityExplanation,
    aiProviderUsed: provider,
    aiModelUsed: model,
    ...(optimizationSummary ? { optimizationSummary } : {}),
    synthesisFeasibility,
    metrics,
    aminoAcidProfile,
    pdbContent,
    fastaContent: `>${rawAiOutput.candidateName} | Target: ${pathogen.name} | Length: ${rawAiOutput.sequence.length}aa | Provider: ${provider}\n${rawAiOutput.sequence}`,
    synthesisProtocol: {
      nTerminalModification: 'Free amine (unblocked) for optimal N-terminal positive dipole',
      cTerminalModification:
        'C-terminal amidation (-CONH2) to neutralize terminal carboxylate and block carboxypeptidases',
      recommendedMethod: hasDoubleCoupling
        ? 'Fmoc-SPPS on low-loading ChemMatrix Rink Amide resin with HATU double-coupling at steric junctions'
        : 'Fmoc solid-phase peptide synthesis (Fmoc-SPPS) with HBTU/DIEA activation',
      purificationTechnique:
        'Preparative RP-HPLC using C18 column (water/acetonitrile with 0.1% TFA gradient) to >=95% purity',
      storageCondition:
        synthesisFeasibility.liabilities.some((l) => l.code === 'OXIDATION_CYS' || l.code === 'OXIDATION_MET')
          ? 'Lyophilized powder under N2/Ar inert atmosphere at -20°C; protect from oxidation and moisture'
          : 'Lyophilized powder at -20°C in desiccated amber container; protect from moisture'
    },
    createdAt: new Date().toISOString()
  };
}
