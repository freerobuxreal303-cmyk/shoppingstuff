# 🛒 Smart Grocery & Budget Tracker (Mobile PWA)
**Modul Aplikasi Smart Grocery, Proteksi Anggaran & Multi-Device Cloud Sync**  
*Aplikasi Manajemen Belanja Cerdas, Proteksi Kasir, Diskon Kompound & Cloud Database*

---

## 🎨 Desain & Tema Aplikasi: Pink & White Aesthetic
Aplikasi dirancang dengan tema **Pink & White** modern yang bersih, kontras tinggi, dan ramah sentuhan satu tangan (*thumb-friendly*):
- **Warna Utama:** Rose Pink (`#ec4899` / `#db2777`), Soft Pink (`#f472b6`)
- **Latar Belakang:** Soft Blush White Canvas (`#fff0f5`), Crisp Pure White Cards (`#ffffff`)
- **Aksen Border & Bayangan:** Delicate Pastel Pink (`#fce7f3` / `#fbcfe8`)

---

## 📱 Ringkasan Pemenuhan Rubrik Penilaian DT2 (100 Poin)

| Kode | Komponen Penilaian | Bobot | Status & Implementasi |
| :--- | :--- | :---: | :--- |
| **SRS F-01** | Form Input Item, Toko & Tanggal | 15 Poin | ✅ Toko disetel ke `Lotte Mart Grocery - Puri Indah`, date picker aktif, input Beras Rojolele (Rp 74.000), validasi form aktif menolak input nama kosong dan harga negatif. |
| **SRS F-02** | Reaktivitas Qty & Subtotal 0ms | 10 Poin | ✅ Penggandaan kuantitas otomatis tanpa delay (Minyak Goreng 2L Rp 43.000 x 3 = Rp 129.000 seketika tanpa reload). |
| **SRS F-03** | Kalkulator Diskon Kompound | 15 Poin | ✅ Mendukung diskon tunggal (Sabun 25% = Rp 15.000) dan diskon bertumpuk bertingkat (Wajan Rp 100.000 promo `50%+20%` = Rp 40.000, bukan linier 70%). |
| **SRS F-04** | Komparator Fluktuasi Harga | 15 Poin | ✅ Komparasi harga bulan ini vs bulan lalu: Beras (+Rp 6.000 ↑ Merah), Telur (-Rp 4.000 ↓ Hijau), Garam (= Abu-abu Stabil). |
| **SRS F-05** | Safety Cap Pengendali Anggaran | 15 Poin | ✅ Limit saldo dompet Rp 100.000: bar kuning pada ≥ 90%, banner merah tegas pada > 100% dengan teks exact: *"Total belanja melebihi batas saldo dompet! Kurangi kuantitas atau batalkan barang sekunder."* |
| **SRS F-06A** | Persistensi Data Lokal (F5 Guard) | 10 Poin | ✅ Seluruh data keranjang, pilihan toko Lotte Mart, tanggal, dan limit dompet tersimpan di `localStorage` & tahan reload F5 100%. Tombol hapus baris berfungsi. |
| **SRS F-06B** | Sinkronisasi Cloud Multi-Device | 10 Poin | ✅ Sinkronisasi live antar HP dan PC lewat Supabase WebSocket Broadcast channel `smart_grocery_live_sync` (≤ 2 detik) tanpa perlu reload F5. |
| **UX** | Ergonomi Sentuh Mobile | 5 Poin | ✅ Keyboard numerik mobile (`inputmode="numeric"`), touch target minimal 44x44px, feedback toast non-blocking (bebas `window.alert()`), modal konfirmasi hapus aman. |
| **UI/Code** | Mobile PWA & Deliverable | 5 Poin | ✅ Canvas mobile 375px rapi tanpa horizontal scrollbar, Service Worker PWA offline, struktur kode bersih. |

---

## 🔐 Autentikasi Pengguna & Google OAuth
Aplikasi menyediakan sistem autentikasi modern yang bersih:
- **Akun Pengguna:** Pengguna dapat masuk menggunakan Google OAuth atau kredensial akun pribadi.
- **Bebas Pop-up Perayaan / Confetti:** Login mulus dengan notifikasi toast informatif non-blocking.

---

## 📂 Struktur File Project
```
shoppingstuff-main/
├── index.html        # Struktur antarmuka PWA Mobile (Pink & White Theme)
├── styles.css        # Styling tema Pink & White, touch target min 44px, safety cap
├── app.js            # Logika SRS F-01 s/d F-06B, Google OAuth mandiri, Supabase sync
├── sw.js             # Service Worker untuk caching offline PWA
├── manifest.json     # PWA Web App Manifest (warna tema #ec4899)
├── icon-192.svg      # Ikon PWA resolusi 192x192 (Pink & White Cart)
├── icon-512.svg      # Ikon PWA resolusi 512x512 (Pink & White Cart)
├── favicon.svg       # Favicon browser tab (Pink & White Cart)
├── vercel.json       # Konfigurasi routing & header cache Vercel
├── .gitignore        # Git ignore
└── README.md         # Dokumentasi lengkap proyek ini
```
