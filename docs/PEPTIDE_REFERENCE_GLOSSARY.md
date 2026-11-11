# 🧬 Peptide Reference Glossary
**Nama-nama ilmiah resmi dari sekuens peptida yang dipakai di SynthiaBio — supaya scientist/juri langsung familiar.**

> Semua identifier di bawah diverifikasi langsung ke PubMed (NCBI) dan UniProt per 12 Nov 2026.
> Angka "sitasi PubMed" = jumlah artikel PubMed yang menyebut nama tersebut (proxy seberapa terkenal di komunitas ilmiah).

---

## 1. Referensi Klinis di `GET /api/benchmarks`

Sumber kode: `backend/src/benchmarks/clinical-peptides.ts`

### Magainin-2
| | |
|---|---|
| **Nama resmi** | Magainin 2 |
| **Alias yang dipakai scientist** | "Magainins" (keluarga), "magainin II" |
| **UniProt** | [P11006](https://www.uniprot.org/uniprotkb/P11006) (Magainins, *Xenopus laevis*) |
| **Sitasi PubMed** | ~628 artikel |
| **Asal** | Kulit katak *Xenopus laevis* (African clawed frog) |
| **Sekuens proyek** | `GIGKFLHSAKKFGKAFVGEIMNS` |
| **Kutipan penting** | Zasloff, M. (1987) — penemuan magainin di PNAS; melahirkan perusahaan Magainin Pharmaceuticals |
| **Status** | Preclinical / lead amfifatik heliks-α klasik |

### Pexiganan (MSI-78)
| | |
|---|---|
| **Nama resmi** | Pexiganan (kode pengembangan **MSI-78**) |
| **Alias yang dipakai scientist** | "MSI-78", "pexiganan acetate", nama komersial "Locilex" |
| **UniProt** | — (analog sintetik, tidak ada entri UniProt; pencarian via PubMed) |
| **Sitasi PubMed** | ~134 artikel |
| **Asal** | Analog sintetik Magainin-2 (dipanjangkan +4 residu: GIGKFLKKAKKFGKAFVKILKK) |
| **Sekuens proyek** | `GIGKFLKKAKKFGKAFVKILKK` |
| **Status** | Phase III (ulser kaki diabetik topikal); uji coba dilaporkan non-inferior vs ofloxacin topikal namun tidak pernah dilisensikan komersial |
| **Kenapa dipakai proyek** | Contoh peptida sintetik terdekat yang mendekati klinik dari magainin |

### LL-37 (Cathelicidin)
| | |
|---|---|
| **Nama resmi** | LL-37 / hCAP-18 |
| **Alias yang dipakai scientist** | "hCAP-18/LL-37", "CAMP-derived peptide", "human cathelicidin" (nama gen: **CAMP**) |
| **UniProt** | [P49913](https://www.uniprot.org/uniprotkb/P49913) (Cathelicidin antimicrobial peptide, *Homo sapiens*) |
| **Sitasi PubMed** | ~1.847 artikel |
| **Asal** | Sistem imun bawaan manusia (neutrofil, epitel kulit) |
| **Sekuens proyek** | `LLGDFFRKSKEKIGKEFKRIVQRIKDFLRNLVPRTES` (37 aa — asal namanya: dua L pertama + panjang 37) |
| **Kutipan penting** | Gudmundsson dkk. (1996) — karakterisasi hCAP-18/LL-37 manusia |
| **Kenapa dipakai proyek** | Satu-satunya AMP endogen manusia sebagai pembanding "in-vivo relevance" |

### Melittin (Toxicity Control)
| | |
|---|---|
| **Nama resmi** | Melittin |
| **Alias yang dipakai scientist** | "bee venom peptide", "principal venom toxin" |
| **UniProt** | [P01501](https://www.uniprot.org/uniprotkb/P01501) (Melittin, *Apis mellifera*) |
| **Sitasi PubMed** | ~3.455 artikel — **yang paling banyak disitasi di daftar ini** |
| **Asal** | Racun lebah madu (*Apis mellifera*) |
| **Sekuens proyek** | `GIGAVLKVLTTGLPALISWIKRKRQQ` (26 aa) |
| **Status** | Bukan obat — **kontrol positif lisis membran non-selektif** |
| **Kenapa dipakai proyek** | Benchmark kebalikan: memperlihatkan kenapa hemolisis rendah itu penting (optimizer Irfan memakai Melittin sebagai bukti perbaikan toksisitas) |

---

## 2. Sekuens Sample di Test & Dokumentasi

Sumber: `backend/tests/api.test.ts`, `frontend/src/lib/mock-data.ts`, contoh `curl` di `TEAM_WORKFLOW.md`

### KWKLFKKIEKVGQNVRDG — **Cecropin A fragment (I15V variant)**
| | |
|---|---|
| **Nama resmi keluarga** | **Cecropin A** |
| **Apa ini persisnya** | Fragmen N-terminal Cecropin A (residu 1–18) dengan satu substitusi **Ile15 → Val** |
| **UniProt (Cecropin A asli)** | [P01507](https://www.uniprot.org/uniprotkb/P01507) — *Hyalophora cecropia* (ngengat raksasa) |
| **Sitasi PubMed (Cecropin A)** | ~435 artikel |
| **Cecropin A utuh (mature)** | `KWKLFKKIEKVGQNIRDGIIKAGPAVAVVGQATQIAK-NH₂` (37 aa) |
| **Kutipan penting** | Steiner, Hultmark, Engström, Bennich & Boman (1981, *Nature*) — penemuan peptida imunitas serangga; **kertakan ilmiah pertama yang memperkenalkan istilah "antibacterial peptide"** |
| **Verifikasi pencarian** | String persis `KWKLFKKIEKVGQNVRDG`: **0 hit** di PubMed, PMC, UniProt, dan web — sekuens persis ini TIDAK terkatalog; motif `KWKLFKK`-nya yang terkenal (N-terminus cecropin, tulang punggung banyak AMP hibrida cecropin–melittin era 90-an) |

> ⚠️ **Catatan labeling:** mock fallback frontend menyebut sekuens ini "De Novo Antimicrobial Peptide". Secara ilmiah itu kurang akurat — ini varian peptida alam. Label yang jujur: *"reference control: Cecropin A fragment (I15V)"*. Perbaikan labeling disarankan saat Fase 2.

---

## 3. Nama Lain yang Muncul di Kode

| Istilah di kode/proyek | Nama ilmiah yang familiar |
|---|---|
| `Synthia-MRSA-Alpha1` | Nama kandidat fiktif (hasil generate/mocking proyek, bukan peptida terpublikasi) |
| Toroidal / Barrel-stave / Carpet | Tiga mekanisme pemorogen membran yang standar di literatur AMP (bukan nama peptida) |
| Eisenberg Consensus Scale | Eisenberg, Weiss & Terwilliger (1984) — skala hidrofobisitas 20 asam amino yang dipakai engine |
| Schiffer-Edmundson Helical Wheel | Proyeksi 2D heliks α standar (100°/residu) untuk memvisualkan amfifatik |
| Boman Index | Transfer energi bebas (kcal/mol) yang dikaitkan dengan potensi pengikatan membran — dinamai dari H.G. Boman, penemu cecropin |

---

## 4. Cara Mengutip saat Demo/Presentasi

- *"Desain kami di-benchmark terhadap empat referensi emas: **Magainin-2** (lead katak klasik), **Pexiganan/MSI-78** (analog magainin yang mencapai Phase III), **LL-37** (satu-satunya AMP endogen manusia), dan **Melittin** sebagai kontrol toksisitas."*
- *"Sekuens kontrol regresi engine kami adalah fragmen **Cecropin A** (I15V) — peptida serangga pertama yang memperkenalkan istilah antimicrobial peptide pada Nature 1981."*
