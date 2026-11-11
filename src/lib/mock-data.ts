import { GeneratedPeptide } from '@/types/peptide';
import { calculateBiophysicalMetrics, getAminoAcidProfile } from './bio-engine/calculators';
import { generateAlphaHelixPDB } from './bio-engine/pdb-generator';

const MOCK_SEQUENCE = 'KWKLFKKIEKVGQNVRDG';
const metrics = calculateBiophysicalMetrics(MOCK_SEQUENCE);
const aminoAcidProfile = getAminoAcidProfile(MOCK_SEQUENCE);
const pdbContent = generateAlphaHelixPDB(MOCK_SEQUENCE, 'SYNTHIA-MRSA-1');

export const MOCK_GENERATED_PEPTIDE: GeneratedPeptide = {
  id: 'synthia-mock-001',
  name: 'Synthia-MRSA-Alpha1',
  sequence: MOCK_SEQUENCE,
  length: MOCK_SEQUENCE.length,
  targetPathogen: 'MRSA (Methicillin-resistant S. aureus)',
  mechanism: 'toroidal',
  molecularRationale:
    'Engineered with an amphipathic alpha-helical partition: alternating cationic Lysine (K) residues align along the electrostatic face to displace divalent cations on teichoic acids, while hydrophobic Leucine (L), Tryptophan (W), and Valine (V) residues embed deeply into the hydrophobic lipid bilayer core to trigger toroidal pore formation.',
  membraneAffinityExplanation:
    'The calculated net charge of +5.1 provides rapid attraction to the negative -32 mV surface potential of MRSA, while a moderate hydrophobic moment (0.48) ensures minimal hemolytic damage to mammalian erythrocytes.',
  metrics,
  aminoAcidProfile,
  pdbContent,
  fastaContent: `>Synthia-MRSA-Alpha1 | De Novo Antimicrobial Peptide | Target: MRSA\n${MOCK_SEQUENCE}`,
  synthesisProtocol: {
    nTerminalModification: 'Free amine (unblocked) for optimal positive charge',
    cTerminalModification: 'C-terminal carboxamide (-CONH2) to enhance biological stability against exopeptidases',
    recommendedMethod: 'Fmoc solid-phase peptide synthesis (Fmoc-SPPS) on Rink Amide resin',
    purificationTechnique: 'Preparative RP-HPLC on C18 column (gradient 10-60% acetonitrile with 0.1% TFA) to >95% purity',
    storageCondition: 'Lyophilized solid at -20°C in desiccated amber vials; reconstitute in sterile deionized water or 0.01% acetic acid'
  },
  createdAt: new Date().toISOString()
};
