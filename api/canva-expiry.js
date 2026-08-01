// ============================================================
// GET/PUT /api/canva-expiry
// GET → publik: masa aktif / expired date Canva Pro (dinamis)
// PUT → admin: update expiry (Authorization: Bearer <ADMIN_SECRET>)
// ============================================================
import { dbGet, dbSet } from "./_lib/db.js";
import { tgSendMessage } from "./_lib/telegram.js";

export const config = { runtime: "nodejs" };

const DEFAULT_EXPIRY = "2026-08-05T23:59:59+08:00";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    try {
      const expiry = (await dbGet("canva_expiry")) || DEFAULT_EXPIRY;
      return res.status(200).json({ ok: true, expiry });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

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

    const expiry = String(body?.expiry || "").trim();
    if (!expiry) {
      return res.status(400).json({ ok: false, error: "expiry tidak boleh kosong" });
    }

    try {
      await dbSet("canva_expiry", expiry);
      try {
        await tgSendMessage(
          process.env.TELEGRAM_CHAT_ID,
          `⏳ *Expired Date Canva Diupdate*\n\nTanggal Expired: *${expiry}*`
        );
      } catch {}
      return res.status(200).json({ ok: true, expiry });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
