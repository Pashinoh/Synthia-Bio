import test from 'node:test';
import assert from 'node:assert/strict';
import { WHO_PATHOGENS, DEFAULT_PATHOGEN } from '../src/pathogens';
import { calculateBiophysicalMetrics, getAminoAcidProfile, computeChargePhCurve } from '../src/bio-engine/calculators';
import { generateAlphaHelixPDB } from '../src/bio-engine/pdb-generator';
import { computeHelicalWheel } from '../src/bio-engine/helical-wheel';
import { analyzeProteaseStability } from '../src/validators/protease-shield';
import {
  evolvePeptideSequence,
  scanBeneficialMutations
} from '../src/ai/mutation-optimizer';
import {
  compareAgainstBenchmarks,
  getClinicalBenchmarks
} from '../src/benchmarks/clinical-peptides';
import { synthesizePeptideWithAI } from '../src/gemini';

test('WHO_PATHOGENS catalog contains unique profiles with valid ranges', () => {
  assert.ok(WHO_PATHOGENS.length >= 4);
  const ids = new Set(WHO_PATHOGENS.map((p) => p.id));
  assert.equal(ids.size, WHO_PATHOGENS.length);
  for (const pathogen of WHO_PATHOGENS) {
    assert.ok(pathogen.recommendedLength[0] <= pathogen.recommendedLength[1]);
    assert.ok(pathogen.suggestedChargeRange[0] <= pathogen.suggestedChargeRange[1]);
  }
});

test('Biophysical metrics & PDB generator produce valid outputs for standard AMP', () => {
  const seq = 'KWKLFKKIEKVGQNVRDG';
  const metrics = calculateBiophysicalMetrics(seq);
  assert.ok(metrics.therapeuticSelectivityIndex >= 10 && metrics.therapeuticSelectivityIndex <= 99);
  assert.equal(getAminoAcidProfile(seq).reduce((acc, row) => acc + row.count, 0), seq.length);
  // Aliphatic Index (Ikai 1980): pure Ala sequence -> X(Ala)=100% -> index 100
  assert.equal(calculateBiophysicalMetrics('AAAAAAAAAA').aliphaticIndex, 100);
  assert.ok(metrics.aliphaticIndex >= 0 && Number.isFinite(metrics.aliphaticIndex));

  const pdb = generateAlphaHelixPDB(seq, 'TestAMP');
  assert.ok(pdb.includes('ATOM'));
  assert.ok(pdb.includes('END'));
});

test('Mutation optimizer and multi-round evolution improve toxic Melittin control', () => {
  const melittin = 'GIGAVLKVLTTGLPALISWIKRKRQQ';
  const topSingle = scanBeneficialMutations(melittin, DEFAULT_PATHOGEN);
  assert.ok(topSingle.length > 0);

  const trajectory = evolvePeptideSequence(melittin, DEFAULT_PATHOGEN, 3);
  assert.ok(trajectory.appliedMutations.length >= 1);
  assert.ok(trajectory.finalFitness > trajectory.initialFitness);
  assert.ok(
    trajectory.finalMetrics.therapeuticSelectivityIndex >=
      trajectory.initialMetrics.therapeuticSelectivityIndex
  );
  assert.throws(() => scanBeneficialMutations('12345'), /valid amino acid/);
});

test('Clinical benchmarks & comparison engine report deltas against clinical leads', () => {
  const refs = getClinicalBenchmarks();
  assert.ok(refs.some((r) => r.id === 'pexiganan-msi78'));
  assert.ok(refs.some((r) => r.id === 'melittin'));

  const report = compareAgainstBenchmarks('GIGKFLKKAKKFGKAFVKILKK', 'TestCandidate');
  assert.equal(report.comparisons.length, refs.length);
  assert.ok(report.overallVerdict.includes('TestCandidate'));
});

test('Pas modules (protease shield & helical wheel) validate sequences properly', () => {
  const seq = 'KWKLFKKIEKVGQNVRDG';
  const protease = analyzeProteaseStability(seq);
  assert.ok(protease.stabilityScore >= 25 && protease.stabilityScore <= 95);
  assert.ok(protease.cleavageSites.length > 0);

  const wheel = computeHelicalWheel(seq);
  assert.equal(wheel.nodes.length, seq.length);

  // Charge-pH curve: default range pH 2.0-12.0 step 0.5 => 21 points, pI included
  const curve = computeChargePhCurve(seq);
  assert.equal(curve.points.length, 21);
  assert.equal(curve.points[0].ph, 2.0);
  assert.equal(curve.points[20].ph, 12.0);
  assert.ok(curve.points[0].charge > 5); // strongly cationic in acid
  assert.ok(curve.points[20].charge < 0); // acidic residues dominate in base
  const nearP = curve.points.find((p) => Math.abs(p.ph - curve.isoelectricPoint) < 0.26);
  assert.ok(nearP && Math.abs(nearP.charge) < 1.0);
});

test('Protease shield covers elastase with proline protection and monotone half-life', () => {
  // G,A,V,S,T each followed by a non-Pro residue -> 5 elastase sites; K6 -> trypsin
  const open = analyzeProteaseStability('GAVSTKR');
  assert.equal(open.cleavageSites.filter((s) => s.enzyme === 'Elastase').length, 5);

  // G followed by P is shielded; only A3 (followed by G) is an elastase site
  const guarded = analyzeProteaseStability('GPAGP');
  assert.equal(guarded.cleavageSites.filter((s) => s.enzyme === 'Elastase').length, 1);

  // More weighted cleavage sites never increases the estimated half-life
  assert.ok(open.estimatedHalfLifeMinutes <= guarded.estimatedHalfLifeMinutes);
});

test('AI orchestrator gracefully falls back to deterministic heuristic when API keys are absent', async () => {
  const prevGemini = process.env.GEMINI_API_KEY;
  const prevGroq = process.env.GROQ_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;

  try {
    const result = await synthesizePeptideWithAI(DEFAULT_PATHOGEN, {
      pathogenId: DEFAULT_PATHOGEN.id,
      sequenceLength: 18,
      poreMechanism: 'toroidal',
      safetyThreshold: 'high-selectivity',
      provider: 'auto',
      autoOptimize: true
    });

    assert.equal(result.provider, 'heuristic');
    assert.equal(result.output.sequence.length, 18);
    assert.match(result.output.sequence, /^[ACDEFGHIKLMNPQRSTVWY]{18}$/);
  } finally {
    if (prevGemini !== undefined) process.env.GEMINI_API_KEY = prevGemini;
    if (prevGroq !== undefined) process.env.GROQ_API_KEY = prevGroq;
  }
});
