// ============================================================
// Helper Telegram — semua call ke Bot API lewat sini.
// Token bot HANYA ada di env server, tidak pernah di frontend.
// ============================================================

export async function tgSendMessage(chatId, text, opts = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum di-set");
  const payload = { chat_id: chatId, text };
  if (opts.parse_mode) payload.parse_mode = opts.parse_mode;
  if (opts.reply_markup) payload.reply_markup = opts.reply_markup;
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

// Edit pesan yang sudah terkirim (untuk tombol callback)
export async function tgEditMessage(chatId, messageId, text, opts = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum di-set");
  const payload = { chat_id: chatId, message_id: messageId, text };
  if (opts.parse_mode) payload.parse_mode = opts.parse_mode;
  if (opts.reply_markup) payload.reply_markup = opts.reply_markup;
  const res = await fetch(
    `https://api.telegram.org/bot${token}/editMessageText`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

// Jawab callback tombol (matikan spinner loading)
export async function tgAnswerCallback(callbackId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false };
  const payload = { callback_query_id: callbackId, show_alert: false };
  if (text) payload.text = text;
  const res = await fetch(
    `https://api.telegram.org/bot${token}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

export function escapeMarkdown(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/[*_`[]/g, "\\$&");
}
