# SynthiaBio Backend API Contract (`v1.0`)

Base URL (Local): `http://localhost:5000`  
Content-Type: `application/json` (max body `64kb`)

---

## Security, CORS & Rate Limiting

- **CORS (`ALLOWED_ORIGINS`):** Comma-separated list of allowed browser origins (e.g., `https://synthia-bio.vercel.app,http://localhost:3000`). Leave unset in local dev to allow any origin. Requests without an `Origin` header (`curl`, server-to-server, healthchecks) are permitted.
- **Rate Limits (`/api/*`):**
  - General API routes: `RATE_LIMIT_MAX` (default `60` requests / `RATE_LIMIT_WINDOW_MS`, default `60000` ms per IP).
  - AI synthesis routes (`POST /api/generate`, `POST /api/generate-batch`): `AI_RATE_LIMIT_MAX` (default `15` requests / window per IP).
  - `GET /health` is exempt for uptime probes.
- **Rate Limit Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (and `Retry-After` on `429`).

---

## Endpoints

### 1. `GET /health`
Returns service readiness and provider key configuration booleans (never exposes secrets).

**Response `200 OK`:**
```json
{
  "status": "online",
  "service": "SynthiaBio AI & Biophysical Engine",
  "geminiConfigured": true,
  "groqConfigured": true,
  "endpoints": [
    "GET  /api/pathogens",
    "GET  /api/benchmarks",
    "POST /api/benchmarks/compare",
    "POST /api/generate",
    "POST /api/generate-batch",
    "POST /api/optimize",
    "POST /api/validate-stability"
  ],
  "timestamp": "2026-11-12T00:00:00.000Z"
}
```

---

### 2. `GET /api/pathogens`
Returns all 6 WHO priority superbug profiles (`mrsa`, `paeruginosa`, `abaumannii`, `kpneumoniae`, `ecoli-cre`, `efaecium-vre`).

**Response `200 OK`:**
```json
{
  "success": true,
  "pathogens": [
    {
      "id": "mrsa",
      "name": "MRSA",
      "scientificName": "Methicillin-resistant Staphylococcus aureus",
      "gramType": "positive",
      "whoPriority": "High",
      "targetDiseases": "...",
      "membraneCharacteristics": {
        "outerMembraneCharge": -32,
        "pgLipidRatio": 58,
        "barrierDescription": "..."
      },
      "recommendedLength": [16, 22],
      "suggestedChargeRange": [5, 8]
    }
  ]
}
```

---

### 3. `POST /api/generate`
Synthesizes a de novo AMP via multi-provider AI (`auto`, `gemini`, `groq`, or `dual` tournament), optionally runs closed-loop evolutionary refinement, calculates Eisenberg metrics, and builds `.PDB` + `.FASTA` + Fmoc-SPPS synthesis protocol.

**Request Body:**
```json
{
  "pathogenId": "mrsa",
  "customPathogenName": "optional custom target when pathogenId is not in catalog",
  "sequenceLength": 18,
  "poreMechanism": "toroidal",
  "safetyThreshold": "high-selectivity",
  "provider": "auto",
  "autoOptimize": true
}
```
- `sequenceLength`: clamped to `[12, 28]` (default `18`)
- `poreMechanism`: `'toroidal' | 'barrel-stave' | 'carpet'` (default `'toroidal'`)
- `safetyThreshold`: `'high-selectivity' | 'balanced'` (default `'high-selectivity'`)
- `provider`: `'auto' | 'gemini' | 'groq' | 'dual'` (default `'auto'`)
- `autoOptimize`: boolean (default `true`)

**Response `200 OK`:**
```json
{
  "success": true,
  "isMockFallback": false,
  "peptide": {
    "id": "synthia-...",
    "name": "Synthia-MRSA-Toroid-1",
    "sequence": "KWKLFKKILKWLKKILKA",
    "length": 18,
    "targetPathogen": "MRSA (Methicillin-resistant Staphylococcus aureus)",
    "mechanism": "toroidal",
    "molecularRationale": "...",
    "membraneAffinityExplanation": "...",
    "aiProviderUsed": "gemini",
    "aiModelUsed": "gemini-3.5-flash-lite",
    "optimizationSummary": {
      "applied": true,
      "originalSequence": "...",
      "originalSelectivity": 90,
      "originalHemolysisRisk": "Low",
      "appliedMutations": ["L13R", "K8A"],
      "notes": "..."
    },
    "synthesisFeasibility": {
      "feasibilityScore": 92,
      "sppsDifficulty": "Easy",
      "aqueousSolubility": "Good",
      "hydrophobicFraction": 0.44,
      "chargedFraction": 0.39,
      "liabilities": [],
      "recommendedMitigations": ["..."]
    },
    "metrics": {
      "netCharge": 7,
      "meanHydrophobicity": 0.21,
      "hydrophobicMoment": 0.56,
      "isoelectricPoint": 10.6,
      "bomanIndex": 1.24,
      "aliphaticIndex": 94.4,
      "predictedHemolysisRisk": "Low",
      "therapeuticSelectivityIndex": 99,
      "hydrophobicResidueRatio": 0.5,
      "positiveResidueCount": 7
    },
    "aminoAcidProfile": [],
    "pdbContent": "HEADER ...",
    "fastaContent": ">...",
    "synthesisProtocol": {
      "nTerminalModification": "...",
      "cTerminalModification": "...",
      "recommendedMethod": "...",
      "purificationTechnique": "...",
      "storageCondition": "..."
    },
    "createdAt": "2026-11-12T00:00:00.000Z"
  }
}
```

---

### 3b. `POST /api/generate-batch`
Screens and ranks `2–4` distinct candidate peptides across Gemini, Groq, heuristic baseline, and closed-loop directed evolution, reporting side-by-side protease, clinical benchmark, and Fmoc-SPPS manufacturability trade-offs.

**Request Body:** Same as `POST /api/generate`, plus optional:
- `maxCandidates`: `2..4` (default `3`)
- `provider`: default `'dual'`

**Response `200 OK`:**
```json
{
  "success": true,
  "targetPathogen": "MRSA (Methicillin-resistant Staphylococcus aureus)",
  "candidateCount": 3,
  "isMockFallback": false,
  "bestCandidate": {
    "rank": 1,
    "compositeFitness": 144.8,
    "proteaseStabilityScore": 41,
    "estimatedHalfLifeMinutes": 89,
    "selectivityVsPexiganan": 34,
    "selectivityVsMelittin": 9,
    "tradeoffSummary": "Selectivity 99/100 | Hemolysis Low | Protease 41/100 (~89 min) | SPPS Easy (92/100)",
    "peptide": { "...": "GeneratedPeptide" }
  },
  "candidates": []
}
```

---

### 4. `POST /api/optimize`
Runs single-point mutation scanning + multi-round directed evolution (`1..5` rounds, default `3`) factoring selectivity, hemolysis safety, pathogen charge target, and serum protease stability.

**Request Body:**
```json
{
  "sequence": "GIGAVLKVLTTGLPALISWIKRKRQQ",
  "pathogenId": "mrsa",
  "rounds": 3
}
```
- `sequence` validation: requires `6–60` valid standard 1-letter amino acid codes (`ACDEFGHIKLMNPQRSTVWY`); returns `400 Bad Request` otherwise.

**Response `200 OK`:**
```json
{
  "success": true,
  "originalSequence": "GIGAVLKVLTTGLPALISWIKRKRQQ",
  "targetPathogenId": "mrsa",
  "baseMetrics": { "...": "..." },
  "recommendedMutations": [
    {
      "position": 3,
      "originalResidue": "G",
      "mutatedResidue": "R",
      "mutationCode": "G3R",
      "mutatedSequence": "...",
      "metrics": { "...": "..." },
      "proteaseStabilityScore": 35,
      "improvementDelta": 9,
      "compositeScoreDelta": 10.75,
      "rationale": "..."
    }
  ],
  "evolutionTrajectory": {
    "originalSequence": "...",
    "finalSequence": "...",
    "roundsExecuted": 3,
    "initialMetrics": { "...": "..." },
    "finalMetrics": { "...": "..." },
    "initialProtease": { "...": "..." },
    "finalProtease": { "...": "..." },
    "initialFitness": 117.2,
    "finalFitness": 135.4,
    "appliedMutations": ["G3R", "W19A", "K23A"],
    "steps": []
  }
}
```

---

### 5. `GET /api/benchmarks`
Returns biophysical & protease scores for clinical/control reference peptides (`pexiganan-msi78`, `magainin-2`, `ll-37`, `melittin`).

---

### 6. `POST /api/benchmarks/compare`
Compares a candidate sequence directly against all clinical benchmarks.

**Request Body:**
```json
{
  "sequence": "KWKLFKKILKWLKKILKA",
  "candidateName": "Synthia-MRSA-1"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "report": {
    "candidateName": "Synthia-MRSA-1",
    "sequence": "KWKLFKKILKWLKKILKA",
    "length": 18,
    "candidateMetrics": { "...": "..." },
    "candidateProteaseScore": 30,
    "comparisons": [
      {
        "referenceId": "pexiganan-msi78",
        "referenceName": "Pexiganan (MSI-78)",
        "referenceStatus": "...",
        "referenceMetrics": { "...": "..." },
        "referenceProteaseScore": 25,
        "selectivityDelta": 34,
        "hydrophobicityDelta": 0.12,
        "hydrophobicMomentDelta": 0.08,
        "proteaseStabilityDelta": 5,
        "lengthDelta": -4,
        "hemolysisComparison": "Matched (Low vs Low)"
      }
    ],
    "overallVerdict": "..."
  }
}
```

---

### 7. `POST /api/validate-stability`
Analyzes enzymatic cleavage vulnerabilities (`Trypsin`, `Chymotrypsin`, `Elastase`), computes 2D Schiffer-Edmundson helical wheel projections, and generates the Henderson-Hasselbalch charge-vs-pH titration curve (`pH 2.0..12.0`).

**Request Body:**
```json
{
  "sequence": "KWKLFKKILKWLKKILKA"
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "sequence": "KWKLFKKILKWLKKILKA",
  "proteaseReport": {
    "stabilityScore": 30,
    "estimatedHalfLifeMinutes": 69,
    "cleavageSites": [],
    "stabilizationStrategies": []
  },
  "helicalWheel": {
    "nodes": [],
    "momentVector": { "magnitude": 0.56, "angleDeg": 120, "dx": 0.1, "dy": 0.2 },
    "amphipathicFaceQuality": "Strong Partition"
  },
  "chargePhCurve": {
    "points": [
      { "ph": 2.0, "charge": 8.0 }
    ],
    "isoelectricPoint": 10.6
  }
}
```

---

## Standard Error Responses
- `400 Bad Request`: Missing/invalid peptide sequence (`< 6` or `> 60` standard residues) or malformed JSON payload (`{ "success": false, "error": "..." }`).
- `404 Not Found`: Unknown endpoint (`{ "success": false, "error": "Endpoint not found" }`).
- `429 Too Many Requests`: Rate limit exceeded (`{ "success": false, "error": "...", "retryAfterSeconds": 45 }`).
- `500 Internal Server Error`: Unexpected internal error.

---

## Environment & Docker Deployment (`backend/Dockerfile`)
Required/optional environment variables (see `backend/.env.example`):
- `PORT` (default `5000`)
- `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-3.5-flash-lite`)
- `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`)
- `ALLOWED_ORIGINS` (comma-separated frontend URLs in production)
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AI_RATE_LIMIT_MAX`
