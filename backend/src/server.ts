import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GeneratePeptideRequest, GeneratePeptideResponse, GeneratedPeptide } from './types/peptide';
import { WHO_PATHOGENS, DEFAULT_PATHOGEN } from './pathogens';
import { generatePeptideWithGemini } from './gemini';
import { calculateBiophysicalMetrics, getAminoAcidProfile } from './bio-engine/calculators';
import { generateAlphaHelixPDB } from './bio-engine/pdb-generator';
import { computeHelicalWheel } from './bio-engine/helical-wheel';
import { getClinicalBenchmarks } from './benchmarks/clinical-peptides';
import { scanBeneficialMutations } from './ai/mutation-optimizer';
import { analyzeProteaseStability } from './validators/protease-shield';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'SynthiaBio AI & Biophysical Engine',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    endpoints: [
      'GET  /api/pathogens',
      'GET  /api/benchmarks',
      'POST /api/generate',
      'POST /api/optimize',
      'POST /api/validate-stability'
    ],
    timestamp: new Date().toISOString()
  });
});

// 2. Get WHO Priority Pathogens
app.get('/api/pathogens', (_req: Request, res: Response) => {
  res.json({ success: true, pathogens: WHO_PATHOGENS });
});

// 3. [IRFAN] Clinical Gold-Standard AMP Benchmarks
app.get('/api/benchmarks', (_req: Request, res: Response) => {
  res.json({
    success: true,
    benchmarks: getClinicalBenchmarks()
  });
});

// 4. [IRFAN] In-Silico Single-Point Mutation Optimizer
app.post('/api/optimize', (req: Request, res: Response) => {
  try {
    const { sequence } = req.body;
    if (!sequence || typeof sequence !== 'string') {
      res.status(400).json({ success: false, error: 'Sequence string is required' });
      return;
    }
    const baseMetrics = calculateBiophysicalMetrics(sequence);
    const mutations = scanBeneficialMutations(sequence);
    res.json({
      success: true,
      originalSequence: sequence,
      baseMetrics,
      recommendedMutations: mutations
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Mutation scan failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// 5. [PAS] Protease Stability & 2D Helical Wheel Projection Validator
app.post('/api/validate-stability', (req: Request, res: Response) => {
  try {
    const { sequence } = req.body;
    if (!sequence || typeof sequence !== 'string') {
      res.status(400).json({ success: false, error: 'Sequence string is required' });
      return;
    }
    const proteaseReport = analyzeProteaseStability(sequence);
    const helicalWheel = computeHelicalWheel(sequence);
    res.json({
      success: true,
      sequence,
      proteaseReport,
      helicalWheel
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stability validation failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// 6. Primary De Novo Synthesis Endpoint
app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const body: GeneratePeptideRequest = req.body;

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

    console.log(`[SynthiaBio BE] Synthesizing for ${pathogen.name} (${length}aa, ${params.poreMechanism})...`);

    const rawAiOutput = await generatePeptideWithGemini(pathogen, params);
    const metrics = calculateBiophysicalMetrics(rawAiOutput.sequence);
    const aminoAcidProfile = getAminoAcidProfile(rawAiOutput.sequence);
    const pdbContent = generateAlphaHelixPDB(rawAiOutput.sequence, rawAiOutput.candidateName);

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

    res.json(responsePayload);
  } catch (error: unknown) {
    console.error('[SynthiaBio BE] Error in /api/generate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal generation error';
    res.status(500).json({ success: false, error: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🧬 SynthiaBio Backend Engine — Phase 1: Backend-First Mode`);
  console.log(`🚀 Server listening on: http://localhost:${PORT}`);
  console.log(`🩺 Health check at:     http://localhost:${PORT}/health`);
  console.log(`================================================================`);
});
