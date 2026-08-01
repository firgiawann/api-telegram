// ============================================================
// Helper Telegram — semua call ke Bot API lewat sini.
// Token bot HANYA ada di env server, tidak pernah di frontend.
// ============================================================

export async function tgSendMessage(chatId, text, parseMode = "Markdown") {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum di-set");
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    }
  );
  return res.json();
}

export function escapeMarkdown(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/[*_`[]/g, "\\$&");
}
