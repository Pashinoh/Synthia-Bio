import { SynthesisFeasibilityReport, SynthesisLiabilityFlag } from '../types/peptide';

const HYDROPHOBIC_RESIDUES = new Set(['A', 'F', 'I', 'L', 'M', 'V', 'W', 'Y']);
const CHARGED_OR_POLAR_RESIDUES = new Set(['K', 'R', 'H', 'D', 'E', 'S', 'T', 'N', 'Q']);
const BETA_BRANCHED_PAIRS = ['VV', 'II', 'VI', 'IV', 'TT', 'VT', 'TV', 'IT', 'TI'];
const ASPARTIMIDE_MOTIFS = ['DG', 'DS', 'DN', 'DA', 'DT', 'NG'];

function collectMatches(seq: string, regex: RegExp): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(seq)) !== null) {
    matches.push(`${match[0]}@${match.index + 1}`);
  }
  return matches;
}

/**
 * [IRFAN'S MODULE]
 * Evaluates Fmoc solid-phase peptide synthesis (Fmoc-SPPS) manufacturability,
 * aggregation tendencies, chemical oxidation liabilities, and aqueous solubility.
 */
export function analyzeSynthesisFeasibility(sequence: string): SynthesisFeasibilityReport {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  if (!cleanSeq) {
    throw new Error('Sequence must contain at least one valid amino acid residue');
  }

  const n = cleanSeq.length;
  let hydrophobicCount = 0;
  let chargedCount = 0;
  let polarCount = 0;

  for (const aa of cleanSeq) {
    if (HYDROPHOBIC_RESIDUES.has(aa)) hydrophobicCount++;
    if (aa === 'K' || aa === 'R' || aa === 'D' || aa === 'E') chargedCount++;
    if (CHARGED_OR_POLAR_RESIDUES.has(aa)) polarCount++;
  }

  const hydrophobicFraction = parseFloat((hydrophobicCount / n).toFixed(2));
  const chargedFraction = parseFloat((chargedCount / n).toFixed(2));
  const polarFraction = polarCount / n;

  const liabilities: SynthesisLiabilityFlag[] = [];
  let penalty = 0;

  // 1. Free Cysteine (uncontrolled disulfide dimerization)
  const cysMatches = collectMatches(cleanSeq, /C/g);
  if (cysMatches.length > 0) {
    penalty += cysMatches.length * 14;
    liabilities.push({
      code: 'OXIDATION_CYS',
      severity: cysMatches.length > 1 ? 'High' : 'Moderate',
      motif: cysMatches.join(', '),
      description: 'Unpaired Cysteine thiol can form intermolecular disulfide dimers during RP-HPLC or storage.',
      mitigation: 'Purge buffers with N2, add 0.1% DTT/TCEP during dissolution, or substitute C -> S/A if non-structural.'
    });
  }

  // 2. Methionine oxidation risk
  const metMatches = collectMatches(cleanSeq, /M/g);
  if (metMatches.length > 0) {
    penalty += metMatches.length * 6;
    liabilities.push({
      code: 'OXIDATION_MET',
      severity: 'Low',
      motif: metMatches.join(', '),
      description: 'Methionine thioether oxidizes slowly into Met(O) sulfoxide in aerobic aqueous solution.',
      mitigation: 'Store lyophilized under argon/nitrogen at -20°C or consider Norleucine (Nle) isosteric replacement.'
    });
  }

  // 3. Aspartimide cyclization hotspots during piperidine Fmoc-deprotection
  const aspMotifsFound: string[] = [];
  for (let i = 0; i < n - 1; i++) {
    const pair = cleanSeq.slice(i, i + 2);
    if (ASPARTIMIDE_MOTIFS.includes(pair)) {
      aspMotifsFound.push(`${pair}@${i + 1}`);
    }
  }
  if (aspMotifsFound.length > 0) {
    penalty += aspMotifsFound.length * 8;
    liabilities.push({
      code: 'ASPARTIMIDE_RISK',
      severity: 'Moderate',
      motif: aspMotifsFound.join(', '),
      description: 'Asp/Asn followed by small residues can undergo base-catalyzed aspartimide rearrangement in Fmoc-SPPS.',
      mitigation: 'Use Oxyma-buffered deprotection or bulky Asp(OMpe) sidechain protection during synthesis.'
    });
  }

  // 4. N-terminal Glutamine -> Pyroglutamate cyclization
  if (cleanSeq.startsWith('Q')) {
    penalty += 5;
    liabilities.push({
      code: 'N_TERM_PYROGLU',
      severity: 'Low',
      motif: 'Q1 (N-terminus)',
      description: 'N-terminal Glutamine can spontaneously cyclize to pyroglutamate under mildly acidic HPLC workup.',
      mitigation: 'Monitor cleavage/RP-HPLC temperature (<25°C) or shift Q away from position 1.'
    });
  }

  // 5. Hydrophobic aggregation stretches (>=4 consecutive hydrophobic residues)
  const stretchMatches = collectMatches(cleanSeq, /[AFILMVWY]{4,}/g);
  if (stretchMatches.length > 0) {
    penalty += stretchMatches.length * 15;
    liabilities.push({
      code: 'HYDROPHOBIC_STRETCH',
      severity: 'High',
      motif: stretchMatches.join(', '),
      description: 'Contiguous hydrophobic stretch >=4 aa drives beta-sheet on-resin aggregation and lower coupling yield.',
      mitigation: 'Use PEG-PS/ChemMatrix low-loading resin and DMSO/NMP co-solvent or microwave-assisted coupling.'
    });
  }

  // 6. Sterically hindered beta-branched adjacent couplings
  const betaHits: string[] = [];
  for (let i = 0; i < n - 1; i++) {
    const pair = cleanSeq.slice(i, i + 2);
    if (BETA_BRANCHED_PAIRS.includes(pair)) {
      betaHits.push(`${pair}@${i + 1}`);
    }
  }
  if (betaHits.length >= 2) {
    penalty += betaHits.length * 5;
    liabilities.push({
      code: 'BETA_BRANCHED_CLUSTER',
      severity: 'Moderate',
      motif: betaHits.join(', '),
      description: 'Multiple adjacent beta-branched residues (Val/Ile/Thr) slow nucleophilic acylation kinetics.',
      mitigation: 'Apply double-coupling cycles (HATU/HOAt) at Val/Ile junctions.'
    });
  }

  // 7. Overall hydrophobic aggregation & solubility check
  if (hydrophobicFraction > 0.6) {
    penalty += 14;
    liabilities.push({
      code: 'AGGREGATION_RATIO',
      severity: 'High',
      motif: `${Math.round(hydrophobicFraction * 100)}% hydrophobic`,
      description: 'Excess overall hydrophobic content (>60%) impairs aqueous solubility and RP-HPLC peak sharpness.',
      mitigation: 'Reconstitute initial stock in 5-10% DMSO or dilute acetic acid prior to buffer dilution.'
    });
  }

  let aqueousSolubility: 'Good' | 'Moderate' | 'Low' = 'Good';
  if (polarFraction < 0.25 || hydrophobicFraction > 0.62) {
    aqueousSolubility = 'Low';
    penalty += 10;
    liabilities.push({
      code: 'LOW_SOLUBILITY',
      severity: 'Moderate',
      motif: `${Math.round(polarFraction * 100)}% polar/charged`,
      description: 'Low fraction of charged/polar residues (<25%) may cause precipitation at MIC assay concentrations.',
      mitigation: 'Increase Lys/Arg content or formulate with 0.01% acetic acid / 0.2% BSA carrier in broth assays.'
    });
  } else if (polarFraction < 0.35 || hydrophobicFraction > 0.5) {
    aqueousSolubility = 'Moderate';
    penalty += 4;
  }

  if (n > 24) {
    penalty += (n - 24) * 2;
  }

  const feasibilityScore = Math.max(20, Math.min(98, 96 - penalty));
  const sppsDifficulty: 'Easy' | 'Moderate' | 'Challenging' =
    feasibilityScore >= 78 ? 'Easy' : feasibilityScore >= 55 ? 'Moderate' : 'Challenging';

  const recommendedMitigations =
    liabilities.length > 0
      ? Array.from(new Set(liabilities.map((flag) => flag.mitigation)))
      : ['Standard single-coupling Fmoc-SPPS on Rink Amide MBHA resin expected to proceed in high crude purity (>85%).'];

  return {
    feasibilityScore,
    sppsDifficulty,
    aqueousSolubility,
    hydrophobicFraction,
    chargedFraction,
    liabilities,
    recommendedMitigations
  };
}
