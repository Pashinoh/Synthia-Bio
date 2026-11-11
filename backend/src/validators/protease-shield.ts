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

    // Trypsin cleaves on the C-terminal side of Lys/Arg (Keil specificity: Lys|, Arg|),
    // except when followed by Proline, which kinks the backbone and blocks the enzyme.
    if ((res === 'K' || res === 'R') && nextRes !== 'P') {
      cleavageSites.push({
        position: i + 1,
        enzyme: 'Trypsin',
        motif: `${res}${i + 1}-${nextRes}${i + 2}`,
        mitigationAdvice: `Consider D-amino acid substitution (d-${res.toLowerCase()}) or N-methylation at position ${i + 1}.`
      });
    }

    // Chymotrypsin cleaves on the C-terminal side of bulky aromatic residues (F, W, Y;
    // Keil specificity: Phe|, Trp|, Tyr|), except when followed by Proline.
    if ((res === 'F' || res === 'W' || res === 'Y') && nextRes !== 'P') {
      cleavageSites.push({
        position: i + 1,
        enzyme: 'Chymotrypsin',
        motif: `${res}${i + 1}-${nextRes}${i + 2}`,
        mitigationAdvice: `Shield aromatic sidechain via C-alpha methylation or staple helix across i, i+4.`
      });
    }

    // Elastase cleaves on the C-terminal side of small neutral residues (Keil specificity:
    // Ala|, Gly|, Ser|, Val| approximated; in-silico rule uses A, V, G, S, T), except
    // when followed by Proline. shortcut: approximation, not experimentally calibrated.
    if ((res === 'A' || res === 'V' || res === 'G' || res === 'S' || res === 'T') && nextRes !== 'P') {
      cleavageSites.push({
        position: i + 1,
        enzyme: 'Elastase',
        motif: `${res}${i + 1}-${nextRes}${i + 2}`,
        mitigationAdvice: `Substitute with a bulky hydrophobic residue (Leu, Ile) or N-methylate at position ${i + 1} to shield elastase access.`
      });
    }
  }

  // Serum half-life model (deterministic, no ML):
  // cleavage sites are weighted by the relative serum protease activity of each motif
  // class — trypsin-like cleavage at cationic K/R sites dominates peptide degradation
  // in serum (1.0), chymotrypsin-like aromatic cleavage proceeds at roughly half that
  // rate (0.6), and elastase-like small-residue cleavage contributes least (0.35).
  // The weighted density maps to a stability score (25-95), then to minutes.
  const ENZYME_WEIGHTS: Record<CleavageSite['enzyme'], number> = {
    Trypsin: 1.0,
    Chymotrypsin: 0.6,
    Elastase: 0.35
  };
  const weightedSites = cleavageSites.reduce((acc, site) => acc + ENZYME_WEIGHTS[site.enzyme], 0);
  const penalty = Math.min(65, weightedSites * 6);
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
