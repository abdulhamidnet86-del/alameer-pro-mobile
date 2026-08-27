type TelegramResponse<T> = { ok: boolean; result?: T; description?: string };

function token() { const value = process.env.TELEGRAM_BOT_TOKEN; if (!value) throw new Error("Telegram bot is not configured"); return value; }
function chatId() { const value = process.env.TELEGRAM_CHAT_ID; if (!value) throw new Error("Telegram chat is not configured"); return value; }
async function call<T>(method: string, init?: RequestInit) {
  const response = await fetch(`https://api.telegram.org/bot${token()}/${method}`, init);
  const body = await response.json() as TelegramResponse<T>;
  if (!response.ok || !body.ok) throw new Error(body.description || `Telegram ${method} failed`);
  return body.result as T;
}
export async function telegramStatus() { const me = await call<{ username?: string; first_name?: string }>("getMe"); return { configured: true, bot: me.username ? `@${me.username}` : me.first_name || "Telegram Bot", chatIdConfigured: Boolean(chatId()) }; }
export async function sendTelegramMessage(text: string, parseMode: "HTML" | "MarkdownV2" = "HTML") { return call("sendMessage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId(), text, parse_mode: parseMode, disable_web_page_preview: true }) }); }
export async function sendTelegramDocument(content: Uint8Array, filename: string, caption?: string, mimeType = "application/pdf") { const form = new FormData(); form.append("chat_id", chatId()); form.append("document", new Blob([new Uint8Array(content).buffer as ArrayBuffer], { type: mimeType }), filename); if (caption) form.append("caption", caption); return call("sendDocument", { method: "POST", body: form }); }
export function escapeTelegramHtml(value: string) { return value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char); }
