import { GeneratedPeptide } from '@/types/peptide';
import { calculateBiophysicalMetrics, getAminoAcidProfile } from './bio-engine/calculators';
import { generateAlphaHelixPDB } from './bio-engine/pdb-generator';

const MOCK_SEQUENCE = 'KWKLFKKIEKVGQNVRDG';
const metrics = calculateBiophysicalMetrics(MOCK_SEQUENCE);
const aminoAcidProfile = getAminoAcidProfile(MOCK_SEQUENCE);
const pdbContent = generateAlphaHelixPDB(MOCK_SEQUENCE, 'CECROPIA-I15V-REF');

export const MOCK_GENERATED_PEPTIDE: GeneratedPeptide = {
  id: 'synthia-ref-cecropin-a',
  name: 'Cecropin A (I15V Ref)',
  sequence: MOCK_SEQUENCE,
  length: MOCK_SEQUENCE.length,
  targetPathogen: 'MRSA (Reference Control · Cecropin A fragment I15V)',
  mechanism: 'toroidal',
  molecularRationale:
    'Reference control: N-terminal Cecropin A (1-18) fragment with an Ile15->Val substitution. Alternating cationic Lysine (K) residues align along one face of the alpha-helix while hydrophobic Trp/Leu/Phe/Val residues partition into bacterial lipid bilayers.',
  membraneAffinityExplanation:
    `Reference benchmark profile showing net charge +${metrics.netCharge} and hydrophobic moment ${metrics.hydrophobicMoment} against anionic bacterial envelopes (-32 mV), serving as the baseline before running de novo AI synthesis.`,
  aiProviderUsed: 'heuristic',
  metrics,
  aminoAcidProfile,
  pdbContent,
  fastaContent: `>Cecropin_A_I15V_Ref | Reference control: Cecropin A fragment (I15V) | Target: MRSA\n${MOCK_SEQUENCE}`,
  synthesisProtocol: {
    nTerminalModification: 'Free amine (unblocked) for optimal positive charge',
    cTerminalModification: 'C-terminal carboxamide (-CONH2) to enhance biological stability against exopeptidases',
    recommendedMethod: 'Fmoc solid-phase peptide synthesis (Fmoc-SPPS) on Rink Amide resin',
    purificationTechnique: 'Preparative RP-HPLC on C18 column (gradient 10-60% acetonitrile with 0.1% TFA) to >95% purity',
    storageCondition: 'Lyophilized solid at -20°C in desiccated amber vials; reconstitute in sterile deionized water or 0.01% acetic acid'
  },
  createdAt: '2026-11-12T00:00:00.000Z'
};
