import { AMINO_ACID_TABLE, BOMAN_TRANSFER_ENERGIES } from './eisenberg-scale';
import { BiophysicalMetrics, AminoAcidCount, HemolysisRisk } from '../types/peptide';

// ---- Calibration constants (hemolysis risk bands & Therapeutic Selectivity Index) ----
// Rationale: the accepted AMP physicochemical envelope — cationic net charge +4..+8 at
// pH 7.4, moderate mean hydrophobicity (Eisenberg scale ~0.2..0.55), amphipathic moment
// window ~0.4..0.7. Values reproduce the pre-refactor inline logic exactly (parity).
const HEMOLYSIS_HIGH_HYDRO = 0.55;        // mean hydrophobicity alone => High risk
const HEMOLYSIS_HIGH_PRECONDITION = 0.45; // combined with moment below => High risk
const HEMOLYSIS_HIGH_MOMENT = 0.65;
const HEMOLYSIS_MODERATE_HYDRO = 0.38;
const HEMOLYSIS_MODERATE_MOMENT = 0.55;
const TSI_BASE = 75;
const TSI_CHARGE_WINDOW: [number, number] = [4, 8]; // cationic sweet spot
const TSI_CHARGE_BONUS = 15;
const TSI_MOMENT_WINDOW: [number, number] = [0.4, 0.7]; // amphipathic sweet spot
const TSI_MOMENT_BONUS = 10;
const TSI_HIGH_RISK_PENALTY = 35;
const TSI_MODERATE_RISK_PENALTY = 10;
const TSI_MIN = 10;
const TSI_MAX = 99;

// Aliphatic Index weights (Ikai 1980): thermal-stability proxy from Ala/Val/Ile/Leu
// mole percentages. Frame: lab-credibility signal, not a primary safety metric.
const ALIPHATIC_A_WEIGHT = 1.0;
const ALIPHATIC_V_WEIGHT = 2.9;
const ALIPHATIC_IL_WEIGHT = 3.9;

/**
 * Calculates deterministic biophysical metrics for any peptide sequence.
 * 100% mathematical, zero hallucinations.
 */
export function calculateBiophysicalMetrics(sequence: string): BiophysicalMetrics {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  const n = cleanSeq.length;

  if (n === 0) {
    throw new Error('Sequence must contain at least one valid amino acid residue');
  }

  // 1. Net Charge at pH 7.4 (including N-terminus +1 and C-terminus -1)
  let positiveCount = 0;
  let charge = 1.0 - 1.0; // N-terminus (+1) and C-terminus (-1) cancel at neutrality
  let totalHydrophobicity = 0;
  let hydrophobicResidues = 0;
  let bomanSum = 0;
  let alaCount = 0;
  let valCount = 0;
  let ileCount = 0;
  let leuCount = 0;

  // For Hydrophobic Moment (<mu_H>):
  // Vector sum with periodicity delta = 100 degrees (1.74533 rad) for alpha-helix
  const deltaRad = (100 * Math.PI) / 180;
  let sumCos = 0;
  let sumSin = 0;

  for (let i = 0; i < n; i++) {
    const aa = cleanSeq[i];
    const data = AMINO_ACID_TABLE[aa];

    if (data) {
      // Charge
      charge += data.chargeAtPh74;
      if (aa === 'K' || aa === 'R') {
        positiveCount++;
      }

      // Hydrophobicity
      totalHydrophobicity += data.eisenbergHydrophobicity;
      if (data.category === 'hydrophobic') {
        hydrophobicResidues++;
      }

      // Aliphatic Index residue counts
      if (aa === 'A') alaCount++;
      else if (aa === 'V') valCount++;
      else if (aa === 'I') ileCount++;
      else if (aa === 'L') leuCount++;

      // Amphipathic vector component
      const angle = i * deltaRad;
      sumCos += data.eisenbergHydrophobicity * Math.cos(angle);
      sumSin += data.eisenbergHydrophobicity * Math.sin(angle);

      // Boman index transfer energy
      bomanSum += BOMAN_TRANSFER_ENERGIES[aa] ?? 0.5;
    }
  }

  const meanHydrophobicity = parseFloat((totalHydrophobicity / n).toFixed(3));
  const hydrophobicMoment = parseFloat((Math.sqrt(sumCos * sumCos + sumSin * sumSin) / n).toFixed(3));
  const netCharge = parseFloat(charge.toFixed(1));
  const bomanIndex = parseFloat((bomanSum / n).toFixed(2));
  const hydrophobicRatio = parseFloat((hydrophobicResidues / n).toFixed(2));

  // 2. Isoelectric Point (pI) estimation
  const pI = estimateIsoelectricPoint(cleanSeq);

  // 3. Predicted Hemolysis Risk (Cytotoxicity to human erythrocytes)
  // High hydrophobicity (> 0.5) + very high hydrophobic moment (> 0.7) usually causes human hemolysis.
  // Optimal AMPs have high charge (+4 to +8) and moderate hydrophobicity (0.2 to 0.45).
  let hemolysisRisk: HemolysisRisk = 'Low';
  if (meanHydrophobicity > HEMOLYSIS_HIGH_HYDRO || (meanHydrophobicity > HEMOLYSIS_HIGH_PRECONDITION && hydrophobicMoment > HEMOLYSIS_HIGH_MOMENT)) {
    hemolysisRisk = 'High';
  } else if (meanHydrophobicity > HEMOLYSIS_MODERATE_HYDRO || hydrophobicMoment > HEMOLYSIS_MODERATE_MOMENT) {
    hemolysisRisk = 'Moderate';
  }

  // 4. Therapeutic Selectivity Index (0 - 100)
  // Higher is better: prefers bacterial membrane disruption over mammalian hemolysis
  let selectivity = TSI_BASE;
  if (netCharge >= TSI_CHARGE_WINDOW[0] && netCharge <= TSI_CHARGE_WINDOW[1]) selectivity += TSI_CHARGE_BONUS;
  if (hydrophobicMoment >= TSI_MOMENT_WINDOW[0] && hydrophobicMoment <= TSI_MOMENT_WINDOW[1]) selectivity += TSI_MOMENT_BONUS;
  if (hemolysisRisk === 'High') selectivity -= TSI_HIGH_RISK_PENALTY;
  if (hemolysisRisk === 'Moderate') selectivity -= TSI_MODERATE_RISK_PENALTY;
  selectivity = Math.max(TSI_MIN, Math.min(TSI_MAX, selectivity));

  // 5. Aliphatic Index (Ikai 1980) — thermal stability proxy
  const aliphaticIndex = parseFloat(
    (
      ((alaCount + ALIPHATIC_V_WEIGHT * valCount + ALIPHATIC_IL_WEIGHT * (ileCount + leuCount)) / n) *
      100
    ).toFixed(1)
  );

  return {
    netCharge,
    meanHydrophobicity,
    hydrophobicMoment,
    isoelectricPoint: pI,
    bomanIndex,
    predictedHemolysisRisk: hemolysisRisk,
    therapeuticSelectivityIndex: selectivity,
    aliphaticIndex,
    hydrophobicResidueRatio: hydrophobicRatio,
    positiveResidueCount: positiveCount
  };
}

/**
 * Calculates the complete amino acid composition breakdown.
 */
export function getAminoAcidProfile(sequence: string): AminoAcidCount[] {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  const n = cleanSeq.length;
  const counts: Record<string, number> = {};

  for (const aa of cleanSeq) {
    counts[aa] = (counts[aa] || 0) + 1;
  }

  return Object.entries(AMINO_ACID_TABLE)
    .filter(([oneLetter]) => (counts[oneLetter] || 0) > 0)
    .map(([oneLetter, data]) => {
      const count = counts[oneLetter] || 0;
      return {
        code: oneLetter,
        name: data.fullName,
        count,
        percentage: parseFloat(((count / n) * 100).toFixed(1)),
        category: data.category
      };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * [PAS] Public charge-vs-pH profile: samples the internal Henderson-Hasselbalch
 * charge model across a pH range and returns the titration curve plus the pI.
 * Default range pH 2.0-12.0, step 0.5 (21 points).
 */
export interface ChargePhPoint {
  ph: number;
  charge: number;
}

export interface ChargePhCurve {
  points: ChargePhPoint[];
  isoelectricPoint: number;
}

export function computeChargePhCurve(
  sequence: string,
  options?: { minPh?: number; maxPh?: number; step?: number }
): ChargePhCurve {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  if (cleanSeq.length === 0) {
    throw new Error('Sequence must contain at least one valid amino acid residue');
  }

  const minPh = options?.minPh ?? 2.0;
  const maxPh = options?.maxPh ?? 12.0;
  const step = options?.step ?? 0.5;

  const points: ChargePhPoint[] = [];
  for (let i = 0; i * step + minPh <= maxPh + 1e-9; i++) {
    const ph = minPh + i * step;
    points.push({
      ph: parseFloat(ph.toFixed(2)),
      charge: parseFloat(calculateChargeAtPh(cleanSeq, ph).toFixed(3))
    });
  }

  return { points, isoelectricPoint: estimateIsoelectricPoint(cleanSeq) };
}

/**
 * Iterative bisection algorithm to estimate the Isoelectric Point (pI).
 */
function estimateIsoelectricPoint(sequence: string): number {
  let lowPh = 3.0;
  let highPh = 13.0;
  const tolerance = 0.01;

  for (let iter = 0; iter < 100; iter++) {
    const midPh = (lowPh + highPh) / 2;
    const currentCharge = calculateChargeAtPh(sequence, midPh);

    if (Math.abs(currentCharge) < tolerance) {
      return parseFloat(midPh.toFixed(2));
    }

    if (currentCharge > 0) {
      lowPh = midPh;
    } else {
      highPh = midPh;
    }
  }

  return parseFloat(((lowPh + highPh) / 2).toFixed(2));
}

function calculateChargeAtPh(sequence: string, ph: number): number {
  // Terminal pKa values
  const nTermPka = 9.6;
  const cTermPka = 2.3;

  let charge = 1 / (1 + Math.pow(10, ph - nTermPka)) - 1 / (1 + Math.pow(10, cTermPka - ph));

  // Side chain pKas
  const pKas: Record<string, { pKa: number; isBasic: boolean }> = {
    D: { pKa: 3.9, isBasic: false },
    E: { pKa: 4.1, isBasic: false },
    C: { pKa: 8.3, isBasic: false },
    Y: { pKa: 10.1, isBasic: false },
    H: { pKa: 6.0, isBasic: true },
    K: { pKa: 10.5, isBasic: true },
    R: { pKa: 12.5, isBasic: true }
  };

  for (const aa of sequence) {
    const config = pKas[aa];
    if (config) {
      if (config.isBasic) {
        charge += 1 / (1 + Math.pow(10, ph - config.pKa));
      } else {
        charge -= 1 / (1 + Math.pow(10, config.pKa - ph));
      }
    }
  }

  return charge;
}
