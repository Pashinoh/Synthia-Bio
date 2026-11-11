import { PathogenProfile, PeptideDesignParams } from '../types/peptide';

export interface RawAiPeptideOutput {
  candidateName: string;
  sequence: string;
  molecularRationale: string;
  membraneAffinityExplanation: string;
}

export const AMP_SYSTEM_INSTRUCTION = `You are SynthiaBio, an expert computational biochemist and peptide engineer.
Design a novel, de novo amphipathic alpha-helical antimicrobial peptide (AMP) optimized for the target bacterial pathogen.

BIOPHYSICAL DESIGN CONSTRAINTS (CRITICAL):
1. Amino acid alphabet ONLY: A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y.
2. Exact sequence length matching the user request.
3. Ideal Cationic Net Charge at pH 7.4: +4 to +8 (enriched in Lysine 'K' and Arginine 'R').
4. Amphipathicity (i, i+3, i+4 helical wheel periodicity): Cluster hydrophobic residues (L, I, V, F, W) on one face of the helix and polar/cationic residues (K, R, S, Q) on the opposite face.
5. Do NOT output simplistic dipeptide or homopolymer repeats (avoid patterns like KWKWKW or KKKKKK); use biologically diverse amphipathic motifs.
6. Avoid excessive global hydrophobicity (>0.50 on Eisenberg scale) to minimize human red blood cell lysis (hemolysis).
7. Return STRICTLY valid raw JSON matching this schema without markdown formatting:
{
  "candidateName": "string (e.g., Synthia-MRSA-X1)",
  "sequence": "string (uppercase 1-letter codes ONLY, exact requested length)",
  "molecularRationale": "string (2-3 scientific sentences explaining amphipathic structure & pore mechanism)",
  "membraneAffinityExplanation": "string (2-3 scientific sentences explaining electrostatic binding to target pathogen lipids)"
}`;

export function buildPeptidePrompt(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): string {
  const safetyNote =
    params.safetyThreshold === 'high-selectivity'
      ? 'STRICT SAFETY REQUIREMENT: Optimize for very low mammalian hemolysis risk (keep mean Eisenberg hydrophobicity < 0.38, include balancing polar/moderate residues like S, Q, or A).'
      : 'Balanced selectivity and potent antimicrobial membrane disruption.';

  return `Design a ${params.sequenceLength}-amino acid antimicrobial peptide targeting:
- Pathogen: ${pathogen.name} (${pathogen.scientificName}) [WHO Priority: ${pathogen.whoPriority}]
- Gram Type: Gram-${pathogen.gramType}
- Membrane Profile: ${pathogen.membraneCharacteristics.barrierDescription} (Surface Potential: ${pathogen.membraneCharacteristics.outerMembraneCharge} mV, Anionic PG Lipids: ${pathogen.membraneCharacteristics.pgLipidRatio}%)
- Recommended Net Charge Range: +${pathogen.suggestedChargeRange[0]} to +${pathogen.suggestedChargeRange[1]}
- Target Pore Mechanism: ${params.poreMechanism} pore formation
- Safety Profile: ${safetyNote}

Respond ONLY with raw valid JSON. Do not wrap in markdown quotes.`;
}

/**
 * Adjusts peptide sequence length while maintaining an amphipathic helical repeat.
 */
export function adjustSequenceLength(seq: string, targetLength: number): string {
  if (seq.length > targetLength) {
    return seq.slice(0, targetLength);
  }
  const amphipathicTail = ['K', 'I', 'L', 'A', 'K', 'S', 'L', 'K', 'V', 'Q', 'K', 'L'];
  let result = seq;
  let i = 0;
  while (result.length < targetLength) {
    result += amphipathicTail[i % amphipathicTail.length];
    i++;
  }
  return result;
}

export function normalizeAiPeptideOutput(
  rawText: string,
  pathogen: PathogenProfile,
  targetLength: number
): RawAiPeptideOutput {
  const cleanJson = rawText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleanJson) as Partial<RawAiPeptideOutput>;

  let seq = (parsed.sequence || '').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  if (!seq) {
    throw new Error('Model returned JSON without a valid amino acid sequence');
  }
  if (seq.length !== targetLength) {
    seq = adjustSequenceLength(seq, targetLength);
  }

  return {
    candidateName: parsed.candidateName?.trim() || `Synthia-${pathogen.id.toUpperCase()}-1`,
    sequence: seq,
    molecularRationale:
      parsed.molecularRationale?.trim() ||
      'Engineered amphipathic alpha-helix optimized for bacterial membrane penetration.',
    membraneAffinityExplanation:
      parsed.membraneAffinityExplanation?.trim() ||
      `Electrostatic binding to negative membrane charge of ${pathogen.name}.`
  };
}
