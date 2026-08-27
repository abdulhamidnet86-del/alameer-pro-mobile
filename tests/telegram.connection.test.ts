import { describe, expect, it } from "vitest";

describe("Telegram configuration", () => {
  it("validates the bot token with Telegram getMe", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    expect(token, "TELEGRAM_BOT_TOKEN is required").toBeTruthy();
    expect(chatId, "TELEGRAM_CHAT_ID is required").toBeTruthy();
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    expect(response.ok).toBe(true);
    const body = await response.json() as { ok?: boolean; result?: { is_bot?: boolean } };
    expect(body.ok).toBe(true);
    expect(body.result?.is_bot).toBe(true);
  }, 15000);
});
