import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { telegramSettings } from "../drizzle/schema";
import type { RouterConnection } from "./telegram";

export type ScheduleMode = "instant" | "hourly" | "threeHourly" | "daily" | "custom";
export type TelegramEventKey = "dhcp" | "hotspot" | "backup" | "sales" | "netwatch" | "router" | "electricity";
export type TelegramBot = { id: string; name: string; token: string; chatId: string; enabled: boolean };
export type TelegramCustomFeature = { id: string; name: string; description: string; command: string; enabled: boolean };
export type TelegramSettings = {
  bots: TelegramBot[];
  events: Record<TelegramEventKey, boolean>;
  schedules: Record<TelegramEventKey, { mode: ScheduleMode; customMinutes?: number }>;
  monitorIntervalSeconds: number;
  monitorEnabled: boolean;
  customFeatures: TelegramCustomFeature[];
  updatedAt: string;
};

const memory = new Map<string, TelegramSettings>();
const EVENT_KEYS: TelegramEventKey[] = ["dhcp", "hotspot", "backup", "sales", "netwatch", "router", "electricity"];
const DEFAULT_EVENTS = Object.fromEntries(EVENT_KEYS.map((key) => [key, true])) as TelegramSettings["events"];
const DEFAULT_SCHEDULES = Object.fromEntries(EVENT_KEYS.map((key) => [key, { mode: "instant" as ScheduleMode }])) as TelegramSettings["schedules"];

function keyFor(connection: RouterConnection) {
  return createHash("sha256").update(`${connection.host}:${connection.port}:${connection.username}`).digest("hex");
}
function encryptionKey() {
  const secret = process.env.JWT_SECRET || "alameer-pro-telegram-settings";
  return createHash("sha256").update(secret).digest();
}
function encrypt(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}
function decrypt(value: string) {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Invalid Telegram settings payload");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}
function envBot(): TelegramBot[] {
  const token = process.env.TELEGRAM_BOT_TOKEN || ""; const chatId = process.env.TELEGRAM_CHAT_ID || "";
  return token && chatId ? [{ id: "env-default", name: "البوت الأساسي", token, chatId, enabled: true }] : [];
}
export function defaultTelegramSettings(): TelegramSettings {
  return { bots: envBot(), events: { ...DEFAULT_EVENTS }, schedules: { ...DEFAULT_SCHEDULES }, monitorIntervalSeconds: 600, monitorEnabled: false, customFeatures: [], updatedAt: new Date().toISOString() };
}
export async function loadTelegramSettings(connection: RouterConnection) {
  const key = keyFor(connection); const cached = memory.get(key); if (cached) return { settings: cached, persisted: true };
  const db = await getDb();
  if (db) {
    const row = await db.select().from(telegramSettings).where(eq(telegramSettings.connectionKey, key)).limit(1);
    if (row[0]) {
      try { const decoded = JSON.parse(decrypt(row[0].payload)) as TelegramSettings | { settings: TelegramSettings }; const settings = "settings" in decoded ? decoded.settings : decoded; memory.set(key, settings); return { settings, persisted: true }; } catch { /* corrupted rows are replaced on next save */ }
    }
  }
  const settings = defaultTelegramSettings(); memory.set(key, settings); return { settings, persisted: Boolean(db) };
}
export async function saveTelegramSettings(connection: RouterConnection, input: TelegramSettings) {
  const settings = { ...input, updatedAt: new Date().toISOString() }; const key = keyFor(connection); memory.set(key, settings); const db = await getDb();
  if (!db) return { settings, persisted: false };
  const payload = encrypt(JSON.stringify({ settings, connection }));
  await db.insert(telegramSettings).values({ connectionKey: key, payload }).onDuplicateKeyUpdate({ set: { payload, updatedAt: new Date() } });
  return { settings, persisted: true };
}
export async function listPersistedMonitors() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select().from(telegramSettings); const result: Array<{ connection: RouterConnection; settings: TelegramSettings }> = [];
  for (const row of rows) { try { const decoded = JSON.parse(decrypt(row.payload)) as { connection?: RouterConnection; settings?: TelegramSettings }; if (decoded.connection && decoded.settings?.monitorEnabled) result.push({ connection: decoded.connection, settings: decoded.settings }); } catch { /* ignore malformed legacy rows */ } }
  return result;
}
export async function revealTelegramBot(connection: RouterConnection, id: string) {
  const { settings } = await loadTelegramSettings(connection); const bot = settings.bots.find((item) => item.id === id);
  if (!bot) throw new Error("Telegram bot not found");
  return { id: bot.id, token: bot.token, chatId: bot.chatId };
}
export function publicTelegramSettings(settings: TelegramSettings) {
  return { ...settings, bots: settings.bots.map((bot) => ({ id: bot.id, name: bot.name, enabled: bot.enabled, tokenMasked: bot.token ? `${"•".repeat(Math.max(0, bot.token.length - 4))}${bot.token.slice(-4)}` : "غير محفوظ", chatIdMasked: bot.chatId ? `${"•".repeat(Math.max(0, bot.chatId.length - 3))}${bot.chatId.slice(-3)}` : "غير محفوظ" })) };
}
export { keyFor };
