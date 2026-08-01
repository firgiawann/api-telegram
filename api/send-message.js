// ============================================================
// POST /api/send-message
// Dipanggil frontend (form kontak & form klaim Canva).
// Menerima { text, parse_mode? } lalu forward ke Telegram.
// chat_id SELALU dari env — client tidak bisa mengganti tujuan.
// ============================================================
import { tgSendMessage } from "./_lib/telegram.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // CORS: izinkan halaman GitHub Pages kamu
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    return res.status(500).json({ ok: false, error: "TELEGRAM_CHAT_ID belum di-set" });
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid JSON" });
  }

  const text = String(body?.text || "").trim();
  if (!text) {
    return res.status(400).json({ ok: false, error: "text wajib diisi" });
  }
  if (text.length > 4000) {
    return res.status(400).json({ ok: false, error: "text terlalu panjang" });
  }

  try {
    const result = await tgSendMessage(chatId, text, body?.parse_mode || "Markdown");
    if (!result.ok) {
      return res.status(502).json({ ok: false, error: result.description || "Telegram error" });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
