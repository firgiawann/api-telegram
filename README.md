# 🚀 Kuota Awan Bot API — Vercel

API serverless untuk bot Telegram @KuotaAwanBot.
Token bot AMAN di server, tidak pernah muncul di frontend lagi.

## Arsitektur

```
Frontend (GitHub Pages)
   │  POST /api/send-message {text}
   │  GET  /api/canva-link   → link Canva aktif
   ▼
Vercel Serverless Functions
   ├─ api/send-message.js   → forward ke Telegram (token di env)
   ├─ api/canva-link.js     → GET link aktif / PUT update (admin)
   ├─ api/canva-stock.js    → GET stok / PUT set stok (admin)
   └─ api/webhook.js        → terima perintah dari chat bot kamu
   │
   ├─ Vercel KV (Upstash): simpan link Canva, history, stok
   └─ Telegram Bot API (token hanya di sini)
```

## Langkah 1 — Deploy API ke Vercel

**Cara A (dashboard, tanpa install):**
1. Buat repo GitHub baru (mis. `kuota-awan-bot-api`) → upload isi folder ini
2. Buka https://vercel.com/new → Import repo itu → Deploy

**Cara B (CLI):**
```bash
cd kuota-awan-bot-api
npm i -g vercel
vercel login
vercel --prod
```

## Langkah 2 — Buat KV store

1. Vercel dashboard → **Storage** → **Create Database** → **Vercel KV (Upstash)**
2. Pilih region terdekat (Singapore/IAD1)
3. Klik **Connect to Project** → pilih project API kamu
   → env `KV_REST_API_URL` & `KV_REST_API_TOKEN` terisi otomatis

## Langkah 3 — Set Environment Variables

Vercel → Project → Settings → Environment Variables:

| Nama | Nilai |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token BARU dari BotFather (hasil revoke) |
| `TELEGRAM_CHAT_ID` | `2010496733` |
| `ADMIN_SECRET` | `openssl rand -hex 32` (untuk update via API) |
| `WEBHOOK_SECRET` | `openssl rand -hex 16` (verifikasi webhook) |
| `CANVA_DEFAULT_LINK` | Link Canva lama kamu (fallback) |

→ Redeploy setelah set (Deployments → ⋯ → Redeploy).

## Langkah 4 — Set Webhook Telegram (sekali saja)

Ganti `<TOKEN>` dengan token bot kamu:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT>.vercel.app/api/webhook&secret_token=<WEBHOOK_SECRET>&allowed_updates=[\"message\"]"
```

Cek berhasil:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Langkah 5 — Patch Frontend (2 file)

### 5a. `js/main.js` — fungsi `sendToTelegram()`

**Ganti** (3 baris token + chatId + telegramUrl):
```js
    const botToken = "8430081251:XXX";
    const chatId = "2010496733";
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
```
**Dengan:**
```js
    const apiUrl = "https://<PROJECT>.vercel.app/api/send-message";
```

**Ganti** `return fetch(telegramUrl, {` → `return fetch(apiUrl, {`

**Hapus** baris `chat_id: chatId,` di dalam body JSON.stringify (API set chat_id sendiri dari env).

### 5b. `index.html` — fungsi `submitKlaim()`

Sama persis seperti 5a: ganti 3 baris `botToken/chatId/telegramUrl` dengan
`const apiUrl = "https://<PROJECT>.vercel.app/api/send-message";`,
ganti `fetch(telegramUrl, {` → `fetch(apiUrl, {`, hapus `chat_id: chatId,`.

### 5c. `index.html` — link Canva jadi DINAMIS

**Ganti:**
```js
      const CANVA_LINK =
        "https://www.canva.com/brand/join?token=XXX";
```
**Dengan:**
```js
      let CANVA_LINK = "";
      // Ambil link aktif dari API (fallback ke link lama kalau API mati)
      (async () => {
        try {
          const r = await fetch("https://<PROJECT>.vercel.app/api/canva-link");
          const d = await r.json();
          if (d.ok && d.link) CANVA_LINK = d.link;
        } catch (e) {
          CANVA_LINK = "https://www.canva.com/brand/join?token=XXX";
        }
      })();
```

Setelah ini, **update link Canva cukup lewat chat bot** — tanpa edit file, tanpa redeploy!

## Langkah 6 — Pakai dari Telegram

Chat ke @KuotaAwanBot (dari akun admin kamu):

| Perintah | Fungsi |
|---|---|
| `/link` | Lihat link Canva aktif |
| `/setlink https://...` | **Update link Canva** (langsung aktif di website) |
| `/history` | 5 update link terakhir |
| `/status` | Status bot & stok |

## Update link via API (opsional, untuk skrip/dashboard)

```bash
curl -X PUT https://<PROJECT>.vercel.app/api/canva-link \
  -H "Authorization: Bearer <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"link":"https://www.canva.com/..."}'
```

## Bonus: stok server-side (anti-cheat)

Saat ini stok disimpan di localStorage client → user bisa buka DevTools dan set stok 999.
Opsional: pindahkan ke server dengan endpoint `api/canva-stock.js` (sudah disediakan).
Frontend tinggal `GET /api/canva-stock` saat load & `PUT` saat klaim.
