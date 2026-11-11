import { NextResponse } from 'next/server';
import { GeneratePeptideRequest, GeneratePeptideResponse } from '@/types/peptide';
import { WHO_PATHOGENS, DEFAULT_PATHOGEN } from '@/lib/pathogens';
import { generatePeptideWithGemini } from '@/lib/gemini';
import { calculateBiophysicalMetrics, getAminoAcidProfile } from '@/lib/bio-engine/calculators';
import { generateAlphaHelixPDB } from '@/lib/bio-engine/pdb-generator';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:5000';

export async function POST(request: Request) {
  const body: GeneratePeptideRequest = await request.json();

  // 1. Try forwarding to dedicated Backend server if online
  try {
    const beRes = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Fast timeout to avoid blocking if backend isn't running locally
      signal: AbortSignal.timeout(2500)
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
    let pathogen = WHO_PATHOGENS.find((p) => p.id === body.pathogenId) || DEFAULT_PATHOGEN;
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
        id: `synthia-${Date.now().toString(36)}`,
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
