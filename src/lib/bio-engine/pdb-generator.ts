import { AMINO_ACID_TABLE } from './eisenberg-scale';

/**
 * Synthesizes an industry-standard Protein Data Bank (.PDB) file string
 * representing the 3D atomic coordinates of an amphipathic alpha-helical peptide.
 * Compatible with 3Dmol.js, PyMOL, ChimeraX, and standard bioinformatics viewers.
 */
export function generateAlphaHelixPDB(sequence: string, peptideName: string = 'SYNTHIA_PEPTIDE'): string {
  const cleanSeq = sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
  const lines: string[] = [];

  // Header and Metadata
  lines.push(`HEADER    ANTIMICROBIAL PEPTIDE                   ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`TITLE     SYNTHIABIO DE NOVO DESIGN: ${peptideName}`);
  lines.push(`COMPND    MOL_ID: 1; MOLECULE: ${peptideName}; CHAIN: A; ENGINEERED: YES`);
  lines.push(`SOURCE    SYNTHETIC CONSTRUCT; DESIGN_METHOD: GENERATIVE_AI_AMPHIPATHIC_HELIX`);
  lines.push(`HELIX    1   1 ${getThreeLetter(cleanSeq[0])} A    1  ${getThreeLetter(cleanSeq[cleanSeq.length - 1])} A ${padLeft(cleanSeq.length, 4)}  1                                  ${padLeft(cleanSeq.length, 5)}`);

  let atomIndex = 1;
  const radPerDeg = Math.PI / 180;
  const pitchPerResidue = 1.52; // Angstroms rise per residue in standard alpha-helix
  const anglePerResidue = 100.0 * radPerDeg; // 100 degrees turn per residue

  // Geometric parameters for backbone atom offsets in alpha-helix frame
  const rCA = 2.30;
  const rN = 1.65;
  const rC = 2.15;
  const rO = 2.85;
  const rCB = 3.35;

  for (let i = 0; i < cleanSeq.length; i++) {
    const resSeq = i + 1;
    const aa = cleanSeq[i];
    const data = AMINO_ACID_TABLE[aa] || AMINO_ACID_TABLE['A'];
    const threeLetter = data.threeLetter;
    const bFactor = parseFloat(((data.eisenbergHydrophobicity + 2.5) * 15).toFixed(2)); // Scaled for color-by-bfactor in 3Dmol

    const baseAngle = i * anglePerResidue;
    const zBase = i * pitchPerResidue;

    // 1. Nitrogen (N)
    const angleN = baseAngle - 0.55;
    const xN = rN * Math.cos(angleN);
    const yN = rN * Math.sin(angleN);
    const zN = zBase - 0.45;
    lines.push(formatPdbAtom(atomIndex++, 'N', threeLetter, 'A', resSeq, xN, yN, zN, 1.0, bFactor, 'N'));

    // 2. Alpha Carbon (CA)
    const xCA = rCA * Math.cos(baseAngle);
    const yCA = rCA * Math.sin(baseAngle);
    const zCA = zBase;
    lines.push(formatPdbAtom(atomIndex++, 'CA', threeLetter, 'A', resSeq, xCA, yCA, zCA, 1.0, bFactor, 'C'));

    // 3. Carbonyl Carbon (C)
    const angleC = baseAngle + 0.52;
    const xC = rC * Math.cos(angleC);
    const yC = rC * Math.sin(angleC);
    const zC = zBase + 0.48;
    lines.push(formatPdbAtom(atomIndex++, 'C', threeLetter, 'A', resSeq, xC, yC, zC, 1.0, bFactor, 'C'));

    // 4. Carbonyl Oxygen (O)
    const angleO = baseAngle + 0.68;
    const xO = rO * Math.cos(angleO);
    const yO = rO * Math.sin(angleO);
    const zO = zBase + 0.52;
    lines.push(formatPdbAtom(atomIndex++, 'O', threeLetter, 'A', resSeq, xO, yO, zO, 1.0, bFactor, 'O'));

    // 5. Beta Carbon (CB) - Sidechain anchor (for all except Glycine)
    if (aa !== 'G') {
      const angleCB = baseAngle - 0.25;
      const xCB = rCB * Math.cos(angleCB);
      const yCB = rCB * Math.sin(angleCB);
      const zCB = zBase + 0.85;
      lines.push(formatPdbAtom(atomIndex++, 'CB', threeLetter, 'A', resSeq, xCB, yCB, zCB, 1.0, bFactor, 'C'));
    }
  }

  lines.push('TER');
  lines.push('END');
  return lines.join('\n');
}

/**
 * Formats a single PDB ATOM record following strict PDB column specification.
 */
function formatPdbAtom(
  serial: number,
  name: string,
  resName: string,
  chain: string,
  resSeq: number,
  x: number,
  y: number,
  z: number,
  occupancy: number,
  tempFactor: number,
  element: string
): string {
  const serialStr = padLeft(serial, 5);
  const namePadded = name.length === 1 ? ` ${name}  ` : name.length === 2 ? ` ${name} ` : `${name} `;
  const resNamePadded = padLeft(resName, 3);
  const resSeqStr = padLeft(resSeq, 4);
  const xStr = padLeft(x.toFixed(3), 8);
  const yStr = padLeft(y.toFixed(3), 8);
  const zStr = padLeft(z.toFixed(3), 8);
  const occStr = padLeft(occupancy.toFixed(2), 6);
  const tempStr = padLeft(tempFactor.toFixed(2), 6);
  const elementPadded = padLeft(element, 2);

  return `ATOM  ${serialStr} ${namePadded} ${resNamePadded} ${chain}${resSeqStr}    ${xStr}${yStr}${zStr}${occStr}${tempStr}          ${elementPadded}`;
}

function getThreeLetter(oneLetter: string): string {
  return AMINO_ACID_TABLE[oneLetter]?.threeLetter || 'ALA';
}

function padLeft(val: string | number, length: number): string {
  const str = String(val);
  return str.length >= length ? str : ' '.repeat(length - str.length) + str;
}
