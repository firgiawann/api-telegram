// ============================================================
// GET/PUT /api/canva-stock
// GET → publik: stok tersisa (server-side, anti-cheat)
// PUT → admin: set stok (Authorization: Bearer <ADMIN_SECRET>)
// Frontend TIDAK lagi memakai localStorage untuk stok.
// ============================================================
import { dbGet, dbSet } from "./_lib/db.js";
import { tgSendMessage } from "./_lib/telegram.js";

export const config = { runtime: "nodejs" };

const DEFAULT_STOCK = 100;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    try {
      const raw = (await dbGet("canva_stock")) ?? String(DEFAULT_STOCK);
      return res.status(200).json({ ok: true, stock: Number(raw) });
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

    const stock = Number(body?.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ ok: false, error: "stock harus angka >= 0" });
    }

    try {
      await dbSet("canva_stock", String(stock));
      try {
        await tgSendMessage(
          process.env.TELEGRAM_CHAT_ID,
          `📦 *Stok Canva Diupdate*\n\nStok tersisa: *${stock}*`
        );
      } catch {}
      return res.status(200).json({ ok: true, stock });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
