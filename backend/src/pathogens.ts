import { PathogenProfile } from './types/peptide';

export const WHO_PATHOGENS: PathogenProfile[] = [
  {
    id: 'mrsa',
    name: 'MRSA',
    scientificName: 'Methicillin-resistant Staphylococcus aureus',
    gramType: 'positive',
    whoPriority: 'High',
    targetDiseases: 'Hospital-acquired pneumonia, bloodstream infections, resistant wound sepsis',
    membraneCharacteristics: {
      outerMembraneCharge: -32,
      pgLipidRatio: 58,
      barrierDescription: 'Thick peptidoglycan cell wall enriched with negatively charged teichoic and lipoteichoic acids.'
    },
    recommendedLength: [16, 22],
    suggestedChargeRange: [+5, +8]
  },
  {
    id: 'paeruginosa',
    name: 'P. aeruginosa',
    scientificName: 'Pseudomonas aeruginosa',
    gramType: 'negative',
    whoPriority: 'Critical',
    targetDiseases: 'Ventilator-associated pneumonia, cystic fibrosis lung sepsis, burn wound infections',
    membraneCharacteristics: {
      outerMembraneCharge: -45,
      pgLipidRatio: 28,
      barrierDescription: 'Asymmetric outer membrane containing Lipopolysaccharide (LPS) with divalent cation (Mg2+/Ca2+) crosslinks.'
    },
    recommendedLength: [16, 24],
    suggestedChargeRange: [+6, +9]
  },
  {
    id: 'abaumannii',
    name: 'A. baumannii',
    scientificName: 'Acinetobacter baumannii (Carbapenem-resistant)',
    gramType: 'negative',
    whoPriority: 'Critical',
    targetDiseases: 'ICU bloodstream infections, severe surgical site necrosis, urinary tract sepsis',
    membraneCharacteristics: {
      outerMembraneCharge: -40,
      pgLipidRatio: 35,
      barrierDescription: 'Robust outer membrane with low non-specific porin permeability and lipid A phosphoethanolamine modifications.'
    },
    recommendedLength: [14, 20],
    suggestedChargeRange: [+5, +8]
  },
  {
    id: 'kpneumoniae',
    name: 'K. pneumoniae',
    scientificName: 'Klebsiella pneumoniae (ESBL & Carbapenem-resistant)',
    gramType: 'negative',
    whoPriority: 'Critical',
    targetDiseases: 'Liver abscesses, severe nosocomial pneumonia, neonatal sepsis',
    membraneCharacteristics: {
      outerMembraneCharge: -38,
      pgLipidRatio: 30,
      barrierDescription: 'Dense polysaccharide capsule shielding outer membrane; requires strong polycationic displacement.'
    },
    recommendedLength: [18, 26],
    suggestedChargeRange: [+6, +9]
  }
];

export const DEFAULT_PATHOGEN = WHO_PATHOGENS[0];
