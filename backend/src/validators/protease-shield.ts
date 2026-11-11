export interface CleavageSite {
  position: number;
  enzyme: 'Trypsin' | 'Chymotrypsin' | 'Elastase';
  motif: string;
  mitigationAdvice: string;
}

export interface ProteaseStabilityReport {
  stabilityScore: number; // 0 - 100
  estimatedHalfLifeMinutes: number;
  cleavageSites: CleavageSite[];
  stabilizationStrategies: string[];
}

/**
 * [PAS'S MODULE]
 * Scans peptide sequences for enzymatic degradation vulnerabilities (Trypsin, Chymotrypsin)
 * and calculates predicted serum stability without requiring ML training.
 */
export function analyzeProteaseStability(sequence: string): ProteaseStabilityReport {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  const cleavageSites: CleavageSite[] = [];

  for (let i = 0; i < cleanSeq.length - 1; i++) {
    const res = cleanSeq[i];
    const nextRes = cleanSeq[i + 1];

    // Trypsin cleaves at C-terminal side of K or R (except when followed by Proline 'P')
    if ((res === 'K' || res === 'R') && nextRes !== 'P') {
      cleavageSites.push({
        position: i + 1,
        enzyme: 'Trypsin',
        motif: `${res}${i + 1}-${nextRes}${i + 2}`,
        mitigationAdvice: `Consider D-amino acid substitution (d-${res.toLowerCase()}) or N-methylation at position ${i + 1}.`
      });
    }

    // Chymotrypsin cleaves at bulky aromatic residues (F, W, Y) unless followed by P
    if ((res === 'F' || res === 'W' || res === 'Y') && nextRes !== 'P') {
      cleavageSites.push({
        position: i + 1,
        enzyme: 'Chymotrypsin',
        motif: `${res}${i + 1}-${nextRes}${i + 2}`,
        mitigationAdvice: `Shield aromatic sidechain via C-alpha methylation or staple helix across i, i+4.`
      });
    }
  }

  const penalty = Math.min(65, cleavageSites.length * 6);
  const stabilityScore = Math.max(25, 95 - penalty);
  const estimatedHalfLifeMinutes = Math.round(15 + stabilityScore * 1.8);

  return {
    stabilityScore,
    estimatedHalfLifeMinutes,
    cleavageSites,
    stabilizationStrategies: [
      'C-terminal amidation (-CONH2) to prevent carboxypeptidase degradation',
      'Terminal D-enantiomer capping at N1 and C-end positions',
      'Hydrocarbon stapling at (i, i+4) non-binding face to lock alpha-helical conformation'
    ]
  };
}
