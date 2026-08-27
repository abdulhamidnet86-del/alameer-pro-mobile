import { describe, expect, it } from "vitest";
import { defaultTelegramSettings, publicTelegramSettings } from "../server/telegram-settings";

describe("Telegram settings security", () => {
  it("masks bot credentials in normal settings responses", () => {
    const settings = defaultTelegramSettings();
    settings.bots = [{ id: "bot-1", name: "اختبار", token: "123456:SECRET_TOKEN", chatId: "987654321", enabled: true }];
    const safe = publicTelegramSettings(settings);
    expect(safe.bots[0]).toEqual({ id: "bot-1", name: "اختبار", enabled: true, tokenMasked: "•••••••••••••••OKEN", chatIdMasked: "••••••321" });
    expect(JSON.stringify(safe)).not.toContain("SECRET_TOKEN");
    expect(JSON.stringify(safe)).not.toContain("987654321");
  });

  it("starts with explicit per-event schedules and custom feature storage", () => {
    const settings = defaultTelegramSettings();
    expect(settings.schedules.netwatch.mode).toBe("instant");
    settings.schedules.netwatch = { mode: "threeHourly" };
    settings.customFeatures.push({ id: "feature-1", name: "تنبيه مخصص", description: "اختبار", command: "/system resource print", enabled: true });
    expect(settings.schedules.netwatch.mode).toBe("threeHourly");
    expect(settings.customFeatures[0].command).toBe("/system resource print");
  });
});
