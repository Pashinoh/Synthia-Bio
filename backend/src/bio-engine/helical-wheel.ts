import { AMINO_ACID_TABLE } from './eisenberg-scale';

export interface HelicalWheelNode {
  position: number;
  residue: string;
  fullName: string;
  angleDeg: number;
  x: number; // Normalized [-1, 1] unit circle coordinate
  y: number;
  category: 'hydrophobic' | 'hydrophilic' | 'positive' | 'negative' | 'neutral';
  hydrophobicity: number;
}

export interface HelicalWheelProjection {
  nodes: HelicalWheelNode[];
  momentVector: {
    magnitude: number;
    angleDeg: number;
    dx: number;
    dy: number;
  };
  amphipathicFaceQuality: 'Strong Partition' | 'Moderate Partition' | 'Mixed/Weak';
}

/**
 * [PAS'S MODULE]
 * Computes Schiffer-Edmundson 2D Helical Wheel coordinates (100-degree azimuthal rotation per residue)
 * and the directional Hydrophobic Moment vector.
 */
export function computeHelicalWheel(sequence: string): HelicalWheelProjection {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  const nodes: HelicalWheelNode[] = [];

  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < cleanSeq.length; i++) {
    const aa = cleanSeq[i];
    const data = AMINO_ACID_TABLE[aa] || AMINO_ACID_TABLE['A'];
    const angleDeg = (i * 100) % 360;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Increasing radial ring slightly if >18 residues to avoid visual overlap
    const radius = i < 18 ? 1.0 : 1.22;
    const x = parseFloat((radius * Math.cos(angleRad)).toFixed(3));
    const y = parseFloat((radius * Math.sin(angleRad)).toFixed(3));

    sumX += data.eisenbergHydrophobicity * Math.cos(angleRad);
    sumY += data.eisenbergHydrophobicity * Math.sin(angleRad);

    nodes.push({
      position: i + 1,
      residue: aa,
      fullName: data.fullName,
      angleDeg,
      x,
      y,
      category: data.category,
      hydrophobicity: data.eisenbergHydrophobicity
    });
  }

  const n = Math.max(1, cleanSeq.length);
  const magnitude = parseFloat((Math.sqrt(sumX * sumX + sumY * sumY) / n).toFixed(3));
  let momentAngleDeg = Math.round((Math.atan2(sumY, sumX) * 180) / Math.PI);
  if (momentAngleDeg < 0) momentAngleDeg += 360;

  const amphipathicFaceQuality =
    magnitude >= 0.45 ? 'Strong Partition' : magnitude >= 0.28 ? 'Moderate Partition' : 'Mixed/Weak';

  return {
    nodes,
    momentVector: {
      magnitude,
      angleDeg: momentAngleDeg,
      dx: parseFloat((sumX / n).toFixed(3)),
      dy: parseFloat((sumY / n).toFixed(3))
    },
    amphipathicFaceQuality
  };
}
