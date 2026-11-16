/**
 * Converts a generated PDB string into standard PDBx/mmCIF (_atom_site) format
 * while preserving exact 3D atomic coordinates and B-factors.
 */
export function convertPdbToCif(pdbContent: string, entryId = 'SYNTHIA_AMP'): string {
  const safeId = entryId
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'SYNTHIA_AMP';

  const lines: string[] = [
    `data_${safeId}`,
    '#',
    `_entry.id   ${safeId}`,
    '#',
    'loop_',
    '_atom_site.group_PDB',
    '_atom_site.id',
    '_atom_site.type_symbol',
    '_atom_site.label_atom_id',
    '_atom_site.label_alt_id',
    '_atom_site.label_comp_id',
    '_atom_site.label_asym_id',
    '_atom_site.label_entity_id',
    '_atom_site.label_seq_id',
    '_atom_site.pdbx_PDB_ins_code',
    '_atom_site.Cartn_x',
    '_atom_site.Cartn_y',
    '_atom_site.Cartn_z',
    '_atom_site.occupancy',
    '_atom_site.B_iso_or_equiv',
    '_atom_site.auth_seq_id',
    '_atom_site.auth_asym_id',
    '_atom_site.pdbx_PDB_model_num'
  ];

  for (const rawLine of pdbContent.split(/\r?\n/)) {
    if (!rawLine.startsWith('ATOM  ')) continue;

    // Parse fixed-width PDB columns (matching pdb-generator.ts format)
    const serial = rawLine.slice(6, 11).trim();
    const atomName = rawLine.slice(12, 16).trim();
    const resName = rawLine.slice(17, 20).trim();
    const chainId = rawLine[21]?.trim() || 'A';
    const resSeq = rawLine.slice(22, 26).trim();
    const x = rawLine.slice(30, 38).trim();
    const y = rawLine.slice(38, 46).trim();
    const z = rawLine.slice(46, 54).trim();
    const occ = rawLine.slice(54, 60).trim() || '1.00';
    const bFactor = rawLine.slice(60, 66).trim() || '0.00';
    const element = rawLine.slice(76, 78).trim() || atomName[0] || 'C';

    if (!serial || !atomName || !resName || !resSeq || !x || !y || !z) continue;

    lines.push(
      `ATOM ${serial} ${element} ${atomName} . ${resName} ${chainId} 1 ${resSeq} ? ${x} ${y} ${z} ${occ} ${bFactor} ${resSeq} ${chainId} 1`
    );
  }

  lines.push('#');
  return lines.join('\n');
}
