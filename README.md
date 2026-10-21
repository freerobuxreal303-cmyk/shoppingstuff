# 🛒 Smart Grocery & Nutrition Tracker (Mobile PWA)
**Tugas Modul Pemrograman Web & PWA — SMA Mutiara Bangsa 2**  
*Studi Kasus: Rian (Budgeting Belanja, Proteksi Kasir, Nutrisi & Cloud Database)*

---

## 🌐 Link Live & Repository

- 🚀 **Live Demo Vercel:** [https://shoppingstuff-freerobuxreal303-9364.vercel.app/](https://shoppingstuff-freerobuxreal303-9364.vercel.app/)
- 💻 **GitHub Repository:** [https://github.com/freerobuxreal303-cmyk/shoppingstuff](https://github.com/freerobuxreal303-cmyk/shoppingstuff)
- 🗄️ **Supabase Project:** `jnluauwepczsglnzckdw` ([https://supabase.com/dashboard/project/jnluauwepczsglnzckdw](https://supabase.com/dashboard/project/jnluauwepczsglnzckdw))

---

## 📱 Ringkasan Fitur yang Diimplementasikan

### 1. Fitur Utama SRS (F-01 s/d F-06)
- **F-01: Pencatatan Barang Belanja Lengkap**
  - Input nama barang, kategori belanja, satuan (kg, pcs, pack, liter, botol), kuantitas, harga normal, harga bulan lalu.
- **F-02: Kalkulasi Kuantitas Realtime**
  - Stepper tombol tambah/kurang kuantitas yang ramah sentuhan (*touch-friendly* min 44px).
- **F-03: Kalkulator Diskon Bertingkat (Tiered Discount)**
  - Mendukung input diskon persentase bertumpuk (contoh: `50%+20%`) maupun diskon potongan nominal (contoh: `15000`).
- **F-04: Komparator Harga vs Bulan Lalu**
  - Perbandingan otomatis harga barang bulan ini vs bulan lalu:
    - 🔺 **Merah:** Harga naik (disertai % kenaikan).
    - 🔻 **Hijau:** Harga lebih murah / turun (disertai % penghematan).
    - ➖ **Abu-abu:** Harga stabil / sama.
- **F-05: Safety Cap Dompet Rian (Budget Limit)**
  - Limit anggaran bulanan Rp 250.000 dengan visual progress bar.
  - Kartu peringatan kasir otomatis jika total belanja mendekati/melebihi limit sebelum melangkah ke kasir.
- **F-06: Database & Riwayat Belanja**
  - Penyimpanan *offline-first* menggunakan `localStorage` + sinkronisasi otomatis ke cloud database **Supabase**.

### 2. Fitur Tambahan Nutrisi & Value Tracker
- 🏷️ **Nutri-Score Badges (A / B / C / E):**
  - **Grade A (Hijau):** Sangat Sehat (Tinggi Protein / Serat Alami).
  - **Grade B (Hijau Muda):** Sehat (Rendah Gula).
  - **Grade C (Kuning):** Sedang / Netral.
  - **Grade E (Merah/Oranye):** Ultra-Processed / Batasi.
- ⚡ **Kalkulator Protein-per-Rupiah (Value for Health):**
  - Menghitung biaya per 1 gram protein (`Harga Akhir / Total Gram Protein`).
  - Menampilkan badge emas berkedip **"🔥 Best Protein Value!"** jika biaya di bawah Rp 600/gram protein.
- 🥗 **Healthy Cart Meter:**
  - Meteran visual realtime yang menampilkan persentase makanan segar/sehat vs makanan olahan (*ultra-processed*) di dalam keranjang belanja.

---

## ☁️ Integrasi Supabase Cloud Database

Aplikasi sudah terhubung langsung ke proyek Supabase kamu:
- **Project URL:** `https://jnluauwepczsglnzckdw.supabase.co`
- **Tabel Database yang Digunakan:**
  - `shopping_items`: Menyimpan daftar barang belanjaan pengguna secara realtime.
  - `shopping_history`: Menyimpan riwayat checkout sesi belanja.
- **Akun Bawaan:** Terkonfigurasi otomatis dengan akun `Rian Grocery` (`rian.smartgrocery@gmail.com`). Begitu aplikasi dibuka, data langsung tersinkronkan tanpa perlu login ulang.

---

## 🏠 Cara Menjalankan Project di Rumah

### Cara 1: Buka Langsung di HP atau Laptop (Paling Praktis)
1. Buka browser (Chrome / Safari / Edge) dan kunjungi:
   👉 **[https://shoppingstuff-freerobuxreal303-9364.vercel.app/](https://shoppingstuff-freerobuxreal303-9364.vercel.app/)**
2. **Install sebagai Aplikasi HP (PWA):**
   - Di Android (Chrome): Klik titik tiga di pojok kanan atas > Pilih **"Add to Home Screen"** (Tambahkan ke Layar Utama).
   - Di iPhone (Safari): Klik tombol Share (ikon kotak panah ke atas) > Pilih **"Add to Home Screen"**.
   - Aplikasi akan terpasang di HP seperti aplikasi native tanpa header browser!

### Cara 2: Menjalankan File Lokal Offline di Komputer Rumah
1. Ekstrak file zip `shopping-list-tracker.zip` atau buka folder ini di komputer rumah.
2. Cukup klik ganda (double-click) file **`index.html`** untuk membukanya langsung di browser.
3. Atau jalankan server lokal ringan menggunakan terminal:
   ```bash
   # Menggunakan Node.js / npx:
   npx serve .
   
   # ATAU menggunakan Python:
   python -m http.server 3000
   ```
4. Buka `http://localhost:3000` di browsermu.

### Cara 3: Lewat Git / GitHub
```bash
git clone https://github.com/freerobuxreal303-cmyk/shoppingstuff.git
cd shoppingstuff
```

---

## 📂 Struktur File Project

```
shopping list tracker/
├── index.html        # Struktur antarmuka PWA Mobile (maksimal 430px)
├── style.css         # Styling modern: Nutri-Score, Best Value pill, modal sheet
├── app.js            # Logika SRS, kalkulator diskon, comparator, Supabase sync
├── supabase.js       # Library Supabase JS bundle lokal (100% offline-ready)
├── sw.js             # Service Worker untuk caching & kemampuan PWA offline
├── manifest.json     # PWA Web App Manifest (warna tema, nama, standalone mode)
├── icon-192.svg      # Ikon PWA resolusi 192x192
├── icon-512.svg      # Ikon PWA resolusi 512x512
├── favicon.svg       # Favicon browser tab
├── vercel.json       # Konfigurasi routing & header cache untuk Vercel
├── .gitignore        # Mencegah node_modules ter-commit
└── README.md         # Dokumentasi lengkap proyek ini
```

---
*Dibuat untuk kelengkapan tugas Studi Kasus Rian & Smart Nutrition Tracker.*
