import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  AIProviderPreference,
  GeneratePeptideRequest,
  GeneratePeptideResponse,
  GeneratedPeptide,
  PathogenProfile,
  PoreMechanism,
  SafetyThreshold
} from './types/peptide';
import { WHO_PATHOGENS, DEFAULT_PATHOGEN } from './pathogens';
import { synthesizePeptideWithAI } from './gemini';
import { calculateBiophysicalMetrics, getAminoAcidProfile, computeChargePhCurve } from './bio-engine/calculators';
import { generateAlphaHelixPDB } from './bio-engine/pdb-generator';
import { computeHelicalWheel } from './bio-engine/helical-wheel';
import { compareAgainstBenchmarks, getClinicalBenchmarks } from './benchmarks/clinical-peptides';
import {
  evolvePeptideSequence,
  sanitizePeptideSequence,
  scanBeneficialMutations
} from './ai/mutation-optimizer';
import { analyzeProteaseStability } from './validators/protease-shield';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const VALID_PROVIDERS = new Set<AIProviderPreference>(['auto', 'gemini', 'groq', 'dual']);
const VALID_MECHANISMS = new Set<PoreMechanism>(['toroidal', 'barrel-stave', 'carpet']);
const VALID_THRESHOLDS = new Set<SafetyThreshold>(['high-selectivity', 'balanced']);

function parseValidSequence(
  raw: unknown
): { ok: true; sequence: string } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Sequence string is required' };
  }
  const cleanSeq = sanitizePeptideSequence(raw);
  if (cleanSeq.length < 6) {
    return {
      ok: false,
      error: 'Sequence must contain at least 6 valid standard amino acid residues (A-Y)'
    };
  }
  if (cleanSeq.length > 60) {
    return { ok: false, error: 'Sequence length must not exceed 60 amino acid residues' };
  }
  return { ok: true, sequence: cleanSeq };
}

function resolvePathogen(pathogenId?: string, customPathogenName?: string): PathogenProfile {
  const matched = WHO_PATHOGENS.find((p) => p.id === pathogenId);
  if (matched) {
    return matched;
  }

  if (customPathogenName && typeof customPathogenName === 'string' && customPathogenName.trim()) {
    const cleanName = customPathogenName.trim();
    return {
      id: 'custom',
      name: cleanName,
      scientificName: cleanName,
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
  }

  return DEFAULT_PATHOGEN;
}

// 1. Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'SynthiaBio AI & Biophysical Engine',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    groqConfigured: !!process.env.GROQ_API_KEY,
    endpoints: [
      'GET  /api/pathogens',
      'GET  /api/benchmarks',
      'POST /api/benchmarks/compare',
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

// 3b. [IRFAN] Compare Candidate Peptide Against Clinical Benchmarks
app.post('/api/benchmarks/compare', (req: Request, res: Response) => {
  try {
    const seqCheck = parseValidSequence(req.body?.sequence);
    if (!seqCheck.ok) {
      res.status(400).json({ success: false, error: seqCheck.error });
      return;
    }

    const candidateName =
      typeof req.body?.candidateName === 'string' && req.body.candidateName.trim()
        ? req.body.candidateName.trim()
        : 'SynthiaBio Candidate';

    const report = compareAgainstBenchmarks(seqCheck.sequence, candidateName);
    res.json({ success: true, report });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Benchmark comparison failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// 4. [IRFAN] In-Silico Single-Point & Multi-Round Mutation Optimizer
app.post('/api/optimize', (req: Request, res: Response) => {
  try {
    const seqCheck = parseValidSequence(req.body?.sequence);
    if (!seqCheck.ok) {
      res.status(400).json({ success: false, error: seqCheck.error });
      return;
    }

    const pathogen =
      typeof req.body?.pathogenId === 'string'
        ? WHO_PATHOGENS.find((p) => p.id === req.body.pathogenId)
        : undefined;
    const rawRounds = Number(req.body?.rounds);
    const rounds = Number.isFinite(rawRounds) ? Math.max(1, Math.min(5, Math.round(rawRounds))) : 3;

    const baseMetrics = calculateBiophysicalMetrics(seqCheck.sequence);
    const recommendedMutations = scanBeneficialMutations(seqCheck.sequence, pathogen);
    const evolutionTrajectory = evolvePeptideSequence(seqCheck.sequence, pathogen, rounds);

    res.json({
      success: true,
      originalSequence: seqCheck.sequence,
      targetPathogenId: pathogen?.id || null,
      baseMetrics,
      recommendedMutations,
      evolutionTrajectory
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Mutation scan failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// 5. [PAS] Protease Stability & 2D Helical Wheel Projection Validator
app.post('/api/validate-stability', (req: Request, res: Response) => {
  try {
    const seqCheck = parseValidSequence(req.body?.sequence);
    if (!seqCheck.ok) {
      res.status(400).json({ success: false, error: seqCheck.error });
      return;
    }

    const proteaseReport = analyzeProteaseStability(seqCheck.sequence);
    const helicalWheel = computeHelicalWheel(seqCheck.sequence);
    const chargePhCurve = computeChargePhCurve(seqCheck.sequence);
    res.json({
      success: true,
      sequence: seqCheck.sequence,
      proteaseReport,
      helicalWheel,
      chargePhCurve
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stability validation failed';
    res.status(500).json({ success: false, error: msg });
  }
});

// 6. Primary De Novo Synthesis Endpoint (Multi-Provider + Closed-Loop Refinement)
app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as Partial<GeneratePeptideRequest>;
    const pathogen = resolvePathogen(body.pathogenId, body.customPathogenName);

    const parsedLength = Number(body.sequenceLength);
    const length = Number.isFinite(parsedLength)
      ? Math.max(12, Math.min(28, Math.round(parsedLength)))
      : 18;
    const poreMechanism = VALID_MECHANISMS.has(body.poreMechanism as PoreMechanism)
      ? (body.poreMechanism as PoreMechanism)
      : 'toroidal';
    const safetyThreshold = VALID_THRESHOLDS.has(body.safetyThreshold as SafetyThreshold)
      ? (body.safetyThreshold as SafetyThreshold)
      : 'high-selectivity';
    const provider = VALID_PROVIDERS.has(body.provider as AIProviderPreference)
      ? (body.provider as AIProviderPreference)
      : 'auto';

    const params = {
      pathogenId: pathogen.id,
      sequenceLength: length,
      poreMechanism,
      safetyThreshold,
      customPathogenName: body.customPathogenName,
      provider,
      autoOptimize: body.autoOptimize !== false
    };

    console.log(
      `[SynthiaBio BE] Synthesizing for ${pathogen.name} (${length}aa, ${params.poreMechanism}, provider=${params.provider})...`
    );

    const aiResult = await synthesizePeptideWithAI(pathogen, params);
    const rawAiOutput = aiResult.output;
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
      aiProviderUsed: aiResult.provider,
      aiModelUsed: aiResult.model,
      ...(aiResult.optimizationSummary ? { optimizationSummary: aiResult.optimizationSummary } : {}),
      metrics,
      aminoAcidProfile,
      pdbContent,
      fastaContent: `>${rawAiOutput.candidateName} | Target: ${pathogen.name} | Length: ${rawAiOutput.sequence.length}aa | Provider: ${aiResult.provider}\n${rawAiOutput.sequence}`,
      synthesisProtocol: {
        nTerminalModification: 'Free amine (unblocked) for optimal N-terminal positive dipole',
        cTerminalModification:
          'C-terminal amidation (-CONH2) to neutralize terminal carboxylate and block carboxypeptidases',
        recommendedMethod: 'Fmoc solid-phase peptide synthesis (Fmoc-SPPS) with HBTU/DIEA activation',
        purificationTechnique:
          'Preparative RP-HPLC using C18 column (water/acetonitrile with 0.1% TFA gradient) to >=95% purity',
        storageCondition: 'Lyophilized powder at -20°C in desiccated amber container; protect from moisture'
      },
      createdAt: new Date().toISOString()
    };

    const responsePayload: GeneratePeptideResponse = {
      success: true,
      peptide: candidatePeptide,
      isMockFallback: aiResult.provider === 'heuristic'
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
