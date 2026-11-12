import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { createApp } from '../src/app';

let server: http.Server;
let baseUrl: string;

before(async () => {
  const app = createApp({
    allowedOrigins: ['https://synthia-bio.vercel.app', 'http://localhost:3000'],
    rateLimitWindowMs: 60_000,
    rateLimitMax: 50,
    aiRateLimitMax: 5
  });

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

async function jsonRequest<T = Record<string, unknown>>(
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; headers: Headers; body: T }> {
  const res = await fetch(`${baseUrl}${path}`, init);
  const body = (await res.json()) as T;
  return { status: res.status, headers: res.headers, body };
}

test('GET /health returns online status, security headers, and endpoint catalog', async () => {
  const res = await jsonRequest<{
    status: string;
    geminiConfigured: boolean;
    groqConfigured: boolean;
    endpoints: string[];
  }>('/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'online');
  assert.equal(typeof res.body.geminiConfigured, 'boolean');
  assert.equal(typeof res.body.groqConfigured, 'boolean');
  assert.equal(res.body.endpoints.length, 7);
  assert.ok(res.body.endpoints.some((e) => e.includes('/api/generate-batch')));
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
});

test('GET /api/pathogens and /api/benchmarks expose complete catalogs with rate limit headers', async () => {
  const pathogens = await jsonRequest<{ success: boolean; pathogens: Array<{ id: string }> }>('/api/pathogens');
  assert.equal(pathogens.status, 200);
  assert.equal(pathogens.body.success, true);
  assert.ok(pathogens.body.pathogens.length >= 6);
  assert.ok(pathogens.headers.get('x-ratelimit-limit'));

  const benchmarks = await jsonRequest<{ success: boolean; benchmarks: Array<{ id: string }> }>(
    '/api/benchmarks'
  );
  assert.equal(benchmarks.status, 200);
  assert.equal(benchmarks.body.success, true);
  assert.ok(benchmarks.body.benchmarks.some((b) => b.id === 'pexiganan-msi78'));
});

test('POST /api/optimize, /api/validate-stability, and /api/benchmarks/compare work & reject bad inputs with 400', async () => {
  const seq = 'GIGAVLKVLTTGLPALISWIKRKRQQ';

  const optOk = await jsonRequest<{
    success: boolean;
    evolutionTrajectory: { appliedMutations: string[]; finalFitness: number; initialFitness: number };
  }>('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence: seq, pathogenId: 'mrsa', rounds: 2 })
  });
  assert.equal(optOk.status, 200);
  assert.equal(optOk.body.success, true);
  assert.ok(optOk.body.evolutionTrajectory.appliedMutations.length >= 1);

  const stabOk = await jsonRequest<{
    success: boolean;
    helicalWheel: { nodes: unknown[] };
    proteaseReport: { stabilityScore: number };
    chargePhCurve: { points: Array<{ ph: number; charge: number }>; isoelectricPoint: number };
  }>('/api/validate-stability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence: seq })
  });
  assert.equal(stabOk.status, 200);
  assert.equal(stabOk.body.helicalWheel.nodes.length, seq.length);
  assert.ok(stabOk.body.proteaseReport.stabilityScore >= 25);
  assert.equal(stabOk.body.chargePhCurve.points.length, 21);
  assert.ok(Number.isFinite(stabOk.body.chargePhCurve.isoelectricPoint));

  const cmpOk = await jsonRequest<{
    success: boolean;
    report: { comparisons: unknown[]; overallVerdict: string };
  }>('/api/benchmarks/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence: seq, candidateName: 'ControlSeq' })
  });
  assert.equal(cmpOk.status, 200);
  assert.ok(cmpOk.body.report.comparisons.length >= 4);
  assert.ok(cmpOk.body.report.overallVerdict.includes('ControlSeq'));

  const badOpt = await jsonRequest<{ success: boolean; error: string }>('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence: '12345' })
  });
  assert.equal(badOpt.status, 400);
  assert.equal(badOpt.body.success, false);

  const badCmp = await jsonRequest<{ success: boolean; error: string }>('/api/benchmarks/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence: 'AAA' })
  });
  assert.equal(badCmp.status, 400);
  assert.equal(badCmp.body.success, false);
});

test('POST /api/generate completes offline heuristic pipeline and enforces AI rate limit (429)', async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevGroq = process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;

  const rateApp = createApp({
    rateLimitWindowMs: 60_000,
    rateLimitMax: 50,
    aiRateLimitMax: 2
  });

  const rateServer = await new Promise<http.Server>((resolve) => {
    const s = rateApp.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const { port } = rateServer.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}/api/generate`;
    const reqInit: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathogenId: 'mrsa',
        sequenceLength: 18,
        poreMechanism: 'toroidal',
        safetyThreshold: 'high-selectivity',
        provider: 'auto'
      })
    };

    const r1 = await fetch(url, reqInit);
    const body1 = (await r1.json()) as {
      success: boolean;
      isMockFallback: boolean;
      peptide: {
        sequence: string;
        aiProviderUsed: string;
        pdbContent: string;
        synthesisFeasibility?: { feasibilityScore: number; sppsDifficulty: string };
      };
    };
    assert.equal(r1.status, 200);
    assert.equal(body1.success, true);
    assert.equal(body1.isMockFallback, true);
    assert.equal(body1.peptide.aiProviderUsed, 'heuristic');
    assert.equal(body1.peptide.sequence.length, 18);
    assert.ok(body1.peptide.pdbContent.includes('ATOM'));
    assert.ok(body1.peptide.synthesisFeasibility && body1.peptide.synthesisFeasibility.feasibilityScore > 0);

    const rBatch = await fetch(`http://127.0.0.1:${port}/api/generate-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathogenId: 'mrsa',
        sequenceLength: 18,
        poreMechanism: 'toroidal',
        safetyThreshold: 'high-selectivity',
        maxCandidates: 3
      })
    });
    const batchBody = (await rBatch.json()) as {
      success: boolean;
      candidateCount: number;
      bestCandidate?: { rank: number; compositeFitness: number };
      candidates: Array<{ rank: number; compositeFitness: number; peptide: { sequence: string } }>;
    };
    assert.equal(rBatch.status, 200);
    assert.equal(batchBody.success, true);
    assert.ok(batchBody.candidateCount >= 2);
    assert.equal(batchBody.bestCandidate?.rank, 1);
    assert.ok(batchBody.candidates[0].compositeFitness >= batchBody.candidates[1].compositeFitness);
    assert.equal(rBatch.headers.get('x-ratelimit-remaining'), '0');

    const r3 = await fetch(url, reqInit);
    const body3 = (await r3.json()) as { success: boolean; retryAfterSeconds: number };
    assert.equal(r3.status, 429);
    assert.equal(body3.success, false);
    assert.ok(r3.headers.get('retry-after'));
    assert.ok(body3.retryAfterSeconds >= 1);
  } finally {
    await new Promise<void>((resolve, reject) => rateServer.close((e) => (e ? reject(e) : resolve())));
    if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini;
    if (prevGroq !== undefined) process.env.GROQ_API_KEY = prevGroq;
  }
});

test('Server handles CORS allowlist, malformed JSON (400), and unknown routes (404)', async () => {
  const allowedRes = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://synthia-bio.vercel.app' }
  });
  assert.equal(allowedRes.headers.get('access-control-allow-origin'), 'https://synthia-bio.vercel.app');

  const blockedRes = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://unauthorized.example' }
  });
  assert.equal(blockedRes.headers.get('access-control-allow-origin'), null);

  const malformed = await jsonRequest<{ success: boolean; error: string }>('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid json'
  });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.body.success, false);

  const missing = await jsonRequest<{ success: boolean; error: string }>('/api/does-not-exist');
  assert.equal(missing.status, 404);
  assert.equal(missing.body.success, false);
});
