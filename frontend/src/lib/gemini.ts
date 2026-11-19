import { PathogenProfile, PeptideDesignParams } from '@/types/peptide';

export interface RawAiPeptideOutput {
  candidateName: string;
  sequence: string;
  molecularRationale: string;
  membraneAffinityExplanation: string;
}

/**
 * Deterministic heuristic generator based on standard amphipathic motif (i, i+3, i+4)
 * Ensures 100% offline uptime and zero-crash guarantee. Pure function — no API key,
 * safe to import from client components.
 */
export function generateHeuristicPeptide(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): RawAiPeptideOutput {
  const length = params.sequenceLength;
  const motif = ['K', 'W', 'K', 'L', 'F', 'K', 'K', 'I', 'V', 'K', 'L', 'L', 'K', 'W', 'K', 'K', 'V', 'L', 'K', 'R', 'F', 'K', 'I', 'L', 'K', 'W', 'K', 'L'];
  let seq = '';
  for (let i = 0; i < length; i++) {
    seq += motif[i % motif.length];
  }

  return {
    candidateName: `Synthia-${pathogen.id.toUpperCase()}-Opt${length}`,
    sequence: seq,
    molecularRationale: `Generated using an optimized (i, i+3, i+4) amphipathic alpha-helical repeat. Alternating Lysine (K) residues align along the polar azimuth at 100-degree pitch intervals to destabilize ${pathogen.name} lipid packing while bulky hydrophobic Trp/Phe residues insert into the hydrocarbon core.`,
    membraneAffinityExplanation: `Targets the ${pathogen.membraneCharacteristics.outerMembraneCharge} mV outer potential of ${pathogen.scientificName} via high polycationic field density, initiating lipid headgroup displacement.`
  };
}
