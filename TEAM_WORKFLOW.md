# 🤝 SynthiaBio — Single-Branch Team Workflow Guide
**Panduan Kerja 1 Branch (Main) dengan Pemisahan Fisik Frontend & Backend**

---

## ⚡ Prinsip Kerja: 1 Branch (`main`) & Anti-Conflict

Untuk kenyamanan Anda dan rekan, kita **hanya menggunakan 1 branch utama (`main`)**. 
Tidak perlu repot membuat branch baru, switch branch, atau membuat Pull Request yang rumit!

### Kenapa Bebas Bentrok (*Zero Merge Conflict*)?
Karena repositori dipisahkan secara fisik menjadi **dua folder independen**:
1. 🎨 **Folder `frontend/`** $\rightarrow$ Dikelola oleh **Rekan**
2. 👑 **Folder `backend/`** $\rightarrow$ Dikelola oleh **Ketua**

Selama rekan hanya mengedit file di dalam `frontend/` dan ketua hanya mengedit file di dalam `backend/`, proses `git pull` dan `git push` ke `main` **dijamin 100% tidak akan pernah mengalami konflik!**

---

## 📂 Peta Wilayah Folder Tim

```text
Synthia-Bio/
│
├── 🎨 frontend/                     # WILAYAH REKAN (UI, 3D Canvas, & Visuals)
│   ├── src/
│   │   ├── components/
│   │   │   ├── canvas3d/            # 3Dmol.js WebGL Molecular Viewer
│   │   │   ├── dashboard/           # Header, Pathogen Selector, Parameter Controls, Sequence Card
│   │   │   ├── charts/              # Recharts Biophysical Radar & AA Profile
│   │   │   └── export/              # Synthesis Protocol Sheet Modal
│   │   ├── app/                     # Next.js Pages & Styling
│   │   ├── store/                   # Zustand state management
│   │   └── contracts/               # Mock data untuk development offline
│   ├── package.json                 # Dependensi Frontend
│   └── README.md
│
├── 👑 backend/                      # WILAYAH KETUA (Core AI & Bio-Calculators)
│   ├── src/
│   │   ├── server.ts                # Express API Server (:5000)
│   │   ├── bio-engine/
│   │   │   ├── eisenberg-scale.ts   # Tabel konsensus hidrofobisitas Eisenberg
│   │   │   ├── calculators.ts       # Rumus Net Charge, Momen Amfifatik, Boman, Hemolisis
│   │   │   └── pdb-generator.ts     # Generator koordinat atom 3D PDB heliks
│   │   ├── gemini.ts                # Google Gemini 1.5 Flash structured client
│   │   └── pathogens.ts             # Database profil bakteri patogen prioritas WHO
│   ├── package.json                 # Dependensi Backend
│   └── .env.example
│
├── blueprint/                       # Arsip Master Blueprint (PRD, TRD, App Flow, Schema)
├── package.json                     # Root orchestrator scripts
├── TEAM_WORKFLOW.md                 # Dokumen panduan ini
└── README.md                        # Dokumentasi resmi GitHub
```

---

## 🚀 Cara Menjalankan Project

### Opsi 1: Menjalankan Keduanya Sekaligus (Rekomendasi dari Root)
```bash
# Menjalankan Backend (:5000) dan Frontend (:3000) secara bersamaan
npm run dev:all
```

### Opsi 2: Rekan Hanya Menjalankan Frontend
Jika rekan hanya ingin fokus mengerjakan tampilan visual tanpa perlu menyalakan backend:
```bash
npm run dev:fe
# atau masuk ke folder frontend:
cd frontend
npm run dev
# Buka http://localhost:3000
```
*(Catatan: Frontend memiliki fitur **Auto-Fallback**, sehingga tetap berjalan normal menggunakan data simulasi meskipun backend sedang mati).*

### Opsi 3: Ketua Hanya Menjalankan Backend
Jika ketua sedang menguji kalkulator sains atau tuning prompt Gemini:
```bash
npm run dev:be
# atau masuk ke folder backend:
cd backend
npm run dev
# Server aktif di http://localhost:5000 (Health check di /health)
```

---

## 🔄 Protokol Git Harian (Sangat Mudah!)

Setiap kali mau mulai ngoding atau setelah selesai:

1. **Sebelum mulai ngoding (Pagi/Awal sesi):**
   ```bash
   git pull origin main
   ```
2. **Setelah selesai ngoding (Sore/Akhir sesi):**
   ```bash
   git add .
   git commit -m "feat(fe): update tampilan 3d viewer" # jika rekan
   # ATAU
   git commit -m "feat(be): update kalkulator amfifatik" # jika ketua
   git push origin main
   ```

Selesai! Tidak ada branch lain, semua tersinkronisasi rapi di branch `main`.
