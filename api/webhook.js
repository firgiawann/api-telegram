// ============================================================
// POST /api/webhook — endpoint Telegram webhook
// Bot pakai TOMBOL (inline keyboard), bukan slash command.
//
// Menu admin (chat 2010496733):
//   [🔗 Lihat Link] [✏️ Ganti Link]
//   [📦 Lihat Stok] [🎯 Set Stok]
//   [👥 Klaim Terbaru] [📊 Status]
//   [⚙️ Admin Panel] (web app)
//
// Alur input interaktif:
//   - Tekan "Ganti Link" → bot minta kirim link → admin kirim URL → tersimpan
//   - Tekan "Set Stok" → bot minta angka → admin kirim angka → tersimpan
//   - Tekan "Batal" → batalkan input
//
// Setup webhook (sekali):
//   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<PROJECT>.vercel.app/api/webhook&secret_token=<WEBHOOK_SECRET>&allowed_updates=[\"message\",\"callback_query\"]"
// ============================================================
import { dbGet, dbSet, dbHistory, dbHistoryList, dbClaims, dbClaimCount } from "./_lib/db.js";
import { tgSendMessage, tgEditMessage, tgAnswerCallback } from "./_lib/telegram.js";

export const config = { runtime: "nodejs" };

const API_BASE = "https://api-telegram.vercel.app";
const WEBSITE = "https://firgiawann.github.io";
const ADMIN_PANEL = `${API_BASE}/admin.html`;

// ---------- Keyboard menu utama ----------
function adminMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🔗 Lihat Link", callback_data: "link" },
        { text: "✏️ Ganti Link", callback_data: "ask_link" },
      ],
      [
        { text: "📦 Lihat Stok", callback_data: "stock" },
        { text: "🎯 Set Stok", callback_data: "ask_stock" },
      ],
      [
        { text: "⏳ Expired Date", callback_data: "expiry" },
        { text: "📅 Set Expired", callback_data: "ask_expiry" },
      ],
      [
        { text: "👥 Klaim Terbaru", callback_data: "claims" },
        { text: "📊 Status", callback_data: "status" },
      ],
      [{ text: "⚙️ Admin Panel", web_app: { url: ADMIN_PANEL } }],
    ],
  };
}

function cancelKeyboard() {
  return {
    inline_keyboard: [[{ text: "❌ Batal", callback_data: "cancel" }]],
  };
}

// Tombol kembali ke menu utama (dipakai di semua tampilan hasil)
function backKeyboard() {
  return {
    inline_keyboard: [[{ text: "🔙 Kembali ke Menu", callback_data: "menu" }]],
  };
}

// ---------- Helpers ----------
const adminId = () => String(process.env.TELEGRAM_CHAT_ID || "");
const isAdmin = (chatId) => adminId() && String(chatId) === adminId();

async function sendMenu(chatId) {
  await tgSendMessage(chatId, "⚙️ *Menu Admin @KuotaAwanBot*\n\nPilih aksi di bawah:", {
    parse_mode: "Markdown",
    reply_markup: adminMenuKeyboard(),
  }).catch(() => {});
}

// ---------- Handler callback tombol ----------
async function handleCallback(cq, res) {
  const chatId = String(cq.message?.chat?.id || cq.from?.id || "");
  const msgId = cq.message?.message_id;
  const data = cq.data || "";

  // Jawab callback dulu (hilangkan spinner)
  await tgAnswerCallback(cq.id).catch(() => {});

  if (!isAdmin(chatId)) {
    await tgAnswerCallback(cq.id, "⛔ Akses ditolak").catch(() => {});
    return res.status(200).json({ ok: true });
  }

  const edit = (text, markup) =>
    tgEditMessage(chatId, msgId, text, {
      parse_mode: "Markdown",
      reply_markup: markup,
    }).catch(() => {});

  switch (data) {
    case "menu": {
      await edit("⚙️ *Menu Admin @KuotaAwanBot*\n\nPilih aksi di bawah:", adminMenuKeyboard());
      break;
    }
    case "link": {
      const link = (await dbGet("canva_link")) || process.env.CANVA_DEFAULT_LINK || "(belum ada)";
      await edit(`🔗 *Link Canva Aktif:*\n\n${link}`, backKeyboard());
      break;
    }
    case "ask_link": {
      await dbSet("pending_action", "set_link");
      await edit("✏️ *Ganti Link Canva*\n\nKirim link baru (format: https://...):", cancelKeyboard());
      break;
    }
    case "stock": {
      const raw = (await dbGet("canva_stock")) ?? "—";
      await edit(`📦 *Stok Canva tersisa:* ${raw}`, backKeyboard());
      break;
    }
    case "ask_stock": {
      await dbSet("pending_action", "set_stock");
      await edit("🎯 *Set Stok Canva*\n\nKirim angka stok baru (contoh: 100):", cancelKeyboard());
      break;
    }
    case "expiry": {
      const expiry = (await dbGet("canva_expiry")) || "2026-08-05T23:59:59+08:00";
      await edit(`⏳ *Tanggal Expired Canva:* ${expiry}`, backKeyboard());
      break;
    }
    case "ask_expiry": {
      await dbSet("pending_action", "set_expiry");
      await edit("📅 *Set Tanggal Expired Canva*\n\nKirim tanggal expired baru (contoh: 2026-08-10T23:59:59+08:00 atau 2026-08-10):", cancelKeyboard());
      break;
    }
    case "claims": {
      const claims = await dbClaims(5);
      if (!claims.length) {
        await edit("📭 Belum ada data klaim.", backKeyboard());
      } else {
        const lines = claims.map(
          (c, i) =>
            `${i + 1}. *${c.name}* (${c.email})\n` +
            `   📍 ${c.location || "-"} · 🌐 ${c.ip || "-"}\n` +
            `   🕒 ${new Date(c.created_at).toLocaleString("id-ID")}`
        );
        await edit(`👥 *5 Klaim Terbaru:*\n\n${lines.join("\n\n")}`, backKeyboard());
      }
      break;
    }
    case "status": {
      const rawStock = (await dbGet("canva_stock")) ?? "—";
      const rawExpiry = (await dbGet("canva_expiry")) ?? "2026-08-05T23:59:59+08:00";
      const totalClaims = await dbClaimCount();
      await edit(
        `📊 *Status Bot*\n\n▪️ Webhook: aktif\n▪️ Stok tersisa: ${rawStock}\n▪️ Expired date: ${rawExpiry}\n▪️ Total klaim: ${totalClaims}`,
        backKeyboard()
      );
      break;
    }
    case "cancel": {
      await dbSet("pending_action", "none");
      await edit("✅ Dibuatalkan. Menu utama:", adminMenuKeyboard());
      break;
    }
    default:
      await edit("⚠️ Perintah tidak dikenal.", adminMenuKeyboard());
  }
  return res.status(200).json({ ok: true });
}

// ---------- Handler pesan teks ----------
async function handleMessage(msg, res) {
  const chatId = String(msg.chat?.id || "");
  const text = (msg.text || "").trim();

  if (!isAdmin(chatId)) {
    // Pengunjung biasa: sapaan + tombol buka website
    await tgSendMessage(
      chatId,
      `Halo! 👋 Saya bot dari website firgiawann.\n\n🌐 Buka website untuk info lebih lanjut:`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: "🌐 Buka Website", web_app: { url: WEBSITE } }]],
        },
      }
    ).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  // ---------- Admin: cek input interaktif (pending_action) ----------
  const pending = (await dbGet("pending_action")) || "none";

  if (pending === "set_link" && text && !text.startsWith("/")) {
    const link = text;
    if (!/^https?:\/\/.+/.test(link)) {
      await tgSendMessage(
        chatId,
        "⚠️ Format link tidak valid. Kirim URL lengkap (https://...):",
        { reply_markup: cancelKeyboard() }
      ).catch(() => {});
      return res.status(200).json({ ok: true });
    }
    await dbSet("canva_link", link);
    await dbHistory(link, "telegram");
    await dbSet("pending_action", "none");
    await tgSendMessage(chatId, `✅ *Link Canva Diupdate!*\n\n${link}\n\nWebsite otomatis pakai link baru.`, {
      parse_mode: "Markdown",
      reply_markup: backKeyboard(),
    }).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  if (pending === "set_stock" && text && !text.startsWith("/")) {
    const stock = Number(text.replace(/[^\d]/g, ""));
    if (!Number.isInteger(stock) || stock < 0) {
      await tgSendMessage(chatId, "⚠️ Angka tidak valid. Kirim angka (contoh: 100):", {
        reply_markup: cancelKeyboard(),
      }).catch(() => {});
      return res.status(200).json({ ok: true });
    }
    await dbSet("canva_stock", String(stock));
    await dbSet("pending_action", "none");
    await tgSendMessage(chatId, `📦 *Stok di-set ke:* ${stock}`, {
      parse_mode: "Markdown",
      reply_markup: backKeyboard(),
    }).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  if (pending === "set_expiry" && text && !text.startsWith("/")) {
    let expVal = text;
    // Format tanggal jika pengguna memasukkan YYYY-MM-DD saja
    if (/^\d{4}-\d{2}-\d{2}$/.test(expVal)) {
      expVal += "T23:59:59+08:00";
    }
    await dbSet("canva_expiry", expVal);
    await dbSet("pending_action", "none");
    await tgSendMessage(chatId, `📅 *Tanggal Expired Canva di-set ke:* ${expVal}\n\nWebsite otomatis menggunakan masa aktif baru.`, {
      parse_mode: "Markdown",
      reply_markup: backKeyboard(),
    }).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  // ---------- Start / menu ----------
  if (text === "/start" || text === "/start@KuotaAwanBot" || text.toLowerCase().includes("menu")) {
    await sendMenu(chatId);
    return res.status(200).json({ ok: true });
  }

  // Teks lain dari admin: balas menu
  await sendMenu(chatId);
  return res.status(200).json({ ok: true });
}

// ---------- Entry point ----------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  // Verifikasi secret token Telegram (anti spoofing)
  if (process.env.WEBHOOK_SECRET) {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    if (secret !== process.env.WEBHOOK_SECRET) {
      return res.status(401).json({ ok: false, error: "Bad secret" });
    }
  }

  let update;
  try {
    update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid JSON" });
  }

  try {
    if (update?.callback_query) {
      return await handleCallback(update.callback_query, res);
    }
    if (update?.message) {
      return await handleMessage(update.message, res);
    }
  } catch (err) {
    console.error("webhook error:", err);
    // coba kirim pesan error ke admin
    try {
      await tgSendMessage(adminId(), `❌ *Webhook error:* ${err.message}`, {
        parse_mode: "Markdown",
      });
    } catch {}
  }

  return res.status(200).json({ ok: true });
}
