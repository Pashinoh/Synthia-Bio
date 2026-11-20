import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GeneratePeptideRequest, GeneratePeptideResponse } from '@/types/peptide';
import { WHO_PATHOGENS, DEFAULT_PATHOGEN } from '@/lib/pathogens';
import { calculateBiophysicalMetrics, getAminoAcidProfile } from '@/lib/bio-engine/calculators';
import { generateAlphaHelixPDB } from '@/lib/bio-engine/pdb-generator';

const BACKEND_URL = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_API_URL ||
  'http://localhost:5000'
).replace(/\/+$/, '');

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

/**
 * Sanitize user-controlled input before interpolating into an LLM prompt.
 * Removes characters that could break out of string context or inject instructions.
 */
function sanitizeForPrompt(value: string): string {
  return value
    .replace(/["'\\\n\r`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

async function generatePeptideWithGemini(
  pathogen: { name: string; scientificName: string; gramType: string; whoPriority: string; membraneCharacteristics: { outerMembraneCharge: number; pgLipidRatio: number; barrierDescription: string; }; suggestedChargeRange: [number, number]; id: string },
  params: { sequenceLength: number; poreMechanism: string; safetyThreshold: string; customPathogenName?: string }
) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not set. Generating using deterministic biophysical heuristic.');
    return generateHeuristicPeptide(pathogen, params);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Design a de-novo antimicrobial peptide with the following specifications:
- Target Pathogen: ${sanitizeForPrompt(pathogen.name)} (${sanitizeForPrompt(pathogen.scientificName)})
- Gram Type: Gram-${sanitizeForPrompt(pathogen.gramType)}
- Target Membrane Surface Potential: ${pathogen.membraneCharacteristics.outerMembraneCharge} mV
- Membrane Characteristics: ${sanitizeForPrompt(pathogen.membraneCharacteristics.barrierDescription)}
- Sequence Length: EXACTLY ${params.sequenceLength} amino acids
- Membrane Disruption Mechanism: ${sanitizeForPrompt(params.poreMechanism)} pore model
- Target Safety Profile: ${params.safetyThreshold === 'high-selectivity' ? 'Maximum Selectivity (Extremely low hemolysis against human erythrocytes)' : 'Balanced Potency and Permeability'}

Respond ONLY with raw valid JSON. Do not wrap in markdown quotes if possible.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    const text = response.text?.trim() || '';
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    const parsed = JSON.parse(cleanJson) as { candidateName?: string; sequence?: string; molecularRationale?: string; membraneAffinityExplanation?: string };

    // Validate sequence length and valid characters
    let seq = (parsed.sequence || '').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
    if (seq.length !== params.sequenceLength) {
      seq = adjustSequenceLength(seq, params.sequenceLength);
    }

    return {
      candidateName: parsed.candidateName || `Synthia-${pathogen.id.toUpperCase()}-1`,
      sequence: seq,
      molecularRationale: parsed.molecularRationale || 'Engineered amphipathic alpha-helix optimized for bacterial membrane penetration.',
      membraneAffinityExplanation: parsed.membraneAffinityExplanation || `Electrostatic binding to negative membrane charge of ${sanitizeForPrompt(pathogen.name)}.`
    };
  } catch (error) {
    console.error('Gemini generation error, falling back to heuristic model:', error);
    return generateHeuristicPeptide(pathogen, params);
  }
}

/**
 * Deterministic heuristic generator based on standard amphipathic motif (i, i+3, i+4)
 * Ensures 100% offline uptime and zero-crash guarantee. Pure function — no API key.
 */
function generateHeuristicPeptide(
  pathogen: { name: string; scientificName: string; id: string; membraneCharacteristics: { outerMembraneCharge: number; pgLipidRatio: number; }; },
  params: { sequenceLength: number }
) {
  const length = params.sequenceLength;
  const motif = ['K', 'W', 'K', 'L', 'F', 'K', 'K', 'I', 'V', 'K', 'L', 'L', 'K', 'W', 'K', 'K', 'V', 'L', 'K', 'R', 'F', 'K', 'I', 'L', 'K', 'W', 'K', 'L'];
  let seq = '';
  for (let i = 0; i < length; i++) {
    seq += motif[i % motif.length];
  }

  return {
    candidateName: `Synthia-${pathogen.id.toUpperCase()}-Opt${length}`,
    sequence: seq,
    molecularRationale: `Generated using an optimized (i, i+3, i+4) amphipathic alpha-helical repeat. Alternating Lysine (K) residues align along the polar azimuth at 100-degree pitch intervals to destabilize ${sanitizeForPrompt(pathogen.name)} lipid packing while bulky hydrophobic Trp/Phe residues insert into the hydrocarbon core.`,
    membraneAffinityExplanation: `Targets the ${pathogen.membraneCharacteristics.outerMembraneCharge} mV outer potential of ${sanitizeForPrompt(pathogen.scientificName)} via high polycationic field density, initiating lipid headgroup displacement.`
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

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin.replace(/\/+$/, '') !== request.nextUrl.origin.replace(/\/+$/, '')) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: cross-origin request rejected' },
      { status: 403 }
    );
  }

  const body: GeneratePeptideRequest = await request.json();

  // 1. Try forwarding to dedicated Backend server if online (attaching server-side API key)
  try {
    const forwardHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = process.env.SYNTHIA_API_KEY?.trim();
    if (apiKey) {
      forwardHeaders['X-API-Key'] = apiKey;
    }

    const beRes = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(body),
      // Allow multi-provider AI + closed-loop optimization time to complete cleanly
      signal: AbortSignal.timeout(15000)
    });

    if (beRes.ok) {
      const beData: GeneratePeptideResponse = await beRes.json();
      return NextResponse.json(beData);
    }
  } catch {
    // Dedicated backend not running, fallback to internal Next.js engine
  }

  // 2. Direct Fallback: Execute inside Next.js directly
  try {
    const pathogen = WHO_PATHOGENS.find((p) => p.id === body.pathogenId) || DEFAULT_PATHOGEN;
    const length = Math.max(12, Math.min(28, body.sequenceLength || 18));
    const params = {
      pathogenId: pathogen.id,
      sequenceLength: length,
      poreMechanism: body.poreMechanism || 'toroidal',
      safetyThreshold: body.safetyThreshold || 'high-selectivity',
      customPathogenName: body.customPathogenName
    };

    const rawAiOutput = await generatePeptideWithGemini(pathogen, params);
    const metrics = calculateBiophysicalMetrics(rawAiOutput.sequence);
    const aminoAcidProfile = getAminoAcidProfile(rawAiOutput.sequence);
    const pdbContent = generateAlphaHelixPDB(rawAiOutput.sequence, rawAiOutput.candidateName);

    return NextResponse.json({
      success: true,
      peptide: {
        id: `synthia-${randomUUID()}`,
        name: rawAiOutput.candidateName,
        sequence: rawAiOutput.sequence,
        length: rawAiOutput.sequence.length,
        targetPathogen: `${pathogen.name} (${pathogen.scientificName})`,
        mechanism: params.poreMechanism,
        molecularRationale: rawAiOutput.molecularRationale,
        membraneAffinityExplanation: rawAiOutput.membraneAffinityExplanation,
        metrics,
        aminoAcidProfile,
        pdbContent,
        fastaContent: `>${rawAiOutput.candidateName} | Target: ${pathogen.name} | Length: ${rawAiOutput.sequence.length}aa\n${rawAiOutput.sequence}`,
        synthesisProtocol: {
          nTerminalModification: 'Free amine (unblocked) for optimal N-terminal positive dipole',
          cTerminalModification: 'C-terminal amidation (-CONH2) to neutralize terminal carboxylate and block carboxypeptidases',
          recommendedMethod: 'Fmoc solid-phase peptide synthesis (Fmoc-SPPS) with HBTU/DIEA activation',
          purificationTechnique: 'Preparative RP-HPLC using C18 column (water/acetonitrile with 0.1% TFA gradient) to >=95% purity',
          storageCondition: 'Lyophilized powder at -20°C in desiccated amber container; protect from moisture'
        },
        createdAt: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Generation error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
