// ============================================================
// GET/PUT /api/canva-link
// GET  → publik: frontend ambil link Canva aktif (dinamis)
// PUT  → admin: update link Canva (butuh header Authorization:
//        Bearer <ADMIN_SECRET>), simpan history, notif ke Telegram
// ============================================================
import { kvGet, kvSet, kvPush } from "./_lib/kv.js";
import { tgSendMessage } from "./_lib/telegram.js";

export const config = { runtime: "nodejs" };

const DEFAULT_LINK = process.env.CANVA_DEFAULT_LINK || "";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  // ---------- GET: ambil link aktif ----------
  if (req.method === "GET") {
    const link = (await kvGet("canva:link")) || DEFAULT_LINK;
    return res.status(200).json({ ok: true, link });
  }

  // ---------- PUT: update link (admin only) ----------
  if (req.method === "PUT") {
    const auth = req.headers.authorization || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!process.env.ADMIN_SECRET || token !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON" });
    }

    const link = String(body?.link || "").trim();
    if (!link || !/^https?:\/\/.+/.test(link)) {
      return res.status(400).json({ ok: false, error: "link harus URL valid (http/https)" });
    }

    await kvSet("canva:link", link);
    await kvPush("canva:history", {
      link,
      at: new Date().toISOString(),
      by: "api",
    }, 50);

    // Notif ke Telegram admin
    try {
      await tgSendMessage(
        process.env.TELEGRAM_CHAT_ID,
        `🔄 *Link Canva Diupdate*\n\n${link}\n\n_oleh: API (admin)_`
      );
    } catch {
      // notif gagal tidak menggagalkan update
    }

    return res.status(200).json({ ok: true, link });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
