export type RouterConnection = { host: string; port: number; username: string; password: string; tls: boolean };
export type TelegramBotConfig = { token: string; chatId: string };
type TelegramResponse<T> = { ok: boolean; result?: T; description?: string };

function defaultBot(): TelegramBotConfig {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  if (!token) throw new Error("Telegram bot is not configured");
  if (!chatId) throw new Error("Telegram chat is not configured");
  return { token, chatId };
}
function botOrDefault(bot?: TelegramBotConfig) { return bot?.token && bot.chatId ? bot : defaultBot(); }
async function call<T>(bot: TelegramBotConfig | undefined, method: string, init?: RequestInit) {
  const selected = botOrDefault(bot);
  const response = await fetch(`https://api.telegram.org/bot${selected.token}/${method}`, init);
  const body = await response.json() as TelegramResponse<T>;
  if (!response.ok || !body.ok) throw new Error(body.description || `Telegram ${method} failed`);
  return body.result as T;
}
export async function getTelegramMe(bot?: TelegramBotConfig) { return call<{ username?: string; first_name?: string }>(bot, "getMe"); }
export async function telegramStatus(bot?: TelegramBotConfig) { const me = await getTelegramMe(bot); const selected = botOrDefault(bot); return { configured: true, bot: me.username ? `@${me.username}` : me.first_name || "Telegram Bot", chatIdConfigured: Boolean(selected.chatId), tokenMasked: `${"•".repeat(Math.max(0, selected.token.length - 4))}${selected.token.slice(-4)}`, chatIdMasked: `${"•".repeat(Math.max(0, selected.chatId.length - 3))}${selected.chatId.slice(-3)}` }; }
export async function sendTelegramMessage(text: string, parseMode: "HTML" | "MarkdownV2" = "HTML", bot?: TelegramBotConfig) { const selected = botOrDefault(bot); return call(selected, "sendMessage", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: selected.chatId, text, parse_mode: parseMode, disable_web_page_preview: true }) }); }
export async function sendTelegramDocument(content: Uint8Array, filename: string, caption?: string, mimeType = "application/pdf", bot?: TelegramBotConfig) { const selected = botOrDefault(bot); const form = new FormData(); form.append("chat_id", selected.chatId); form.append("document", new Blob([new Uint8Array(content).buffer as ArrayBuffer], { type: mimeType }), filename); if (caption) form.append("caption", caption); return call(selected, "sendDocument", { method: "POST", body: form }); }
export function escapeTelegramHtml(value: string) { return value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char); }
