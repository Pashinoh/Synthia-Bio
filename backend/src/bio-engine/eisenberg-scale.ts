export interface AminoAcidData {
  oneLetter: string;
  threeLetter: string;
  fullName: string;
  eisenbergHydrophobicity: number; // Consensus Scale (Eisenberg et al. 1984)
  molecularWeight: number; // g/mol
  chargeAtPh74: number; // Effective charge at physiological pH
  pKaSideChain?: number;
  category: 'hydrophobic' | 'hydrophilic' | 'positive' | 'negative' | 'neutral';
}

export const AMINO_ACID_TABLE: Record<string, AminoAcidData> = {
  A: { oneLetter: 'A', threeLetter: 'ALA', fullName: 'Alanine', eisenbergHydrophobicity: 0.62, molecularWeight: 89.09, chargeAtPh74: 0, category: 'hydrophobic' },
  C: { oneLetter: 'C', threeLetter: 'CYS', fullName: 'Cysteine', eisenbergHydrophobicity: 0.29, molecularWeight: 121.15, chargeAtPh74: 0, pKaSideChain: 8.3, category: 'neutral' },
  D: { oneLetter: 'D', threeLetter: 'ASP', fullName: 'Aspartic Acid', eisenbergHydrophobicity: -0.90, molecularWeight: 133.10, chargeAtPh74: -1, pKaSideChain: 3.9, category: 'negative' },
  E: { oneLetter: 'E', threeLetter: 'GLU', fullName: 'Glutamic Acid', eisenbergHydrophobicity: -0.74, molecularWeight: 147.13, chargeAtPh74: -1, pKaSideChain: 4.1, category: 'negative' },
  F: { oneLetter: 'F', threeLetter: 'PHE', fullName: 'Phenylalanine', eisenbergHydrophobicity: 1.19, molecularWeight: 165.19, chargeAtPh74: 0, category: 'hydrophobic' },
  G: { oneLetter: 'G', threeLetter: 'GLY', fullName: 'Glycine', eisenbergHydrophobicity: 0.48, molecularWeight: 75.07, chargeAtPh74: 0, category: 'neutral' },
  H: { oneLetter: 'H', threeLetter: 'HIS', fullName: 'Histidine', eisenbergHydrophobicity: -0.40, molecularWeight: 155.16, chargeAtPh74: 0.1, pKaSideChain: 6.0, category: 'positive' },
  I: { oneLetter: 'I', threeLetter: 'ILE', fullName: 'Isoleucine', eisenbergHydrophobicity: 1.38, molecularWeight: 131.17, chargeAtPh74: 0, category: 'hydrophobic' },
  K: { oneLetter: 'K', threeLetter: 'LYS', fullName: 'Lysine', eisenbergHydrophobicity: -1.50, molecularWeight: 146.19, chargeAtPh74: +1, pKaSideChain: 10.5, category: 'positive' },
  L: { oneLetter: 'L', threeLetter: 'LEU', fullName: 'Leucine', eisenbergHydrophobicity: 1.06, molecularWeight: 131.17, chargeAtPh74: 0, category: 'hydrophobic' },
  M: { oneLetter: 'M', threeLetter: 'MET', fullName: 'Methionine', eisenbergHydrophobicity: 0.64, molecularWeight: 149.21, chargeAtPh74: 0, category: 'hydrophobic' },
  N: { oneLetter: 'N', threeLetter: 'ASN', fullName: 'Asparagine', eisenbergHydrophobicity: -0.78, molecularWeight: 132.12, chargeAtPh74: 0, category: 'hydrophilic' },
  P: { oneLetter: 'P', threeLetter: 'PRO', fullName: 'Proline', eisenbergHydrophobicity: 0.12, molecularWeight: 115.13, chargeAtPh74: 0, category: 'neutral' },
  Q: { oneLetter: 'Q', threeLetter: 'GLN', fullName: 'Glutamine', eisenbergHydrophobicity: -0.85, molecularWeight: 146.15, chargeAtPh74: 0, category: 'hydrophilic' },
  R: { oneLetter: 'R', threeLetter: 'ARG', fullName: 'Arginine', eisenbergHydrophobicity: -2.53, molecularWeight: 174.20, chargeAtPh74: +1, pKaSideChain: 12.5, category: 'positive' },
  S: { oneLetter: 'S', threeLetter: 'SER', fullName: 'Serine', eisenbergHydrophobicity: -0.18, molecularWeight: 105.09, chargeAtPh74: 0, category: 'hydrophilic' },
  T: { oneLetter: 'T', threeLetter: 'THR', fullName: 'Threonine', eisenbergHydrophobicity: -0.05, molecularWeight: 119.12, chargeAtPh74: 0, category: 'hydrophilic' },
  V: { oneLetter: 'V', threeLetter: 'VAL', fullName: 'Valine', eisenbergHydrophobicity: 1.08, molecularWeight: 117.15, chargeAtPh74: 0, category: 'hydrophobic' },
  W: { oneLetter: 'W', threeLetter: 'TRP', fullName: 'Tryptophan', eisenbergHydrophobicity: 0.81, molecularWeight: 204.23, chargeAtPh74: 0, category: 'hydrophobic' },
  Y: { oneLetter: 'Y', threeLetter: 'TYR', fullName: 'Tyrosine', eisenbergHydrophobicity: 0.26, molecularWeight: 181.19, chargeAtPh74: 0, category: 'neutral' }
};

// Boman Index amino acid free energy of transfer (kcal/mol) values
export const BOMAN_TRANSFER_ENERGIES: Record<string, number> = {
  A: 0.17, C: 0.23, D: 1.23, E: 2.02, F: 1.13,
  G: 0.00, H: 0.96, I: 0.31, K: 0.99, L: 0.56,
  M: 0.23, N: 0.42, P: 0.45, Q: 0.58, R: 0.81,
  S: 0.13, T: 0.14, V: 0.07, W: 1.85, Y: 0.94
};
