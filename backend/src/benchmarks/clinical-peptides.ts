import { calculateBiophysicalMetrics } from '../bio-engine/calculators';
import { BiophysicalMetrics } from '../types/peptide';

export interface ClinicalReferencePeptide {
  id: string;
  name: string;
  origin: string;
  sequence: string;
  clinicalStatus: string;
  knownLimitation: string;
  metrics: BiophysicalMetrics;
}

const RAW_REFERENCES = [
  {
    id: 'magainin-2',
    name: 'Magainin-2',
    origin: 'Xenopus laevis (African Clawed Frog skin)',
    sequence: 'GIGKFLHSAKKFGKAFVGEIMNS',
    clinicalStatus: 'Phase III Clinical Trials (Topical Diabetic Foot Ulcers)',
    knownLimitation: 'Susceptible to host serum proteases'
  },
  {
    id: 'll-37',
    name: 'LL-37 (Cathelicidin)',
    origin: 'Human Innate Immune System',
    sequence: 'LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES',
    clinicalStatus: 'Endogenous Human Host Defense Peptide',
    knownLimitation: 'Long sequence (37 aa) makes chemical synthesis expensive'
  },
  {
    id: 'melittin',
    name: 'Melittin (Toxicity Control)',
    origin: 'Apis mellifera (Bee Venom)',
    sequence: 'GIGAVLKVLTTGLPALISWIKRKRQQ',
    clinicalStatus: 'Preclinical / Positive Control for Lysis',
    knownLimitation: 'Severe human erythrocyte hemolysis (High toxicity)'
  }
];

/**
 * [IRFAN'S MODULE]
 * Compares a newly generated candidate against gold-standard clinical AMPs.
 */
export function getClinicalBenchmarks(): ClinicalReferencePeptide[] {
  return RAW_REFERENCES.map((ref) => ({
    ...ref,
    metrics: calculateBiophysicalMetrics(ref.sequence)
  }));
}
