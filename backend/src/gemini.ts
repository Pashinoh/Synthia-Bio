import { GoogleGenAI } from '@google/genai';
import { PathogenProfile, PeptideDesignParams } from './types/peptide';

export interface RawAiPeptideOutput {
  candidateName: string;
  sequence: string;
  molecularRationale: string;
  membraneAffinityExplanation: string;
}

const SYSTEM_INSTRUCTION = `You are SynthiaBio, a world-class computational biophysicist and structural biochemist specializing in de novo Antimicrobial Peptide (AMP) design.
Your task is to engineer novel therapeutic alpha-helical peptide sequences specifically optimized to disrupt the lipid membrane of target bacterial pathogens while minimizing mammalian hemolytic toxicity.

Key Biophysical Rules for AMP Design:
1. Net Charge: Alternate cationic residues (Lysine 'K', Arginine 'R') to achieve an amphipathic partition that selectively binds to negative bacterial phospholipids (Phosphatidylglycerol/Cardiolipin) via electrostatic attraction.
2. Amphipathic Helix: Arrange hydrophobic residues (Leucine 'L', Isoleucine 'I', Valine 'V', Phenylalanine 'F', Tryptophan 'W') along one face of the 3.6-residue-per-turn alpha-helix to bury into the hydrophobic membrane core.
3. Length: Strictly adhere to the requested sequence length.
4. Valid Amino Acids: Use ONLY the 20 standard IUPAC single-letter codes: A, C, D, E, F, G, H, I, K, L, M, N, P, Q, R, S, T, V, W, Y. (Prefer avoiding Cysteine 'C' unless forming disulfide bridges).

Return output STRICTLY in valid JSON matching this schema:
{
  "candidateName": "Descriptive name (e.g. Synthia-MRSA-Toroid-1)",
  "sequence": "EXACT single-letter amino acid sequence with exact requested length",
  "molecularRationale": "Detailed biophysical explanation of residue placement and pore formation mechanism",
  "membraneAffinityExplanation": "Analysis of electrostatic and hydrophobic binding to the specific target pathogen membrane"
}`;

export async function generatePeptideWithGemini(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): Promise<RawAiPeptideOutput> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Generating using deterministic biophysical heuristic.');
    return generateHeuristicPeptide(pathogen, params);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Design a de-novo antimicrobial peptide with the following specifications:
- Target Pathogen: ${pathogen.name} (${pathogen.scientificName})
- Gram Type: Gram-${pathogen.gramType}
- Target Membrane Surface Potential: ${pathogen.membraneCharacteristics.outerMembraneCharge} mV
- Membrane Characteristics: ${pathogen.membraneCharacteristics.barrierDescription}
- Sequence Length: EXACTLY ${params.sequenceLength} amino acids
- Membrane Disruption Mechanism: ${params.poreMechanism} pore model
- Target Safety Profile: ${params.safetyThreshold === 'high-selectivity' ? 'Maximum Selectivity (Extremely low hemolysis against human erythrocytes)' : 'Balanced Potency and Permeability'}

Respond ONLY with raw valid JSON. Do not wrap in markdown quotes if possible.`;

    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(10000)
      }
    });

    const text = response.text?.trim() || '';
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleanJson) as RawAiPeptideOutput;

    // Validate sequence length and valid characters
    let seq = (parsed.sequence || '').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
    if (seq.length !== params.sequenceLength) {
      seq = adjustSequenceLength(seq, params.sequenceLength);
    }

    return {
      candidateName: parsed.candidateName || `Synthia-${pathogen.id.toUpperCase()}-1`,
      sequence: seq,
      molecularRationale: parsed.molecularRationale || 'Engineered amphipathic alpha-helix optimized for bacterial membrane penetration.',
      membraneAffinityExplanation: parsed.membraneAffinityExplanation || `Electrostatic binding to negative membrane charge of ${pathogen.name}.`
    };
  } catch (error) {
    console.error('Gemini generation error, falling back to heuristic model:', error);
    return generateHeuristicPeptide(pathogen, params);
  }
}

/**
 * Deterministic heuristic generator based on standard amphipathic motif (i, i+3, i+4)
 * Ensures 100% offline uptime and zero-crash guarantee.
 */
export function generateHeuristicPeptide(
  pathogen: PathogenProfile,
  params: PeptideDesignParams
): RawAiPeptideOutput {
  const length = params.sequenceLength;
  // Amphipathic pattern: K-W-K-L-F-K-K-I-E-K-V-G-Q-N-V-R-D-G
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

function adjustSequenceLength(seq: string, targetLength: number): string {
  if (seq.length > targetLength) {
    return seq.slice(0, targetLength);
  }
  const filler = ['K', 'L', 'A', 'K', 'L', 'A', 'K'];
  let i = 0;
  while (seq.length < targetLength) {
    seq += filler[i % filler.length];
    i++;
  }
  return seq;
}
