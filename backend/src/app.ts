import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import {
  AIProviderPreference,
  GenerateBatchRequest,
  GenerateBatchResponse,
  GeneratePeptideRequest,
  GeneratePeptideResponse,
  PathogenProfile,
  PeptideDesignParams,
  PoreMechanism,
  SafetyThreshold,
  ScreenedPeptideCandidate
} from './types/peptide';
import { WHO_PATHOGENS, DEFAULT_PATHOGEN } from './pathogens';
import { synthesizeBatchWithAI, synthesizePeptideWithAI } from './gemini';
import { calculateBiophysicalMetrics, computeChargePhCurve } from './bio-engine/calculators';
import { computeHelicalWheel } from './bio-engine/helical-wheel';
import { compareAgainstBenchmarks, getClinicalBenchmarks } from './benchmarks/clinical-peptides';
import {
  evaluatePeptideFitness,
  evolvePeptideSequence,
  sanitizePeptideSequence,
  scanBeneficialMutations
} from './ai/mutation-optimizer';
import { assembleGeneratedPeptide } from './ai/peptide-assembler';
import { analyzeProteaseStability } from './validators/protease-shield';
import { buildCorsOptions, createRateLimiter, securityHeaders } from './middleware/security';

export interface AppOptions {
  allowedOrigins?: string[];
  rateLimitWindowMs?: number;
  rateLimitMax?: number;
  aiRateLimitMax?: number;
}

const VALID_PROVIDERS = new Set<AIProviderPreference>(['auto', 'gemini', 'groq', 'dual']);
const VALID_MECHANISMS = new Set<PoreMechanism>(['toroidal', 'barrel-stave', 'carpet']);
const VALID_THRESHOLDS = new Set<SafetyThreshold>(['high-selectivity', 'balanced']);

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

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

function parseGenerationInput(
  rawBody: unknown,
  defaultProvider: AIProviderPreference
): { pathogen: PathogenProfile; params: PeptideDesignParams } {
  const body = (rawBody || {}) as Partial<GeneratePeptideRequest>;
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
    : defaultProvider;

  return {
    pathogen,
    params: {
      pathogenId: pathogen.id,
      sequenceLength: length,
      poreMechanism,
      safetyThreshold,
      customPathogenName: body.customPathogenName,
      provider,
      autoOptimize: body.autoOptimize !== false
    }
  };
}

/**
 * Builds and configures the Express application without binding a network port,
 * allowing both production startup and ephemeral in-process HTTP integration testing.
 */
export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  const windowMs = options.rateLimitWindowMs ?? parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  const generalMax = options.rateLimitMax ?? parsePositiveInt(process.env.RATE_LIMIT_MAX, 60);
  const aiMax = options.aiRateLimitMax ?? parsePositiveInt(process.env.AI_RATE_LIMIT_MAX, 15);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cors(buildCorsOptions(options.allowedOrigins)));
  app.use(express.json({ limit: '64kb' }));

  const generalApiLimiter = createRateLimiter({
    windowMs,
    maxRequests: generalMax,
    keyPrefix: 'api'
  });
  const aiGenerationLimiter = createRateLimiter({
    windowMs,
    maxRequests: aiMax,
    keyPrefix: 'generate'
  });

  app.use('/api', generalApiLimiter);

  // 1. Health Check Endpoint (exempt from API rate limits for platform health probes)
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
        'POST /api/generate-batch',
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

  // 5. [PAS] Protease Stability, 2D Helical Wheel & Charge-vs-pH Titration Validator
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
  app.post('/api/generate', aiGenerationLimiter, async (req: Request, res: Response) => {
    try {
      const { pathogen, params } = parseGenerationInput(req.body, 'auto');

      console.log(
        `[SynthiaBio BE] Synthesizing for ${pathogen.name} (${params.sequenceLength}aa, ${params.poreMechanism}, provider=${params.provider})...`
      );

      const aiResult = await synthesizePeptideWithAI(pathogen, params);
      const candidatePeptide = assembleGeneratedPeptide({
        rawAiOutput: aiResult.output,
        pathogen,
        mechanism: params.poreMechanism,
        provider: aiResult.provider,
        model: aiResult.model,
        optimizationSummary: aiResult.optimizationSummary
      });

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

  // 7. [IRFAN] Multi-Candidate Screening & Batch Trade-Off Ranking
  app.post('/api/generate-batch', aiGenerationLimiter, async (req: Request, res: Response) => {
    try {
      const { pathogen, params } = parseGenerationInput(req.body, 'dual');
      const rawMax = Number((req.body as Partial<GenerateBatchRequest> | undefined)?.maxCandidates);
      const maxCandidates = Number.isFinite(rawMax) ? Math.max(2, Math.min(4, Math.round(rawMax))) : 3;

      console.log(
        `[SynthiaBio BE] Batch screening (${maxCandidates} max) for ${pathogen.name} (${params.sequenceLength}aa, ${params.poreMechanism})...`
      );

      const synthesizedList = await synthesizeBatchWithAI(pathogen, params, maxCandidates);

      const screenedCandidates: ScreenedPeptideCandidate[] = synthesizedList.map((item, idx) => {
        const peptide = assembleGeneratedPeptide({
          idSuffix: `b${idx + 1}`,
          rawAiOutput: item.output,
          pathogen,
          mechanism: params.poreMechanism,
          provider: item.provider,
          model: item.model,
          optimizationSummary: item.optimizationSummary
        });

        const fitness = evaluatePeptideFitness(peptide.sequence, pathogen);
        const sppsScore = peptide.synthesisFeasibility?.feasibilityScore ?? 80;
        const compositeFitness = parseFloat((fitness.compositeScore + sppsScore * 0.15).toFixed(2));
        const benchmark = compareAgainstBenchmarks(peptide.sequence, peptide.name);
        const pex = benchmark.comparisons.find((c) => c.referenceId === 'pexiganan-msi78');
        const mel = benchmark.comparisons.find((c) => c.referenceId === 'melittin');

        return {
          rank: idx + 1,
          compositeFitness,
          proteaseStabilityScore: fitness.protease.stabilityScore,
          estimatedHalfLifeMinutes: fitness.protease.estimatedHalfLifeMinutes,
          selectivityVsPexiganan: pex ? pex.selectivityDelta : null,
          selectivityVsMelittin: mel ? mel.selectivityDelta : null,
          tradeoffSummary: `Selectivity ${peptide.metrics.therapeuticSelectivityIndex}/100 | Hemolysis ${peptide.metrics.predictedHemolysisRisk} | Protease ${fitness.protease.stabilityScore}/100 (~${fitness.protease.estimatedHalfLifeMinutes} min) | SPPS ${peptide.synthesisFeasibility?.sppsDifficulty} (${sppsScore}/100)`,
          peptide
        };
      });

      const responsePayload: GenerateBatchResponse = {
        success: true,
        targetPathogen: `${pathogen.name} (${pathogen.scientificName})`,
        candidateCount: screenedCandidates.length,
        bestCandidate: screenedCandidates[0],
        candidates: screenedCandidates,
        isMockFallback: screenedCandidates.every((c) => c.peptide.aiProviderUsed === 'heuristic')
      };

      res.json(responsePayload);
    } catch (error: unknown) {
      console.error('[SynthiaBio BE] Error in /api/generate-batch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Internal batch screening error';
      res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Fallback 404 handler for unmapped routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
  });

  // Malformed JSON / body-parser error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof (err as { status?: unknown })?.status === 'number'
      ? (err as { status: number }).status
      : 500;
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    res.status(status).json({
      success: false,
      error: status === 400 ? 'Invalid JSON request payload' : message
    });
  });

  return app;
}
