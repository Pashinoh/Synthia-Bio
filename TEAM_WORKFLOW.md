# 🤝 SynthiaBio — Team Collaboration & Workflow Guide
**Panduan Kerja Kolaboratif Tim 2 Orang (STEM2Connect Hackathon 2026)**

---

## 1. Pembagian Peran & Batas Wilayah Folder

Agar pekerjaan berjalan paralel, cepat, dan **bebas dari git merge conflict**, proyek ini dibagi secara ketat menjadi dua domain kerja:

```
+------------------------------------------------------------------------------------+
|                               STRUKTUR WILAYAH KERJA                               |
+--------------------------------------------------+---------------------------------+
| 👑 KETUA (Tech Lead & Core AI Architect)         | 🎨 REKAN (UI/UX & Frontend Lead)|
|                                                  |                                 |
| • src/lib/bio-engine/ (Kalkulator Sains)         | • src/components/canvas3d/ (3D) |
| • src/lib/gemini.ts (Prompt AI)                  | • src/components/dashboard/ (UI)|
| • src/lib/pathogens.ts (Data Patogen)            | • src/components/charts/ (Chart)|
| • src/app/api/generate/route.ts (API Backend)    | • src/components/export/ (Modal)|
| • src/contracts/ (Kontrak Data Mock)             | • src/app/globals.css (Styling) |
| • Devpost Essay & GitHub Config                  | • Produksi Video Demo (3-4 min) |
+--------------------------------------------------+---------------------------------+
```

---

## 2. Alur Kerja Harian (Git Branching Model)

### 2.1 Branch Utama:
* `main`: Cabang produksi yang harus selalu stabil dan dapat di-build (`npm run build`).

### 2.2 Branch Pengembang:
* **Ketua:** Bekerja di branch `feat/core-ai-engine`
* **Rekan:** Bekerja di branch `feat/ui-3d-visuals`

### 2.3 Protokol Kolaborasi:
1. **Pagi hari:** Selalu lakukan `git pull origin main` sebelum mulai mengedit file.
2. **Saat tugas selesai:** Buat Pull Request (PR) ke `main` atau diskusikan sebelum melakukan merge.
3. **Jangan menyentuh file milik rekan** tanpa konfirmasi sebelumnya.

---

## 3. Kontrak Data Mock (Anti-Blocking Development)

Rekan **TIDAK PERLU MENUNGGU** API Gemini aktif untuk mengerjakan desain web atau 3D viewer.
* Seluruh data mock yang valid dan teruji sudah tersedia di:
  `src/contracts/mock-peptide.json` dan `src/lib/mock-data.ts`.
* Di `src/store/usePeptideStore.ts`, state awal langsung memuat data mock ini secara default.
* Jika `GEMINI_API_KEY` belum dipasang, sistem otomatis mengaktifkan mode *heuristic fallback*, sehingga antarmuka tetap berjalan 100% normal.

---

## 4. Panduan Menjalankan Project di Laptop Rekan

Bagi rekan yang baru clone repository ini:

```bash
# 1. Clone repository
git clone https://github.com/Pashinoh/Synthia-Bio.git
cd Synthia-Bio

# 2. Install dependensi (hanya butuh Node.js 18+)
npm install

# 3. Setup Environment Variables (Opsional)
copy .env.example .env.local
# Masukkan API key jika ada (jika belum ada, biarkan kosong; app tetap jalan)

# 4. Jalankan Development Server
npm run dev

# 5. Buka di browser
# http://localhost:3000
```

---

## 5. Checklist Target Selesai Sebelum 21 November 2026

* [x] **Setup Pondasi & Clean Architecture (Hari 1)**
* [x] **Kalkulator Biofisika & PDB Generator 3D (Hari 2)**
* [x] **Integrasi Gemini 1.5 Flash API Route (Hari 3)**
* [x] **Studio Dashboard UI, 3D WebGL Canvas, & Radar Chart (Hari 4)**
* [ ] **Review Visual & Responsivitas Mobile/Tablet (Hari 5-7 - Rekan)**
* [ ] **Pengujian Live Deploy di Vercel (Hari 7-8 - Ketua)**
* [ ] **Perekaman Video Demo 3–4 Menit (Hari 9-10 - Rekan & Ketua)**
* [ ] **Final Submission ke Devpost sebelum 21 Nov 20:59 PST (Bersama-sama)**
