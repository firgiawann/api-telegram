// ============================================================
// POST /api/claim
// Dipanggil frontend saat user klaim Canva:
//   1. Decrement stok di server (ATOMIK via SQL function)
//   2. Simpan data user (nama, email, IP, lokasi, device) ke `claims`
//   3. Kirim notifikasi ke Telegram admin
// Jika stok habis → 409, klaim ditolak.
// ============================================================
import { dbRpc, dbInsertClaim } from "./_lib/db.js";
import { tgSendMessage } from "./_lib/telegram.js";

export const config = { runtime: "nodejs" };

const MAX_FIELD = 500; // batas panjang tiap field

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid JSON" });
  }

  const clean = (v) => String(v || "").trim().slice(0, MAX_FIELD);

  const name = clean(body?.name);
  const email = clean(body?.email);

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: "name dan email wajib diisi" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: "Format email tidak valid" });
  }

  try {
    // 1. Decrement stok atomik — data berisi stok terbaru
    const stock = await dbRpc("decrement_stock");
    if (stock <= 0) {
      return res.status(409).json({ ok: false, error: "Stok habis", stock });
    }

    // 2. Simpan data klaim
    const claim = {
      name,
      email,
      ip: clean(body?.ip),
      location: clean(body?.location),
      org: clean(body?.org),
      device: clean(body?.device),
      platform: clean(body?.platform),
      user_agent: clean(body?.user_agent).slice(0, 1000),
      stock_at_claim: stock,
    };
    await dbInsertClaim(claim);

    // 3. Notif Telegram
    const lines = [
      "🎁 *Klaim Canva Pro Baru!*",
      "━━━━━━━━━━━━━━━━━━━━",
      `👤 *Nama:* ${name}`,
      `📧 *Email:* ${email}`,
      "━━━━━━━━━━━━━━━━━━━━",
      `🌐 *IP:* ${claim.ip || "N/A"}`,
      `📍 *Lokasi:* ${claim.location || "N/A"}`,
      `🏢 *ISP/Org:* ${claim.org || "N/A"}`,
      `🖥️ *Device:* ${claim.device || "N/A"}`,
      `📐 *Platform:* ${claim.platform || "N/A"}`,
      "━━━━━━━━━━━━━━━━━━━━",
      `🕒 *Waktu:* ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Makassar", dateStyle: "full", timeStyle: "short" })}`,
      `📦 *Stok tersisa:* ${stock}`,
      "━━━━━━━━━━━━━━━━━━━━",
      "📊 Data tersimpan untuk analisa",
    ];
    await tgSendMessage(process.env.TELEGRAM_CHAT_ID, lines.join("\n")).catch(() => {});

    return res.status(200).json({ ok: true, stock });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
