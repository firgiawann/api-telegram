// ============================================================
// POST /api/webhook — endpoint Telegram webhook
// Kamu bisa chat ke bot sendiri untuk mengelola link Canva:
//
//   /link            → tampilkan link Canva aktif
//   /setlink <url>   → update link Canva (langsung aktif)
//   /history         → 5 update terakhir
//   /status          → status bot & stok
//
// Hanya chat_id milik admin (TELEGRAM_CHAT_ID) yang dilayani.
// Verifikasi pakai secret_token saat setWebhook (opsional tapi
// direkomendasikan).
//
// Setup webhook (sekali saja, dengan token bot):
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT>.vercel.app/api/webhook&secret_token=<WEBHOOK_SECRET>&allowed_updates=[\"message\"]"
// ============================================================
import { kvGet, kvSet, kvPush } from "./_lib/kv.js";
import { tgSendMessage } from "./_lib/telegram.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  // Verifikasi secret token Telegram (anti spoofing)
  if (process.env.WEBHOOK_SECRET) {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ ok: false, error: "Bad secret" });
    }
  }

  const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const msg = update?.message;
  if (!msg?.text) return res.status(200).json({ ok: true }); // abaikan non-text

  const chatId = String(msg.chat?.id || "");
  const adminId = String(process.env.TELEGRAM_CHAT_ID || "");

  // Hanya layani admin
  if (!adminId || chatId !== adminId) {
    return res.status(200).json({ ok: true }); // diam saja
  }

  const text = msg.text.trim();
  const reply = (t) => tgSendMessage(chatId, t, "Markdown").catch(() => {});

  try {
    if (text === "/link" || text === "/link@KuotaAwanBot") {
      const link = (await kvGet("canva:link")) || process.env.CANVA_DEFAULT_LINK || "(belum ada)";
      await reply(`🔗 *Link Canva Aktif:*\n\n${link}`);

    } else if (text.startsWith("/setlink") || text.startsWith("/setlink@KuotaAwanBot")) {
      const link = text.split(/\s+/)[1] || "";
      if (!/^https?:\/\/.+/.test(link)) {
        await reply("⚠️ Format: `/setlink https://www.canva.com/...`");
      } else {
        await kvSet("canva:link", link);
        await kvPush("canva:history", {
          link,
          at: new Date().toISOString(),
          by: "telegram",
        }, 50);
        await reply(`✅ *Link Canva Diupdate!*\n\n${link}\n\nSekarang frontend otomatis pakai link baru ini.`);
      }

    } else if (text === "/history" || text === "/history@KuotaAwanBot") {
      const history = (await kvGet("canva:history")) || [];
      if (!history.length) {
        await reply("📭 Belum ada riwayat update.");
      } else {
        const lines = history.slice(0, 5).map(
          (h, i) => `${i + 1}. ${h.link}\n   _(${new Date(h.at).toLocaleString("id-ID")})_`
        );
        await reply(`🗂 *Riwayat Update Link:*\n\n${lines.join("\n")}`);
      }

    } else if (text === "/status" || text === "/status@KuotaAwanBot") {
      const stock = (await kvGet("canva:stock")) ?? "—";
      const history = (await kvGet("canva:history")) || [];
      await reply(
        `📊 *Status Bot*\n\n▪️ Webhook: aktif\n▪️ Stok tersisa: ${stock}\n▪️ Total update link: ${history.length}\n▪️ Admin chat: ${adminId}`
      );

    } else {
      await reply(
        "👋 Perintah yang tersedia:\n\n" +
        "`/link` — lihat link Canva aktif\n" +
        "`/setlink <url>` — update link Canva\n" +
        "`/history` — riwayat update\n" +
        "`/status` — status bot"
      );
    }
  } catch (err) {
    await reply(`❌ Error: ${err.message}`);
  }

  return res.status(200).json({ ok: true });
}
