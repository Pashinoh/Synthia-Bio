# 📋 Catatan Handoff Lengkap untuk Pas (Pashinoh)

Dokumen ini merangkum seluruh pembaruan **Fase 2: Integrasi Frontend-to-Backend & Peningkatan UX Studio**, sinkronisasi **PR #8 & PR #9**, serta arsitektur fitur interaktif terkini di branch `feat/fe-backend-integration-phase2` agar Pas langsung paham 100% saat memeriksa kode dan demo aplikasi.

> Acuan kontrak JSON API lengkap ada di [`docs/API_CONTRACT.md`](./API_CONTRACT.md).  
> Seluruh unit test backend (`20/20`) dan build Next.js 16 (`0 errors, 0 warnings`) telah diverifikasi lulus.

---

## 1. Status Selesai Fase 2 & Sinkronisasi PR #8–#9

1. **Sinkronisasi PR #8 (Modul Bio-Engine & Evaluasi Pas):**
   - Integrasi evaluator **`inSilicoGates`** (evaluasi 5 gerbang biofisika ala RFD4: muatan kationik, batas hemolisis, partisi heliks amfipatik, stabilitas protease serum, dan kelayakan sintesis Fmoc-SPPS).
   - Dukungan **`lockedMotif`** / scaffolding posisi terkunci pada generator sekuens dan closed-loop directed evolution.
   - Algoritma seleksi diversitas kandidat batch (`pairwiseSequenceIdentity`) untuk mencegah kandidat yang identik.
   - Konverter format **`mmCIF` (`.cif`)** di samping `.PDB` dan `.FASTA` untuk interoperabilitas PyMOL, ChimeraX, dan arsip PDBx/mmCIF modern.

2. **Koneksi Frontend-to-Backend Lengkap (`usePeptideStore.ts`):**
   - Menghubungkan seluruh state store ke Express API `:5000` (`NEXT_PUBLIC_BACKEND_API_URL`):
     - `POST /api/generate` (De novo synthesis tunggal).
     - `POST /api/generate-batch` (Skrining batch 3 kandidat beragam).
     - `POST /api/optimize` (In-silico directed evolution mutasi tunggal).
     - `POST /api/validate-stability` (Helical wheel 2D, protease shield, dan kurva titrasi pH).
     - `POST /api/benchmarks/compare` (Komparasi klinis vs Pexiganan, Magainin-2, LL-37, Melittin).
   - Katalog 6 patogen prioritas WHO (MRSA, *P. aeruginosa*, *A. baumannii*, *K. pneumoniae*, *E. coli* CRE, *E. faecium* VRE).

---

## 2. Fitur Baru UX Studio (Baru Saja Ditambahkan)

### A. Auto-Scroll Cerdas & Highlight Perubahan Panel Kanan
Ketika pengguna menekan tombol aksi di bilah kiri (*Left Control Rail*), panel kanan kini tidak diam atau membingungkan:
1. **Auto-Scroll Halus:**
   - **`Optimize` diklik:** Panel kanan otomatis *smooth scroll* menuju panel **`In-silico directed evolution`**.
   - **`Run 3x Batch Screening` diklik:** Panel kanan otomatis *smooth scroll* menuju daftar peringkat **`Multi-candidate batch screening`**.
   - **Memilih Kandidat Batch `#1/#2/#3` atau Klik `Apply Evolved`:** Panel kanan otomatis *smooth scroll* kembali ke atas (**3D Viewer & Profil Biofisika**).
   - **`Stability` diklik:** Panel kanan otomatis *scroll* ke area **Protease Shield & Titrasi pH**.
2. **Visual Highlight Sementara (`UPDATED` Banner + `ring-accent`):**
   - Section yang baru diperbarui akan menyala dengan border aksen biru terang (`ring-2 ring-accent`) serta banner atas berwarna aksen bertuliskan **`UPDATED · [Nama Pembaruan]`** selama ~3–4 detik sebelum kembali normal.
3. **Pelacakan Selisih Angka (*Delta Readout*):**
   - Kartu `BiophysicalRadar` kini menerima snapshot kandidat sebelumnya (`previousMetrics`) dan menampilkan selisih angka langsung di footer (contoh: `TI 99/100 (+1)`, `Charge +1 e`, `μH -0.009`).
4. **Sorotan Residu Termutasi (*Sequence Diff*):**
   - Pada `SequenceCard`, jika sekuens peptida baru merupakan hasil evolusi mutasi dari sekuens sebelumnya, huruf asam amino yang termutasi diberi penanda khusus (garis bawah aksen biru + latar lembut) dan badge jumlah mutasi (`1 mutation` / `2 mutations`), lengkap dengan tooltip penjelasan (mis. `Pos 9 · Mutated E -> Q (Glutamine, Hydrophilic)`).

---

### B. 3D Molecular Viewer yang Jauh Lebih Informatif (`MoleculeViewer.tsx`)
1. **Tombol Info Anatomi Struktur (`(i)` Info Button):**
   - Terletak di pojok kanan atas kanvas 3D. Saat diklik, membuka popover **3D Model Anatomy**:
     - **Structure Shown:** Penjelasan model konformasi α-heliks amfipatik (menampilkan jumlah residu dan estimasi jumlah atom, *Chain A*, putaran kanonikal $100^\circ$ dan *pitch* $1.52\text{ \AA}$ per residu, mencakup atom tulang punggung `N, Cα, C, O` serta jangkar rantai samping `Cβ`).
     - **Render Modes:** Panduan fungsi mode `CARTOON` (pita lipatan sekunder), `SURFACE` (selubung kontak Van der Waals), `STICK` (ikatan kovalen antaratom), dan `SPHERE` (ruang sterik volume atom).
     - **Color Schemes:** Panduan warna gradien Eisenberg `HYDRO` (merah hidrofilik, putih netral, biru hidrofobik), `CHARGE` (biru nitrogen amida, merah oksigen karbonil, abu karbon), dan `SPECTRUM` (N-terminus biru ke C-terminus merah).
2. **Legenda Warna 1-Baris Dinamis:**
   - Ditampilkan di sebelah tombol info, otomatis berganti sesuai skema warna aktif tanpa memakan ruang visual kanvas.
3. **Inspektor Hover Residu & Atom (`3Dmol.setHoverable`):**
   - Saat kursor mouse digerakkan di atas molekul 3D, badge HUD di pojok kiri atas seketika menampilkan identitas residu dan atom yang disentuh (misal: `Res #5 · PHE (F) · Alpha carbon (Cα) · Hydrophobic · H +1.19`), dan hilang secara bersih saat unhover tanpa mengganggu performa WebGL.
4. **Kontrol Kamera & Latar Belakang:**
   - Zoom in/out via tombol `+` / `-` serta mouse wheel standar (scroll UP = zoom in, scroll DOWN = zoom out).
   - Tombol manual toggle latar kanvas: **Soft Paper** (`#ede9df`, kertas hangat tidak silau) $\leftrightarrow$ **Dark Canvas** (`#0d0d0f`).

---

### C. Ekspor Dokumen Lab Sheet Berstandar Formal (`SynthesisModal.tsx`)
Sesuai kebutuhan cetak laboratorium dan ekspor PDF:
1. **Tipografi & Tampilan Formal (Opsi A WYSIWYG):**
   - Isi dokumen modal `Export -> Lab sheet` menggunakan kertas putih bersih (`#ffffff`), batas garis tabel tegas hitam, font klasik jurnal/lab **`"Times New Roman", Times, serif`**, dan warna teks hitam pekat (`#000000`).
   - Nyaman dibaca langsung di layar (baik saat dashboard berstatus Dark Mode maupun Light Mode) maupun saat di-print.
2. **Isolasi Mode Cetak (`@media print`):**
   - Shell dashboard (`Header`, navbar, panel samping, tombol-tombol aplikasi) otomatis disembunyikan (`print:hidden`) saat mencetak atau **Save as PDF** dari modal.
   - Tidak ada lagi latar abu-abu gelap, teks pudar, atau scroll terpotong. Dokumen tercetak bersih satu lembar utuh.
3. **Pilihan Ekspor Lengkap:**
   - `Copy FASTA` (`.fasta`)
   - `Download PDB` (`.pdb`)
   - `Download mmCIF` (`.cif`)
   - `Lab sheet` (`pdf / print` SPPS protocol)

---

## 3. Cara Menjalankan & Menguji Proyek

### Menjalankan Backend & Frontend Sekaligus:
```bash
# Di root direktori proyek:
npm run dev:all
```
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000) (Status: `http://localhost:5000/health`)

### Atau Production Build & Test:
```bash
# Test backend (18 unit/http tests):
npm run test:be

# Build frontend & backend:
npm run build:be
npm run build

# Menjalankan production server:
npm run start:all
```

---

## 4. Skenario Pengujian Singkat untuk Verifikasi Mandiri

1. **Uji 3D Info & Inspektor:**
   - Arahkan mouse ke heliks 3D: amati badge residu muncul di pojok kiri atas HUD.
   - Klik tab skema warna `CHARGE`, lalu `SPECTRUM`, lalu `HYDRO`: amati legenda warna dinamis berubah di pojok kanan atas.
   - Klik tombol **`Info`**: pastikan popover *3D Model Anatomy* terbuka dan mudah dibaca.
2. **Uji Auto-Scroll & Highlight Directed Evolution:**
   - Pada kartu peptida di sidebar kiri, klik tombol **`Optimize`**.
   - Perhatikan panel kanan otomatis menggulir (*smooth scroll*) ke bawah menuju section **`In-silico directed evolution`** dan menyalakan badge **`UPDATED · Directed evolution mutations ready`**.
   - Klik tombol **`Apply evolved`**: panel kanan otomatis *scroll* kembali ke atas (**3D & Biophysical Profile**), angka selisih (*delta*) muncul di kartu radar, dan residu yang termutasi tersorot di sekuens primer.
3. **Uji Batch Screening 3x:**
   - Ubah mode di sidebar kiri menjadi **`Batch 3x`**, lalu klik **`Run 3x batch screening`**.
   - Panel kanan otomatis menggulir ke daftar peringkat **`Multi-candidate batch screening`** dengan highlight `UPDATED`.
   - Klik kandidat `#2`: panel kanan otomatis *scroll* ke atas memuat konformasi 3D dan kalkulasi kandidat tersebut.
4. **Uji Lab Sheet & PDF Print:**
   - Ganti tema ke **Dark Mode** via tombol di navbar atas.
   - Klik tombol **`Export`** $\rightarrow$ **`Lab sheet`**.
   - Perhatikan modal tampil seperti lembar spesifikasi laboratorium berlatar putih dengan font **Times New Roman** dan teks hitam pekat.
   - Klik **`Print / Save PDF`**: jendela cetak browser akan terisolasi bersih hanya menampilkan lembar SPPS tanpa chrome dashboard.


---

## 5. Pembaruan Final: Keamanan Produksi F1–F7 & Live Interactive CAD Tour

### A. Penguatan Keamanan Produksi (F1–F7 Audit)
1. **F1 & F5 Server-Side BFF Proxy (`/api/ai/*`):**
   - Kunci API Google Gemini (`GEMINI_API_KEY`) dan Groq kini sepenuhnya terisolasi di sisi server (BFF di backend Express `:5000` / route handler Next.js). Browser klien tidak lagi memiliki akses langsung ke API key.
2. **F2 Fail-Closed CORS:**
   - Middleware CORS backend kini beroperasi dengan mode *fail-closed* menggunakan *origin whitelist* terverifikasi (`localhost:3000`, `127.0.0.1:3000`, atau domain produksi). Origin tak dikenal langsung ditolak dengan `403 Forbidden`.
3. **F3 In-Memory Sliding-Window Rate Limiter:**
   - Pembatasan laju panggilan berbasis sliding-window terdistribusi (maksimum 60 permintaan/menit per IP) untuk mencegah eksploitasi kuota API inferensi AI.
4. **F4 & F6–F7 Sanitasi Prompt & Header Keamanan:**
   - Sanitasi input karakter prompt untuk menangkal *prompt injection*, integrasi header ketat CSP, HSTS, X-Content-Type-Options, dan sanitasi payload JSON.

### B. Live Interactive CAD-Style Tour (`InteractiveTour.tsx`)
1. **Highlight Presisi Tanpa Efek AI-Slop:**
   - Menghilangkan efek glowing pulsing generik dan ikon bintang AI klise.
   - Menggunakan frame crosshair presisi di 4 sudut elemen target bergaya CAD/workbench laboratorium.
2. **Navigasi Cepat (Jump Pills 01–08):**
   - Pengguna dapat langsung melompat ke step mana pun tanpa harus klik *Next* berulang kali.
3. **Tabel Telemetri Ilmiah:**
   - Setiap langkah menampilkan parameter biofisika nyata (*Target Parameters & Indicators*) seperti mV membran outer surface, rotasi WebGL 3D, skala hidrofobik Eisenberg, dan kondisi sintesis microwave SPPS.
4. **Onboarding Otomatis Pengunjung Pertama:**
   - Menggunakan deteksi `localStorage.getItem('synthiabio_tour_completed_v1')`. Pengunjung baru otomatis disambut tour setelah 750ms, dan status tersimpan permanen saat tour diselesaikan atau ditutup.
5. **Lokalisasi Penuh Bahasa Inggris:**
   - Seluruh antarmuka web, modal panduan (`TutorialModal.tsx`), navigasi header, dan pesan status disajikan dalam bahasa Inggris formal untuk presentasi hackathon global STEM2Connect.
