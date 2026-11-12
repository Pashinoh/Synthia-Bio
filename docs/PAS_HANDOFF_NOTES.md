# 📋 Catatan Handoff & Next Steps untuk Pas (Pashinoh)

Dokumen ini merangkum apa saja yang sudah disinkronkan dari **PR #1–#5** di `main`, **3 temuan audit pada modul bio-engine/protease**, serta **pembagian tugas Fase 2 Frontend** supaya kita bisa kerja paralel tanpa *merge conflict*.

> Acuan kontrak JSON API lengkap ada di [`docs/API_CONTRACT.md`](./API_CONTRACT.md).

---

## 1. Status Sinkronisasi Backend (PR #1–#5 — Selesai di `main`)

### Yang Sudah Disinkronkan dari Update Pas (PR #1–#4)
1. **Arsitektur Server Terbaru:** Seluruh endpoint API sekarang dipindahkan dari `backend/src/server.ts` ke **`backend/src/app.ts`** (`createApp()`) supaya bisa di-test HTTP secara menyeluruh, sedangkan `server.ts` hanya untuk menyalakan port server.
2. **Integrasi `chargePhCurve`:** `computeChargePhCurve` milik Pas sudah langsung disambungkan ke `POST /api/validate-stability` di `backend/src/app.ts`, dan tipe `aliphaticIndex`, `ChargePhPoint`, serta `ChargePhCurve` sudah digabung di `backend/src/types/peptide.ts`.
3. **Verifikasi Otomatis:** Build TypeScript backend + frontend bersih (`0` error) dan **15/15 unit & HTTP test** di `backend/tests/api.test.ts` + `backend/tests/http.test.ts` lulus.

### Ringkasan Fitur Baru Backend yang Sudah Ditambahkan Irfan
- **AI Latency & Quota Optimization (`gemini.ts`, `ai/groq-client.ts`, `ai/prompt-utils.ts`):** Mode `auto` memprioritaskan Groq (`openai/gpt-oss-120b` dengan `reasoning_effort: 'low'`, rata-rata ~1.5–2.6 detik & hemat ~5x kuota token) dengan fallback ke `qwen/qwen3.8-27b`, Gemini (`gemini-3.5-flash-lite` + 1x retry), serta filter otomatis `isDegenerateSequence` (menolak urutan huruf berulang seperti `KWKWKW...`).
- **Multi-Candidate Batch Screening (`POST /api/generate-batch`):** Menghasilkan & mengurutkan 2–4 kandidat terbaik lintas Gemini, Groq, heuristic, dan directed evolution.
- **Fmoc-SPPS Feasibility Analyzer (`ai/synthesis-feasibility.ts`):** Mendeteksi risiko sintesis lab (`OXIDATION_CYS`, `OXIDATION_MET`, `ASPARTIMIDE_RISK`, `N_TERM_PYROGLU`, `HYDROPHOBIC_STRETCH`, `BETA_BRANCHED_CLUSTER`, estimasi kelarutan).
- **Security & Production Readiness (`middleware/security.ts`, `backend/Dockerfile`):** Security headers, CORS allowlist (`ALLOWED_ORIGINS`), limit body `64kb`, handler JSON error `400`/`404`, dan rate limiter (`429`).

---

## 2. 3 Temuan Audit di Modul Backend Pas (Perlu Dirapikan Sebelum Demo Juri)

Hasil pengujian ketat pada 5 kontrol klinis (`Pexiganan`, `Magainin-2`, `LL-37`, `Melittin`, `Cecropin A I15V`) menunjukkan matematika `helical-wheel.ts`, koordinat atom `.PDB` (`CB` per residu non-Gly), `aliphaticIndex`, dan `computeChargePhCurve` sudah akurat. Namun ada **3 catatan penting**:

### ⚠️ 1) Kalibrasi Racun `Melittin` di `backend/src/bio-engine/calculators.ts` (Prioritas Tinggi)
- **Temuan:** Saat diuji dengan `Melittin` (`GIGAVLKVLTTGLPALISWIKRKRQQ`, racun lebah / kontrol positif toksik), output kalkulator masih menghasilkan:
  - `predictedHemolysisRisk`: **`"Low"`**
  - `therapeuticSelectivityIndex`: **`90 / 100`**
  - Padahal kandidat obat klinis `Pexiganan (MSI-78)` mendapat `Moderate` (`65/100`) dan `Magainin-2` mendapat `Low` (`85/100`).
- **Penyebab:** Konstanta di baris `8–21` hanya menyalin aturan lama (`meanHydrophobicity > 0.38`), dan ekor bermuatan `KRKRQQ` pada Melittin menurunkan nilai rata-rata hidrofobisitas keseluruhan menjadi `0.1`, padahal bagian kepalanya (`GIGAVLKVLTTGLPALISWI`) sangat hidrofobik & melisis sel darah merah.
- **Saran Perbaikan:** Tambahkan pengecekan **puncak hidrofobisitas lokal (sliding window ~8–12 residu)** atau penalti *long hydrophobic core* agar `Melittin` terbaca **`High Risk`** dan tidak mengecoh juri saat dipakai sebagai kontrol toksik.

### 🔧 2) Pembulatan Skor `stabilityScore` di `backend/src/validators/protease-shield.ts` (Baris 75–76)
- **Temuan:** Karena bobot `Elastase` (`0.35`) dan `Chymotrypsin` (`0.6`) dikali `6` tanpa `Math.round`, API mengeluarkan angka floating-point panjang seperti `43.40000000000001` (Magainin-2), `40.400000000000006` (Melittin), atau `59.00000000000001`.
- **Saran Perbaikan:** Gunakan `Math.round(Math.max(25, 95 - penalty))` atau pembulatan 1 desimal agar bersih di UI.

### 🛡️ 3) Guard Parameter `step` di `computeChargePhCurve` (`calculators.ts` Baris 142)
- **Temuan:** Nilai default `step = 0.5` aman, tapi jika pemanggil fungsi mengirim `step <= 0` pada `options`, loop `for` berisiko *infinite loop*.
- **Saran Perbaikan:** Tambahkan validasi `if (!Number.isFinite(step) || step <= 0) throw new Error('pH step must be positive')`.

---

## 3. Pembagian Wilayah Kerja Fase 2: Integrasi Frontend (`frontend/src/`)

Saat ini `frontend/src/` masih berupa **starter awal** (belum memanggil backend Express `:5000`, baru punya 4 patogen, dan belum punya UI untuk fitur-fitur baru kita). Supaya tidak *merge conflict* saat ngoding bareng di `frontend/`:

### 👑 Wilayah Irfan (Koneksi Backend, AI Controls, Optimizer, Batch & Benchmarks)
- `frontend/src/types/peptide.ts` — Sinkronkan seluruh tipe data FE dengan `docs/API_CONTRACT.md`.
- `frontend/src/store/usePeptideStore.ts` — Sambungkan state & fetch client ke Express Backend (`NEXT_PUBLIC_API_URL`, default `http://localhost:5000`): `/api/generate`, `/api/generate-batch`, `/api/optimize`, `/api/benchmarks`, `/api/benchmarks/compare`, `/api/validate-stability`.
- `frontend/src/lib/pathogens.ts` & `frontend/src/components/dashboard/PathogenSelector.tsx` — Update menjadi **6 patogen WHO** sesuai backend.
- `frontend/src/components/dashboard/ParameterControls.tsx` — Tambah selector AI provider (`auto` / `groq` / `gemini` / `dual`) dan mode **Batch Screening** (`2–4` kandidat).
- `frontend/src/components/dashboard/SequenceCard.tsx` & `frontend/src/lib/mock-data.ts` — Tampilkan laporan kelayakan sintesis (`synthesisFeasibility`), histori mutasi optimizer (`POST /api/optimize`), serta perbaiki label mock `Cecropin A (I15V)` sesuai catatan Pas di `PEPTIDE_REFERENCE_GLOSSARY.md`.
- Rapikan fallback starter duplikat (`frontend/src/app/api/generate/route.ts`, `frontend/src/lib/gemini.ts`).

### ⚡ Wilayah Pas / Pashinoh (Visualisasi Biofisika, 3Dmol, Charts & Validation UI)
- **Komponen Baru — 2D Helical Wheel Visualizer** (`frontend/src/components/charts/HelicalWheelChart.tsx`): Render SVG/Canvas dari `POST /api/validate-stability -> helicalWheel` (`nodes`, `momentVector`, `amphipathicFaceQuality`).
- **Komponen Baru — Charge-vs-pH Titration Curve** (`frontend/src/components/charts/ChargePhChart.tsx`): Render grafik garis 21 titik `pH 2.0–12.0` dari `POST /api/validate-stability -> chargePhCurve` dan tandai titik `isoelectricPoint (pI)`.
- **Komponen Baru — Protease Stability Shield Panel**: Tampilkan `stabilityScore`, `estimatedHalfLifeMinutes`, lokasi pemotongan enzim (`Trypsin`, `Chymotrypsin`, `Elastase`), dan strategi stabilisasi.
- **Upgrade Charts & 3D Studio Eksisting:**
  - `frontend/src/components/charts/BiophysicalRadar.tsx` & `AminoAcidProfile.tsx` — Tambahkan metrik baru **`aliphaticIndex`** dan tampilkan komparasi vs referensi klinis (`Pexiganan`, `Magainin-2`, `LL-37`, `Melittin`).
  - `frontend/src/components/canvas3d/MoleculeViewer.tsx` — Poles tampilan 3Dmol.js & mode pewarnaan hidrofobisitas/rantai samping.
  - `frontend/src/components/export/SynthesisModal.tsx` — Tampilkan detail protokol Fmoc-SPPS, metrik, dan tombol unduh `.PDB` / `.FASTA`.

> **Koordinasi `frontend/src/app/page.tsx` & `Header.tsx`:** Susun komponen-komponen di atas sebagai file terpisah terlebih dahulu agar saat digabungkan ke layout utama `page.tsx` minim bentrok.
