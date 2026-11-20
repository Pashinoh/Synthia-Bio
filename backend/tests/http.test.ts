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
    lockedPositions?: number[];
    evolutionTrajectory: {
      originalSequence: string;
      finalSequence: string;
      appliedMutations: string[];
      finalFitness: number;
      initialFitness: number;
    };
  }>('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sequence: seq, pathogenId: 'mrsa', rounds: 2, lockedMotif: 'GIGAV' })
  });
  assert.equal(optOk.status, 200);
  assert.equal(optOk.body.success, true);
  assert.ok(optOk.body.evolutionTrajectory.appliedMutations.length >= 1);
  assert.deepEqual(optOk.body.lockedPositions, [1, 2, 3, 4, 5]);
  assert.equal(optOk.body.evolutionTrajectory.finalSequence.slice(0, 5), 'GIGAV');

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
        cifContent?: string;
        inSilicoGates?: {
          overallStatus: string;
          passedCount: number;
          totalGates: number;
          rewardScore: number;
          gates: unknown[];
        };
        synthesisFeasibility?: { feasibilityScore: number; sppsDifficulty: string };
      };
    };
    assert.equal(r1.status, 200);
    assert.equal(body1.success, true);
    assert.equal(body1.isMockFallback, true);
    assert.equal(body1.peptide.aiProviderUsed, 'heuristic');
    assert.equal(body1.peptide.sequence.length, 18);
    assert.ok(body1.peptide.pdbContent.includes('ATOM'));
    assert.ok(body1.peptide.cifContent?.includes('_atom_site.Cartn_x'));
    assert.ok(body1.peptide.inSilicoGates && body1.peptide.inSilicoGates.gates.length === 5);
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

test('F1: API key authentication protects /api/* while leaving /health accessible and fails closed in production', async () => {
  const secret = 'synthia-super-secret-test-key-2026';
  const authedApp = createApp({
    apiKey: secret,
    rateLimitWindowMs: 60_000,
    rateLimitMax: 20,
    aiRateLimitMax: 5
  });

  const authedServer = await new Promise<http.Server>((resolve) => {
    const s = authedApp.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const { port } = authedServer.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}`;

    // /health remains open for uptime probes and reports authConfigured=true
    const healthRes = await fetch(`${url}/health`);
    const healthBody = (await healthRes.json()) as {
      status: string;
      authConfigured: boolean;
      rateLimitStore: string;
    };
    assert.equal(healthRes.status, 200);
    assert.equal(healthBody.authConfigured, true);
    assert.equal(healthBody.rateLimitStore, 'memory-sliding-window');
    assert.equal(
      healthRes.headers.get('content-security-policy'),
      "default-src 'none'; frame-ancestors 'none'"
    );

    // Missing or wrong API key -> 401
    const noKeyRes = await fetch(`${url}/api/pathogens`);
    assert.equal(noKeyRes.status, 401);

    const wrongKeyRes = await fetch(`${url}/api/pathogens`, {
      headers: { 'X-API-Key': 'wrong-key' }
    });
    assert.equal(wrongKeyRes.status, 401);

    // Valid X-API-Key -> 200
    const xApiKeyRes = await fetch(`${url}/api/pathogens`, {
      headers: { 'X-API-Key': secret }
    });
    assert.equal(xApiKeyRes.status, 200);

    // Valid Bearer token -> 200
    const bearerRes = await fetch(`${url}/api/benchmarks`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    assert.equal(bearerRes.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => authedServer.close((e) => (e ? reject(e) : resolve())));
  }

  // Production fail-closed when SYNTHIA_API_KEY is unset
  const prevNodeEnv = process.env.NODE_ENV;
  const prevKey = process.env.SYNTHIA_API_KEY;
  process.env.NODE_ENV = 'production';
  delete process.env.SYNTHIA_API_KEY;

  const prodApp = createApp({ allowedOrigins: [] });
  const prodServer = await new Promise<http.Server>((resolve) => {
    const s = prodApp.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const { port } = prodServer.address() as AddressInfo;
    const prodRes = await fetch(`http://127.0.0.1:${port}/api/pathogens`);
    assert.equal(prodRes.status, 503);
  } finally {
    await new Promise<void>((resolve, reject) => prodServer.close((e) => (e ? reject(e) : resolve())));
    if (prevNodeEnv !== undefined) process.env.NODE_ENV = prevNodeEnv;
    else delete process.env.NODE_ENV;
    if (prevKey !== undefined) process.env.SYNTHIA_API_KEY = prevKey;
  }
});

test('F2 & F3: CORS fails closed when ALLOWED_ORIGINS is empty and sliding-window limiter prevents boundary bursts', async () => {
  const secret = 'bff-proxy-secret';
  const strictApp = createApp({
    allowedOrigins: [],
    apiKey: secret,
    rateLimitWindowMs: 250,
    rateLimitMax: 2,
    aiRateLimitMax: 2
  });

  const strictServer = await new Promise<http.Server>((resolve) => {
    const s = strictApp.listen(0, '127.0.0.1', () => resolve(s));
  });

  try {
    const { port } = strictServer.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}`;

    // F2: Cross-origin request is rejected (no ACAO header) when allowlist is empty
    const crossOriginRes = await fetch(`${url}/health`, {
      headers: { Origin: 'https://evil-site.example' }
    });
    assert.equal(crossOriginRes.headers.get('access-control-allow-origin'), null);

    // F3: Sliding window + authenticated BFF X-Client-IP per-end-user bucketing
    const u1a = await fetch(`${url}/api/pathogens`, {
      headers: { 'X-API-Key': secret, 'X-Client-IP': '203.0.113.10' }
    });
    const u1b = await fetch(`${url}/api/pathogens`, {
      headers: { 'X-API-Key': secret, 'X-Client-IP': '203.0.113.10' }
    });
    const u1c = await fetch(`${url}/api/pathogens`, {
      headers: { 'X-API-Key': secret, 'X-Client-IP': '203.0.113.10' }
    });
    assert.equal(u1a.status, 200);
    assert.equal(u1b.status, 200);
    assert.equal(u1c.status, 429);

    // Distinct end-user IP via authenticated BFF is NOT blocked by user 1
    const u2a = await fetch(`${url}/api/pathogens`, {
      headers: { 'X-API-Key': secret, 'X-Client-IP': '203.0.113.11' }
    });
    assert.equal(u2a.status, 200);

    // After sliding window expires (280ms > 250ms), user 1 is permitted again
    await new Promise((r) => setTimeout(r, 280));
    const u1d = await fetch(`${url}/api/pathogens`, {
      headers: { 'X-API-Key': secret, 'X-Client-IP': '203.0.113.10' }
    });
    assert.equal(u1d.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => strictServer.close((e) => (e ? reject(e) : resolve())));
  }
});
