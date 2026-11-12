import { PathogenProfile, PeptideDesignParams } from '../types/peptide';

export interface RawAiPeptideOutput {
  candidateName: string;
  sequence: string;
  molecularRationale: string;
  membraneAffinityExplanation: string;
}

export const AMP_SYSTEM_INSTRUCTION = `You are SynthiaBio, a computational peptide engineer. Design a de novo amphipathic alpha-helical antimicrobial peptide (AMP).
RULES:
1. Standard 20 uppercase amino acids ONLY (ACDEFGHIKLMNPQRSTVWY), exact requested length.
2. Net charge +4 to +9 at pH 7.4 (use K, R).
3. Amphipathic (i, i+3, i+4) spacing: hydrophobic face (L,I,V,F,W,A) opposite polar/cationic face (K,R,S,Q,N,G).
4. NEVER use homopolymers (KKK, LLL) or tandem repeats (KWKWKW, GAVGAVGAV). Use at least 6 distinct amino acids.
5. Keep mean Eisenberg hydrophobicity < 0.40 to avoid human erythrocyte hemolysis.
6. Reply ONLY valid raw JSON:
{"candidateName":"string","sequence":"string","molecularRationale":"2 concise sentences","membraneAffinityExplanation":"2 concise sentences"}`;

export function buildPeptidePrompt(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): string {
  return `Design a ${params.sequenceLength}aa AMP for ${pathogen.name} (${pathogen.scientificName}, Gram-${pathogen.gramType}, WHO ${pathogen.whoPriority}).
Membrane: ${pathogen.membraneCharacteristics.outerMembraneCharge}mV, ${pathogen.membraneCharacteristics.pgLipidRatio}% PG lipids (${pathogen.membraneCharacteristics.barrierDescription}).
Target charge: +${pathogen.suggestedChargeRange[0]} to +${pathogen.suggestedChargeRange[1]}. Mechanism: ${params.poreMechanism}. Safety: ${params.safetyThreshold}.
Return ONLY JSON.`;
}

/**
 * Checks whether a sequence is a low-entropy homopolymer or simple tandem repeat.
 */
export function isDegenerateSequence(seq: string): boolean {
  const minUnique = Math.min(5, Math.max(4, Math.floor(seq.length / 4)));
  if (new Set(seq).size < minUnique) {
    return true;
  }
  // 4 identical residues in a row (e.g. KKKK, LLLL)
  if (/(.)\1\1\1/.test(seq)) {
    return true;
  }
  // 2- to 4-residue motif repeated 3+ times consecutively (e.g. KWKWKW, GAVGAVGAV)
  if (/(.{2,4})\1\1/.test(seq)) {
    return true;
  }
  return false;
}

/**
 * Adjusts peptide sequence length while maintaining an amphipathic helical repeat.
 */
export function adjustSequenceLength(seq: string, targetLength: number): string {
  if (seq.length > targetLength) {
    return seq.slice(0, targetLength);
  }
  const amphipathicTail = ['K', 'I', 'L', 'A', 'K', 'S', 'V', 'R', 'Q', 'L', 'K', 'F'];
  let result = seq;
  let i = 0;
  while (result.length < targetLength) {
    const nextAa = amphipathicTail[i % amphipathicTail.length];
    if (result.endsWith(nextAa + nextAa)) {
      result += nextAa === 'K' ? 'L' : 'K';
    } else {
      result += nextAa;
    }
    i++;
  }
  return result;
}

function extractJsonObject(rawText: string): string {
  const stripped = rawText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return stripped.slice(firstBrace, lastBrace + 1);
  }
  return stripped;
}

export function normalizeAiPeptideOutput(
  rawText: string,
  pathogen: PathogenProfile,
  targetLength: number
): RawAiPeptideOutput {
  const cleanJson = extractJsonObject(rawText);
  const parsed = JSON.parse(cleanJson) as Partial<RawAiPeptideOutput>;

  let seq = (parsed.sequence || '').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  if (!seq) {
    throw new Error('Model returned JSON without a valid amino acid sequence');
  }
  if (seq.length !== targetLength) {
    seq = adjustSequenceLength(seq, targetLength);
  }
  if (isDegenerateSequence(seq)) {
    throw new Error(`Rejected degenerate repetitive sequence (${seq})`);
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
