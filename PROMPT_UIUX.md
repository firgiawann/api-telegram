# 🎨 PROMPT — Bangun Ulang UI/UX Admin Panel (api-telegram.vercel.app)

> Prompt ini siap di-paste ke Antigravity IDE / Claude / ChatGPT / AI coding apa pun.
> Tujuan: membangun ulang halaman admin panel `admin.html` menjadi UI modern yang
> bersih, mudah dipakai, dan enak dilihat — tanpa mengubah backend API.

---

## 📋 SALIN MULAI DARI SINI

```
Bangun ulang halaman admin panel untuk dashboard manajemen bot Telegram
"Kuota Awan" yang di-host di Vercel (static file: admin.html di root repo).
Tuliskan sebagai SATU file HTML mandiri (CSS + JS inline, tanpa build step),
lalu simpan sebagai admin.html — harus langsung bisa di-serve Vercel apa adanya.

## KONTEKS APLIKASI
Dashboard admin pribadi untuk bot Telegram @KuotaAwanBot. Bot ini dipakai di
website profile (GitHub Pages) untuk 2 hal:
1. Form kontak profil → kirim pesan ke Telegram admin
2. Form "Klaim Canva Pro" → pengunjung isi nama+email, dapat link Canva Pro,
   stok berkurang, data klaim tersimpan ke database.

Admin (pemilik bot) butuh dashboard untuk memantau dan mengelola semuanya
dari satu tempat.

## BACKEND API YANG SUDAH ADA (JANGAN UBAH, TINGGAL DIPANGGIL)
Base URL: https://api-telegram.vercel.app
Semua request admin butuh header: Authorization: Bearer <ADMIN_SECRET>

- GET  /api/canva-link     → { ok, link } — link Canva aktif
- PUT  /api/canva-link     → body { link } — update link (notif ke Telegram)
- GET  /api/canva-stock    → { ok, stock } — stok tersisa
- PUT  /api/canva-stock    → body { stock } — set stok (notif ke Telegram)
- GET  /api/claims?limit=N → { ok, total, limit, claims: [...] }
  claims berisi: name, email, ip, location, org, device, platform,
  user_agent, stock_at_claim, created_at
- GET  /api/claims?format=csv&limit=N → file CSV (pakai header auth juga)
- POST /api/webhook        → endpoint Telegram (bukan untuk admin UI)

## FITUR WAJIB DI DASHBOARD
1. **Halaman login** — input ADMIN_SECRET, disimpan di localStorage.
   Verifikasi login dengan memanggil GET /api/claims?limit=1 (kalau 401 = gagal).
   Tampilkan pesan error yang ramah kalau salah.
2. **Header dashboard** — judul, badge status login, tombol logout,
   link "Buka Website" (https://firgiawann.github.io).
3. **Kartu ringkasan (stats)** — 4 kartu:
   - Stok Canva tersisa (angka besar)
   - Total klaim (dari GET /api/claims → field total)
   - Klaim hari ini (hitung dari created_at, zona Asia/Makassar)
   - Link aktif (tampilkan host/pendek, hover = full)
4. **Bagian Update Link Canva** — tampilkan link aktif saat ini (bisa di-copy
   dengan tombol salin), input link baru + tombol simpan, pesan sukses/gagal.
   Setelah sukses: refresh stats.
5. **Bagian Set Stok** — input angka + tombol set, pesan sukses/gagal.
6. **Tabel Data Klaim** — kolom: Nama, Email, Lokasi, IP, Device, Waktu (id-ID,
   Asia/Makassar). Fitur:
   - Tombol muat data + pilihan jumlah (25/50/100)
   - Pencarian teks (filter nama/email/lokasi di client)
   - Tombol Export CSV (pakai GET /api/claims?format=csv dengan header auth,
     download via Blob supaya header Authorization ikut terkirim)
   - Tampilkan "X dari Y klaim"
   - Tabel kosong → pesan ramah + ilustrasi kecil
7. **Bagian Analisa (opsional tapi bagus)** — 2 grafik sederhana pakai
   Chart.js via CDN:
   - Klaim per hari (7 hari terakhir, bar chart)
   - Top 5 kota/region (doughnut)
   Data dihitung client-side dari GET /api/claims?limit=500.
   Kalau API error/timeout → tampilkan fallback teks, JANGAN halaman error.

## ATURAN DESAIN (WAJIB DIIKUTI)
- Bahasa antarmuka: **Bahasa Indonesia alami & ringkas** — bukan bahasa AI
  yang kaku/bertele-tele. Contoh: "Stok tersisa", "Simpan link", "Data klaim".
- Gaya: **korporat modern & bersih (rounded)**:
  - border-radius 12–16px pada kartu, 8–10px pada input/tombol
  - shadow lembut (bukan bayangan tebal)
  - spacing mengikuti grid 4px/8px
  - warna: latar abu terang (#f1f5f9), kartu putih, aksen biru (#2563eb),
    teks gelap (#0f172a), teks sekunder abu (#64748b)
- **DILARANG**: neo-brutalisme (border tebal 2px, bayangan hitam pekat,
  radius 4px tajam), gradient mencolok, dekorasi berlebihan, SVG raksasa,
  animasi yang mengganggu.
- Typografi: system font stack (Segoe UI / system-ui), heading tebal 700,
  angka statistik besar 24–32px.
- **Responsif**: grid stats menyesuaikan (1 kolom di HP, 4 kolom di desktop);
  tabel bisa scroll horizontal di layar kecil.
- Aksesibilitas: kontras cukup (teks abu #64748b di kartu putih = aman),
  fokus input terlihat, tombol disabled tampak jelas.
- Loading state: tombol "Menyimpan..." dengan spinner saat request.
- Toast/pesan: sukses hijau (#16a34a), error merah (#dc2626), muncul halus
  di bawah form atau toast pojok, hilang otomatis 5 detik.

## TAMBAHAN
- Sertakan komentar singkat di kode (Bahasa Indonesia) untuk tiap bagian.
- Jangan simpan ADMIN_SECRET ke mana pun selain localStorage browser.
- Jangan hardcode nilai API selain base URL di atas.
- Pastikan tidak ada referensi ke token bot Telegram di file ini.
- Struktur HTML rapi, semantic (header/main/section), id unik untuk tiap elemen.
```

---

## 📝 CATATAN PEMAKAIAN

1. **Di Antigravity IDE**: buka repo `api-telegram` → buat file `PROMPT.md` berisi
   prompt di atas → minta AI kerjakan, atau paste prompt ke chat AI-nya
2. **Hasil**: satu file `admin.html` baru (ganti yang lama) → preview lokal →
   commit & push → Vercel otomatis redeploy → buka `https://api-telegram.vercel.app/admin.html`
3. Kalau mau variasi desain (dark mode, warna aksen lain, dll), tambahkan satu
   baris di akhir prompt: "Varian: tambahkan toggle dark mode" dsb.

## 💡 IDE FITUR TAMBAHAN (kalau mau dikembangkan)

- Halaman riwayat update link (dari tabel `canva_history`)
- Filter klaim per tanggal (date range picker)
- Notifikasi realtime (Supabase Realtime) — klaim baru muncul otomatis
- Ringkasan mingguan dikirim ke Telegram (cron)
