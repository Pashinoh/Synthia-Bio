# SynthiaBio: Autonomous De Novo Peptide Designer & 3D Molecular Studio

[![STEM2Connect Hackathon](https://img.shields.io/badge/Hackathon-STEM2Connect%202026-00F0FF?style=for-the-badge&logo=devpost)](https://stem2connect-online-hackathon.devpost.com/)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Backend-Express%20TS-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Gemini Flash-Lite](https://img.shields.io/badge/AI%20Core-Gemini%203.5%20Flash--Lite-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![WebGL 3D](https://img.shields.io/badge/3D%20Engine-3Dmol.js%20WebGL-10B981?style=for-the-badge)](https://3dmol.org/)
[![License MIT](https://img.shields.io/badge/License-MIT-amber?style=for-the-badge)](LICENSE)

**STEM2Connect AI Hackathon 2026 Submission**  
- **Primary Track:** Healthcare / Scientific Research  
- **Submission Platform:** [Devpost Submission](https://stem2connect-online-hackathon.devpost.com/)  
- **Demo Video:** [YouTube Link](https://youtu.be/dTcmVQYO10o)  
- **Documentation:** [Handoff Notes](./docs/PAS_HANDOFF_NOTES.md) | [API Contract](./docs/API_CONTRACT.md) | [Full Blueprint](./docs/synthia-bio-master-blueprint.md)  

---

## Executive Summary

Antimicrobial Resistance (AMR) is recognized by the World Health Organization (WHO) as one of the top ten global public health threats facing humanity. Conventional small-molecule antibiotic discovery typically requires 10 to 15 years and over $1.5 billion, while target pathogens rapidly adapt and develop resistance.

SynthiaBio is an autonomous in-silico peptide engineering platform that accelerates de novo antimicrobial peptide (AMP) discovery from years to seconds. By coupling generative language models with rigorous biophysical validation and real-time WebGL molecular visualization, SynthiaBio enables rapid design, in-silico evolution, and wet-lab specification of membrane-active peptide therapeutics targeted against critical WHO priority pathogens.

---

## Core Capabilities

- **Pathogen-Specific Targeting:** Tailored against critical WHO priority superbugs including MRSA, Pseudomonas aeruginosa, Acinetobacter baumannii, and Klebsiella pneumoniae based on membrane lipid ratios and net surface charge.
- **Biophysical Validation Pipeline:** Evaluates five in-silico screening metrics including net cationic charge window, amphipathic helical partitioning, erythrocyte hemolysis safety, serum protease stability, and solid-phase peptide synthesis (SPPS) feasibility.
- **In-Silico Directed Evolution:** Suggests single-point amino acid substitutions to optimize therapeutic index while preserving essential functional motifs.
- **Real-Time 3D Molecular Studio:** Client-side 3D rendering (WebGL via 3Dmol.js) displaying alpha-helical conformations, Eisenberg hydropathy scales, surface charge potentials, and atom-level inspection.
- **Lab-Ready Artifact Export:** Generates standardized coordinates (.PDB, .cif), FASTA sequences, and wet-lab synthesis specification sheets.

---

## AI Disclosure and Attribution

In accordance with the STEM2Connect AI Hackathon submission guidelines, the use of AI tools and models in SynthiaBio is disclosed as follows:

### 1. In-App AI Core (Runtime Inference)
- **Google Gemini (gemini-3.5-flash-lite via @google/genai):** Used server-side as the primary generative engine to synthesize candidate antimicrobial sequences based on physicochemical constraints and pathogen membrane profiles.
- **Groq (openai/gpt-oss-120b):** Utilized as an alternative candidate generator within the multi-model tournament selection engine to ensure sequence diversity.

### 2. AI Coding Assistants
- **Gemini / Antigravity:** Assisted with rapid prototyping of mathematical formulas (Eisenberg consensus hydrophobicity calculations, helical wheel coordinate projections), structuring TypeScript API contracts, and debugging WebGL canvas integration.

All biophysical calculation engines, validation logic, safety filtering thresholds, and frontend architectural code were reviewed, verified, and integrated by the team.

---

## System Architecture

The project is structured as an isolated monorepo with strict separation of concerns:

- `frontend/`: Next.js 16 (App Router, Turbopack, Tailwind CSS v4, Zustand, 3Dmol.js).
- `backend/`: Node.js, Express, TypeScript runtime hosting AI orchestration, sequence tournament logic, and biophysical parsers.
- `docs/`: Technical specifications, REST API contracts, and architecture blueprints.

---

## Installation and Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm 9.x or higher
- Gemini API Key (or Groq API Key)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/synthia-bio.git
cd synthia-bio
```

### 2. Environment Setup
Configure the backend environment variables:
```bash
cp .env.example backend/.env
```
Provide your API credentials in `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

### 3. Install Dependencies
```bash
npm run install:all
```

### 4. Run Development Servers
To start both the frontend (port 3000) and backend (port 5000) concurrently:
```bash
npm run dev:all
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Key Learnings

1. **Domain-Specific AI Prompting:** Off-the-shelf generative models tend to hallucinate impractical peptide sequences without strict biophysical bounding rules. Constraining outputs with Eisenberg hydrophobicity indices and charge windows produced lab-viable candidates.
2. **Client-Side Molecular Simulation:** Rendering complex secondary structures directly in browser WebGL requires careful memory management, particularly when dynamically rebuilding canvas buffers during directed evolution mutations.
3. **Translational Bio-computation:** Bridging computational predictions with real wet-lab constraints (such as Fmoc-SPPS steric hindrance and beta-sheet aggregation risks) is critical for medical relevance.

---

## Future Roadmap (What to Build Next)

- **Molecular Dynamics Simulation:** Integrate coarse-grained membrane penetration simulations (GROMACS / Martini force fields) to simulate real-time lipid bilayer disruption.
- **Laboratory Assay Feedback Loop:** Partner with academic or institutional labs to synthesize the top-ranked AI candidates, test minimum inhibitory concentration (MIC), and feed empirical assay data back into the optimization model.
- **Multi-Target Cocktails:** Extend sequence generation to synergistic dual-action peptides capable of degrading bacterial biofilms alongside cell membrane lysis.

---

## License

This project is open-source under the MIT License.
