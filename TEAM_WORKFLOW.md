# 🤝 SynthiaBio — Team Workflow Guide (Phase 1: Backend First)
**Strategi Kolaborasi 1 Branch (`main`): Fokus Menuntaskan Backend Dahulu**

---

## ⚡ Prinsip Kerja Fase 1: Backend First & Zero ML Training
Sebelum menyentuh UI frontend, tim fokus 100% mematangkan **Core Engine & Backend** di dalam folder `backend/`.
> **PENTING:** Tidak ada training model ML dari nol. Seluruh kecerdasan menggunakan **Google Gemini 1.5 Flash API** dan kalkulasi biofisika deterministik berbasis TypeScript murni.

---

## 👥 Pembagian Tugas Backend: Irfan vs Pas

```
+------------------------------------------------------------------------------------+
|                         PEMBAGIAN TUGAS BACKEND (PHASE 1)                          |
+--------------------------------------------------+---------------------------------+
| 👑 IRFAN (AI Engine & API Orchestrator)          | 🧪 PAS (Bio-Engine & Benchmark) |
|                                                  |                                 |
| • File: backend/src/server.ts                    | • File: backend/src/pathogens.ts|
| • File: backend/src/gemini.ts                    | • File: backend/src/bio-engine/ |
|                                                  |                                 |
| 1. Setup API Key & Koneksi Gemini 1.5 Flash      | 1. Tambah data patogen ESKAPE   |
| 2. Prompt Engineering (JSON Schema Output)       |    (Candida auris & VRE)        |
| 3. Route Handler POST /api/generate              | 2. Buat database komparasi obat |
| 4. Error Handling & Fallback Heuristic           |    nyata (Magainin-2, Melittin) |
| 5. Testing Endpoint via Postman/curl             | 3. Buat endpoint analisa custom |
|                                                  |    sekuens (POST /api/analyze)  |
+--------------------------------------------------+---------------------------------+
```

---

## 🚀 Panduan Menjalankan Backend untuk Irfan & Pas

```bash
# 1. Masuk ke direktori backend
cd backend

# 2. Pastikan dependensi terpasang
npm install

# 3. Jalankan server backend (dengan auto-reload TSX)
npm run dev

# 4. Cek apakah server sudah aktif:
# Buka http://localhost:5000/health di browser
```

---

## 🔄 Protokol Git di Branch `main`

1. **Sebelum mulai:** `git pull origin main`
2. **Saat selesai:**
   ```bash
   git add .
   git commit -m "feat(be): update prompt gemini / tambah patogen"
   git push origin main
   ```

*Fase 2 (Frontend & Demo Video) akan dimulai bersama-sama setelah seluruh endpoint backend dinyatakan solid.*
