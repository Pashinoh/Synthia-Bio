# ⚙️ SynthiaBio — Backend-First Team Workflow Guide
**Strategi Fokus: Solidkan Backend & Engine Dulu (Zero Model Training), Frontend Belakangan!**

---

## 🎯 Strategi Utama Kita Sekarang

1. **Fase 1 (Sekarang): Fokus 100% Bikin Backend Solid Berdua!**
   * Urusan *Frontend (`frontend/`)* kita **parkir dulu** (fondasi FE sudah ada dan jalan, nanti tinggal poles di akhir kalau Backend sudah matang).
   * **TIDAK ADA TRAINING MODEL ML BERAT:** Kita tidak pakai training PyTorch/TensorFlow dari nol yang bikin laptop meledak. Semua kecerdasan bertumpu pada **Google Gemini API (`gemini-3.5-flash-lite`) + Algoritma Biofisika & Matematika Komputasi (TypeScript)**.
2. **Tetap 1 Branch (`main`) & Anti-Bentrok:**
   * **Irfan** dan **Pas (Pashinoh)** sama-sama ngoding di dalam folder `backend/src/`, tetapi di **sub-folder modul yang terpisah** supaya tidak pernah kena *merge conflict*.

---

## 📂 Pembagian Wilayah Kerja di `backend/src/` (Irfan vs Pas)

```text
backend/src/
│
├── 👑 WILAYAH IRFAN (AI Orchestration, Mutation Optimizer & Clinical Benchmarks)
│   ├── gemini.ts                        # Prompt engineering & structured JSON Gemini API
│   ├── pathogens.ts                     # Profil membran superbug WHO (MRSA, Pseudomonas, dll.)
│   ├── ai/
│   │   └── mutation-optimizer.ts        # Algoritma In-Silico Directed Evolution (substitusi residu)
│   └── benchmarks/
│       └── clinical-peptides.ts         # Komparasi kandidat AI vs obat klinis (Magainin-2, LL-37)
│
├── ⚡ WILAYAH PAS / PASHINOH (Biophysical Math, 3D PDB & Protease Validator)
│   ├── bio-engine/
│   │   ├── calculators.ts               # Kalkulator Net Charge, Eisenberg Hydrophobicity, Boman Index
│   │   ├── eisenberg-scale.ts           # Konstanta fisikokimia 20 asam amino standar
│   │   ├── pdb-generator.ts             # Generator koordinat atom 3D (.PDB) heliks alpha
│   │   └── helical-wheel.ts             # Proyeksi sudut 2D Schiffer-Edmundson Helical Wheel (100°/residu)
│   └── validators/
│       └── protease-shield.ts           # Detektor pemotongan enzim (Trypsin/Chymotrypsin) & stabilitas darah
│
└── 🤝 FILE BERSAMA (Router Utama)
    ├── server.ts                        # Express API Server (:5000)
    └── types/peptide.ts                 # Kontrak tipe data TypeScript
```

---

## 🛠️ Detail Tugas Masing-Masing di Fase 1 (Backend-First)

### 👑 Tugas Irfan (AI & Optimization Lead)
1. **AI Sequence Synthesis (`src/gemini.ts`):**
   * Pasang `GEMINI_API_KEY` di `backend/.env` dan pastikan respon JSON dari Gemini selalu konsisten mengikuti panjang asam amino yang diminta.
2. **In-Silico Mutation Optimizer (`src/ai/mutation-optimizer.ts` — Endpoint: `POST /api/optimize`):**
   * Mengembangkan algoritma *single-point mutation scanner* yang mencari substitusi 1 huruf asam amino terbaik untuk menaikkan *Therapeutic Selectivity Index* dan menurunkan risiko pecahnya sel darah merah (*hemolysis*).
3. **Clinical Benchmark Engine (`src/benchmarks/clinical-peptides.ts` — Endpoint: `GET /api/benchmarks`):**
   * Menyediakan data pembanding peptida standar medis (seperti *Magainin-2*, *LL-37*, dan *Melittin*) agar juri bisa melihat seberapa unggul peptida hasil desain sistem kita.

---

### ⚡ Tugas Pas / Pashinoh (Biophysics, 3D Geometry & Validation Lead)
*(100% Pure Backend Logic & Math — Tanpa Training Model & Tanpa Nyentuh CSS/Frontend!)*
1. **Biophysical & Helical Wheel Engine (`src/bio-engine/calculators.ts` & `helical-wheel.ts`):**
   * Memperkuat perhitungan biofisika (bisa ditambah *Aliphatic Index* untuk ketahanan suhu atau kurva muatan terhadap perubahan pH asam-basa).
   * Mengembangkan kalkulasi koordinat lingkaran 2D **Helical Wheel** (`helical-wheel.ts`) untuk membuktikan pemisahan sisi hidrofobik dan hidrofilik secara geometris.
2. **Protease Degradation Shield (`src/validators/protease-shield.ts` — Endpoint: `POST /api/validate-stability`):**
   * Membangun algoritma scanner yang mendeteksi titik rawan pemotongan peptida oleh enzim tubuh manusia (*Trypsin* & *Chymotrypsin*), menghitung estimasi waktu paruh (*half-life*), dan memberi rekomendasi modifikasi kimia (seperti *D-amino acid capping*).
3. **3D PDB Coordinate Synthesizer (`src/bio-engine/pdb-generator.ts`):**
   * Memastikan output string `.PDB` memiliki geometri atom backbone ($N, C_\alpha, C, O, C_\beta$) yang akurat untuk dirender maupun diunduh ke software kimia seperti PyMOL.

---

## 🚀 Cara Menjalankan & Menguji Backend Saja

Kalian berdua cukup buka terminal dan jalankan **Backend saja** (tanpa perlu menyalakan Frontend):

```bash
# 1. Tarik update terbaru dari branch main
git pull origin main

# 2. Jalankan server Backend (otomatis reload setiap ada perubahan file)
npm run dev:be
```

Server akan jalan di `http://localhost:5000`. Kalian bisa langsung ngetes semua endpoint pakai **Postman / Thunder Client / cURL**:

* **Cek Status Server:**
  `GET http://localhost:5000/health`
* **Tes Generate Peptida Baru:**
  ```bash
  curl -X POST http://localhost:5000/api/generate -H "Content-Type: application/json" -d "{\"pathogenId\":\"mrsa\",\"sequenceLength\":18,\"poreMechanism\":\"toroidal\",\"safetyThreshold\":\"high-selectivity\"}"
  ```
* **Tes Mutation Optimizer (Wilayah Irfan):**
  ```bash
  curl -X POST http://localhost:5000/api/optimize -H "Content-Type: application/json" -d "{\"sequence\":\"KWKLFKKIEKVGQNVRDG\"}"
  ```
* **Tes Protease Stability & Helical Wheel (Wilayah Pas):**
  ```bash
  curl -X POST http://localhost:5000/api/validate-stability -H "Content-Type: application/json" -d "{\"sequence\":\"KWKLFKKIEKVGQNVRDG\"}"
  ```

---

## 🔄 Protokol Git Harian (Tetap 1 Branch `main`)

```bash
# Sebelum mulai ngoding:
git pull origin main

# Setelah selesai ngoding:
git add .
git commit -m "feat(be): deskripsi singkat update"
git push origin main
```

Begitu seluruh endpoint Backend di atas sudah solid dan teruji, baru di tahap akhir kita sambungkan ke Frontend!
