import { NextResponse } from 'next/server';
import { GeneratePeptideRequest, GeneratePeptideResponse, GeneratedPeptide } from '@/types/peptide';
import { WHO_PATHOGENS, DEFAULT_PATHOGEN } from '@/lib/pathogens';
import { generatePeptideWithGemini } from '@/lib/gemini';
import { calculateBiophysicalMetrics, getAminoAcidProfile } from '@/lib/bio-engine/calculators';
import { generateAlphaHelixPDB } from '@/lib/bio-engine/pdb-generator';

export async function POST(request: Request) {
  try {
    const body: GeneratePeptideRequest = await request.json();

    // 1. Identify Target Pathogen
    let pathogen = WHO_PATHOGENS.find((p) => p.id === body.pathogenId);
    if (!pathogen) {
      if (body.customPathogenName) {
        pathogen = {
          id: 'custom',
          name: body.customPathogenName,
          scientificName: body.customPathogenName,
          gramType: 'negative',
          whoPriority: 'Critical',
          targetDiseases: 'Resistant systemic bacteremia',
          membraneCharacteristics: {
            outerMembraneCharge: -35,
            pgLipidRatio: 40,
            barrierDescription: 'Custom lipid bilayer profile with elevated anionic phospholipids.'
          },
          recommendedLength: [14, 24],
          suggestedChargeRange: [+5, +8]
        };
      } else {
        pathogen = DEFAULT_PATHOGEN;
      }
    }

    const length = Math.max(12, Math.min(28, body.sequenceLength || 18));
    const params = {
      pathogenId: pathogen.id,
      sequenceLength: length,
      poreMechanism: body.poreMechanism || 'toroidal',
      safetyThreshold: body.safetyThreshold || 'high-selectivity',
      customPathogenName: body.customPathogenName
    };

    // 2. Generate Candidate Sequence with Gemini 1.5
    const rawAiOutput = await generatePeptideWithGemini(pathogen, params);

    // 3. Compute Deterministic Biophysical Properties
    const metrics = calculateBiophysicalMetrics(rawAiOutput.sequence);
    const aminoAcidProfile = getAminoAcidProfile(rawAiOutput.sequence);

    // 4. Generate 3D PDB Atomic Coordinates
    const pdbContent = generateAlphaHelixPDB(rawAiOutput.sequence, rawAiOutput.candidateName);

    // 5. Construct Complete Lab Deliverables
    const candidatePeptide: GeneratedPeptide = {
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
    };

    const responsePayload: GeneratePeptideResponse = {
      success: true,
      peptide: candidatePeptide
    };

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    console.error('Peptide generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal generation error';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
