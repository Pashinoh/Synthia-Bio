# ⚙️ SynthiaBio — Team Workflow & Phase Tracker

> **Status Saat Ini (12 Nov 2026):** **Fase 1 (Backend-First) SELESAI** (PR #1–#5 sudah ter-merge ke `main`).  
> **Fokus Berikutnya:** 3 revisi kecil audit backend untuk Pas + **Fase 2 (Integrasi Frontend Studio)**.  
> 📌 **Catatan detail untuk Pas (temuan audit + pembagian file FE) ada di [`docs/PAS_HANDOFF_NOTES.md`](./PAS_HANDOFF_NOTES.md).**  
> 📌 **Kontrak endpoint Backend lengkap ada di [`docs/API_CONTRACT.md`](./API_CONTRACT.md).**

---

## 📊 Status Fase Proyek

| Fase | Status | Ringkasan |
|---|---|---|
| **Fase 1: Backend & Core Algorithms** | ✅ **Selesai** (3 polish minor untuk Pas) | AI orchestrator (`groq` + `gemini` + `dual` + heuristic), 6 patogen WHO, optimizer mutasi multi-ronde, clinical benchmarks (`Pexiganan`, `Magainin-2`, `LL-37`, `Melittin`), Fmoc-SPPS feasibility, Helical Wheel, 3D `.PDB`, Protease Shield (`Trypsin`, `Chymotrypsin`, `Elastase`), `aliphaticIndex`, `chargePhCurve`, security/rate-limit middleware, 15/15 automated tests |
| **Fase 2: Integrasi Frontend (`frontend/`)** | 🚧 **Aktif Sekarang** | Sambungkan Next.js UI ke Backend Express (`:5000`), tampilkan Batch Screening, Optimizer, 2D Helical Wheel, Charge-vs-pH Curve, Protease Shield, Benchmarks, SPPS Feasibility, dan rapikan label `Cecropin A` |
| **Fase 3: Deploy, Video Demo & Devpost** | ⏳ **Berikutnya** (Deadline: 21 Nov 2026) | `LICENSE` MIT, CI/CD, deploy publik FE & BE, video demo 3–4 menit, pengisian form Devpost |

---

## 📂 Pembagian Wilayah Kerja — Backend (`backend/src/`) [Terjaga Terpisah]

```text
backend/src/
├── 👑 WILAYAH IRFAN (AI Orchestration, Optimizer, Benchmarks & Security/App)
│   ├── app.ts                           # Express app, semua 8 rute API + validasi input
│   ├── server.ts                        # Bootstrapper port Express (:5000)
│   ├── gemini.ts                        # Router multi-provider (Groq-first auto, Gemini, Dual, Batch)
│   ├── pathogens.ts                     # 6 profil membran superbug WHO
│   ├── ai/                              # groq-client, prompt-utils, mutation-optimizer, synthesis-feasibility, peptide-assembler
│   ├── benchmarks/clinical-peptides.ts  # Magainin-2, Pexiganan, LL-37, Melittin + compare engine
│   └── middleware/security.ts           # Security headers, CORS allowlist, IP rate limiter
│
├── ⚡ WILAYAH PAS / PASHINOH (Biophysical Math, 3D PDB & Protease Validator)
│   ├── bio-engine/
│   │   ├── calculators.ts               # Net charge, Eisenberg, Aliphatic Index, computeChargePhCurve
│   │   ├── eisenberg-scale.ts           # Konstanta fisikokimia 20 asam amino standar
│   │   ├── pdb-generator.ts             # Generator koordinat atom 3D (.PDB) heliks alpha + CB
│   │   └── helical-wheel.ts             # Proyeksi sudut 2D Schiffer-Edmundson Helical Wheel
│   └── validators/protease-shield.ts    # Scanner Trypsin, Chymotrypsin, Elastase & estimasi half-life
│
└── 🤝 KONTRAK BERSAMA
    └── types/peptide.ts                 # Kontrak tipe data TypeScript backend
```

### ⚡ Revisi Minor Backend untuk Pas (Lihat Detail di `PAS_HANDOFF_NOTES.md`)
1. Kalibrasi hemolisis `Melittin` di `calculators.ts` agar kontrol racun terbaca `High Risk` (saat ini masih `Low` / `90`).
2. Pembulatan `stabilityScore` di `protease-shield.ts` (`Math.round`) agar tidak keluar float panjang (`43.40000000000001`).
3. Guard `step <= 0` pada `computeChargePhCurve` di `calculators.ts`.

---

## 🎨 Pembagian Wilayah Kerja — Fase 2 Frontend (`frontend/src/`)

| Developer | Wilayah & Fokus Pekerjaan | File Utama |
|---|---|---|
| **👑 Irfan** | Koneksi store & types ke Express `:5000`, 6 patogen WHO, selector AI provider + Batch Screening, UI Mutation Optimizer & Clinical Benchmarks, Fmoc-SPPS feasibility, label mock `Cecropin A` | `types/peptide.ts`, `store/usePeptideStore.ts`, `lib/pathogens.ts`, `lib/mock-data.ts`, `components/dashboard/PathogenSelector.tsx`, `ParameterControls.tsx`, `SequenceCard.tsx` |
| **⚡ Pas** | Visualisasi 2D Helical Wheel (`POST /api/validate-stability`), grafik kurva muatan `chargePhCurve`, panel Protease Shield, metrik `aliphaticIndex` di radar/profil, polesan 3Dmol viewer & modal ekspor | `components/charts/HelicalWheelChart.tsx` *(baru)*, `components/charts/ChargePhChart.tsx` *(baru)*, panel Protease Shield *(baru)*, `BiophysicalRadar.tsx`, `AminoAcidProfile.tsx`, `canvas3d/MoleculeViewer.tsx`, `export/SynthesisModal.tsx` |

> Untuk layout bersama seperti `frontend/src/app/page.tsx` dan `Header.tsx`, kerjakan komponen masing-masing dulu secara terpisah lalu gabungkan via PR kecil agar terhindar dari *merge conflict*.

---

## 🚀 Cara Menjalankan & Menguji Backend Saat Ini

```bash
# Tarik update terbaru
git pull origin main

# Build & jalankan seluruh 15 automated test backend
npm run build:be
npm run test:be

# Jalankan server backend (:5000)
npm run dev:be
```

Server akan jalan di `http://localhost:5000` (daftar request/response lengkap tersedia di [`docs/API_CONTRACT.md`](./API_CONTRACT.md)).

---

## 🔄 Protokol Git (Feature Branch + PR ke `main`)

1. Selalu mulai dari `main` terbaru: `git pull origin main`
2. Buat branch baru sesuai topik: `git checkout -b feat/nama-fitur`
3. Pastikan build & test lulus sebelum commit (`npm run build:be && npm run test:be` / cek typecheck FE)
4. Push branch dan buka Pull Request ke `main`.
