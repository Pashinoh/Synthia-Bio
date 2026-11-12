import { AMINO_ACID_TABLE, BOMAN_TRANSFER_ENERGIES } from './eisenberg-scale';
import { BiophysicalMetrics, AminoAcidCount, HemolysisRisk } from '@/types/peptide';

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

      // Amphipathic vector component
      const angle = i * deltaRad;
      sumCos += data.eisenbergHydrophobicity * Math.cos(angle);
      sumSin += data.eisenbergHydrophobicity * Math.sin(angle);

      // Aliphatic Index residue counts
      if (aa === 'A') alaCount++;
      else if (aa === 'V') valCount++;
      else if (aa === 'I') ileCount++;
      else if (aa === 'L') leuCount++;

      // Boman index transfer energy
      bomanSum += BOMAN_TRANSFER_ENERGIES[aa] ?? 0.5;
    }
  }

  const meanHydrophobicity = parseFloat((totalHydrophobicity / n).toFixed(3));
  const hydrophobicMoment = parseFloat((Math.sqrt(sumCos * sumCos + sumSin * sumSin) / n).toFixed(3));
  const netCharge = parseFloat(charge.toFixed(1));
  const bomanIndex = parseFloat((bomanSum / n).toFixed(2));
  const hydrophobicRatio = parseFloat((hydrophobicResidues / n).toFixed(2));
  const aliphaticIndex = parseFloat(
    (((alaCount + 2.9 * valCount + 3.9 * (ileCount + leuCount)) / n) * 100).toFixed(1)
  );

  // 2. Isoelectric Point (pI) estimation
  const pI = estimateIsoelectricPoint(cleanSeq);

  // 3. Predicted Hemolysis Risk (Cytotoxicity to human erythrocytes)
  // High hydrophobicity (> 0.5) + very high hydrophobic moment (> 0.7) usually causes human hemolysis.
  // Optimal AMPs have high charge (+4 to +8) and moderate hydrophobicity (0.2 to 0.45).
  let hemolysisRisk: HemolysisRisk = 'Low';
  if (meanHydrophobicity > 0.55 || (meanHydrophobicity > 0.45 && hydrophobicMoment > 0.65)) {
    hemolysisRisk = 'High';
  } else if (meanHydrophobicity > 0.38 || hydrophobicMoment > 0.55) {
    hemolysisRisk = 'Moderate';
  }

  // 4. Therapeutic Selectivity Index (0 - 100)
  // Higher is better: prefers bacterial membrane disruption over mammalian hemolysis
  let selectivity = 75;
  if (netCharge >= +4 && netCharge <= +8) selectivity += 15;
  if (hydrophobicMoment >= 0.4 && hydrophobicMoment <= 0.7) selectivity += 10;
  if (hemolysisRisk === 'High') selectivity -= 35;
  if (hemolysisRisk === 'Moderate') selectivity -= 10;
  selectivity = Math.max(10, Math.min(99, selectivity));

  return {
    netCharge,
    meanHydrophobicity,
    hydrophobicMoment,
    isoelectricPoint: pI,
    bomanIndex,
    aliphaticIndex,
    predictedHemolysisRisk: hemolysisRisk,
    therapeuticSelectivityIndex: selectivity,
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
