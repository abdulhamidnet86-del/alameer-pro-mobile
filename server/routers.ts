import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { RouterOsClient } from "./routeros";
import { escapeTelegramHtml, sendTelegramDocument, sendTelegramMessage, telegramStatus } from "./telegram";
import { z } from "zod";

const resourcePaths = {
  usermanager: { users: "/user-manager/user", profiles: "/user-manager/profile", sessions: "/user-manager/session" },
  hotspot: { users: "/ip/hotspot/user", active: "/ip/hotspot/active", profiles: "/ip/hotspot/user/profile" },
} as const;
const resourceSchema = z.enum(["usermanager.users", "usermanager.profiles", "usermanager.sessions", "hotspot.users", "hotspot.active", "hotspot.profiles"]);
const connectionSchema = z.object({ host: z.string().min(1).max(255), port: z.number().int().min(1).max(65535), username: z.string().min(1).max(128), password: z.string().max(256), tls: z.boolean() });
const paramsSchema = z.record(z.string(), z.string()).refine((params) => Object.keys(params).every((key) => !key.startsWith(".")), "Reserved RouterOS parameters are not allowed");
const powerSchema = z.enum(["reboot", "shutdown"]);
const packageSchema = z.object({ name: z.string().min(1).max(64), nameForUsers: z.string().max(64).optional(), price: z.string().max(32), validity: z.string().max(32), startsWhen: z.enum(["assigned", "first-auth"]).default("assigned"), comment: z.string().max(255).optional(), downloadLimit: z.string().max(32).optional(), uploadLimit: z.string().max(32).optional(), transferLimit: z.string().max(32).optional(), uptimeLimit: z.string().max(32).optional(), limitationName: z.string().max(80).optional() });
const packageUpdateSchema = packageSchema.extend({ profileId: z.string().min(1).max(100), limitationId: z.string().min(1).max(100), originalName: z.string().min(1).max(64), originalLimitationName: z.string().min(1).max(80) });
const telegramEventsSchema = z.object({ dhcp: z.boolean(), hotspot: z.boolean(), backup: z.boolean(), sales: z.boolean(), netwatch: z.boolean(), router: z.boolean(), electricity: z.boolean() });
const monitorState = new Map<string, string>();
const monitorTimers = new Map<string, ReturnType<typeof setInterval>>();
type RouterConnection = z.infer<typeof connectionSchema>;
type TelegramEvents = z.infer<typeof telegramEventsSchema>;
function monitorKey(connection: RouterConnection) { return `${connection.host}:${connection.port}`; }
async function pollMonitor(connection: RouterConnection, events: TelegramEvents) {
  const key = monitorKey(connection);
  try {
    const api = client(connection); const [netwatch, activeHotspot, sessions, resources] = await Promise.all([api.print("/tool/netwatch", "host,status,comment"), api.print("/ip/hotspot/active", "user,address"), api.print("/user-manager/session", "user,active,status"), api.print("/system/resource", "version,uptime,cpu-load,free-memory,total-memory")]);
    const activeSessions = sessions.filter((row) => row.active === "yes" || row.status === "active").length;
    const state = JSON.stringify({ online: true, netwatch: events.netwatch ? netwatch.map((row) => `${row.host}:${row.status}`).sort() : [], hotspot: events.hotspot ? activeHotspot.length : undefined, sessions: events.hotspot ? activeSessions : undefined, resources: events.router ? resources[0] : undefined });
    const previous = monitorState.get(key); monitorState.set(key, state); const changed = previous !== undefined && previous !== state;
    if (changed) await sendTelegramMessage(`<b>تحديث مراقبة RouterOS</b>\nأجهزة Netwatch: ${netwatch.length}\nالمتصلون Hotspot: ${activeHotspot.length}\nالجلسات النشطة: ${activeSessions}\nحالة الراوتر: ${resources[0]?.uptime || "متصل"}\nتم الإرسال بعد تغير الحالة مع منع التكرار.`);
    return { success: true, changed, online: true, netwatch, active: activeHotspot.length, sessions: activeSessions, resources: resources[0] ?? {} };
  } catch (error) {
    const offlineState = JSON.stringify({ online: false }); const previous = monitorState.get(key); monitorState.set(key, offlineState); const changed = previous !== offlineState;
    if (changed && (events.electricity || events.router)) await sendTelegramMessage(`<b>تنبيه مراقبة RouterOS</b>\nتعذر الوصول إلى الراوتر: ${escapeTelegramHtml(connection.host)}\nالسبب: ${escapeTelegramHtml(error instanceof Error ? error.message : "انقطاع أو انتهاء المهلة")}\nسيتم إرسال إشعار العودة عند استعادة الاتصال.`);
    return { success: false, changed, online: false, netwatch: [], active: 0, sessions: 0, resources: {}, error: "offline" };
  }
}
const dashboardToolSchema = z.enum(["ping", "interfaces", "ip-addresses", "dhcp-leases", "dhcp-server", "nat", "dns", "arp", "firewall-filter", "mangle", "layer7", "connections", "neighbors", "logs", "resources", "traffic", "routerboard", "device-health", "hotspot-users", "hotspot-active", "usermanager-users", "system-users", "queues", "ppp-users", "router-files", "netwatch", "hotspot-html-files", "bluetooth"]);
type Resource = z.infer<typeof resourceSchema>;
const financeFiltersSchema = z.object({ connection: connectionSchema, fromDate: z.string().optional(), toDate: z.string().optional(), profile: z.string().optional(), nas: z.string().optional(), status: z.string().optional() });
function parseRouterDate(value?: string) { if (!value) return undefined; const timestamp = Date.parse(value); if (Number.isFinite(timestamp)) return timestamp; const match = value.match(/^(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})/); return match ? Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : undefined; }
function inDateRange(value: string | undefined, from?: string, to?: string) { const timestamp = parseRouterDate(value); if (timestamp === undefined) return !from && !to; const start = from ? parseRouterDate(from) : undefined; const end = to ? parseRouterDate(`${to}T23:59:59`) ?? parseRouterDate(to) : undefined; return (start === undefined || timestamp >= start) && (end === undefined || timestamp <= end); }
function toAmount(value?: string) { const amount = Number(value ?? 0); return Number.isFinite(amount) ? amount : 0; }
function pathFor(resource: Resource) { const [domain, key] = resource.split(".") as [keyof typeof resourcePaths, string]; return resourcePaths[domain][key as keyof typeof resourcePaths[typeof domain]]; }
function client(connection?: z.infer<typeof connectionSchema>) { return new RouterOsClient(connection); }

export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query((opts) => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }) }),
  routeros: router({
    status: publicProcedure.input(connectionSchema).mutation(({ input }) => client(input).system()),
    list: publicProcedure.input(z.object({ connection: connectionSchema, resource: resourceSchema, proplist: z.string().max(500).optional() })).query(({ input }) => client(input.connection).print(pathFor(input.resource), input.proplist)),
    add: publicProcedure.input(z.object({ connection: connectionSchema, resource: resourceSchema, params: paramsSchema })).mutation(({ input }) => client(input.connection).add(pathFor(input.resource), input.params)),
    update: publicProcedure.input(z.object({ connection: connectionSchema, resource: resourceSchema, id: z.string().min(1).max(100), params: paramsSchema })).mutation(({ input }) => client(input.connection).set(pathFor(input.resource), input.id, input.params)),
    remove: publicProcedure.input(z.object({ connection: connectionSchema, resource: resourceSchema, id: z.string().min(1).max(100) })).mutation(({ input }) => client(input.connection).remove(pathFor(input.resource), input.id)),
    power: publicProcedure.input(z.object({ connection: connectionSchema, action: powerSchema })).mutation(({ input }) => client(input.connection).execute(input.action === "reboot" ? "/system/reboot" : "/system/shutdown")),
    finance: router({
      summary: publicProcedure.input(financeFiltersSchema).query(async ({ input }) => {
        const api = client(input.connection);
        const [payments, userProfiles, profiles, sessions] = await Promise.all([
          api.print("/user-manager/payment", "profile,user,price,currency,trans-status,trans-start,trans-end,.id"),
          api.print("/user-manager/user-profile", "user,profile,state,end-time,.id"),
          api.print("/user-manager/profile", "name,price,.id"),
          api.print("/user-manager/session", "user,nas-ip-address,started,ended,active,status,download,upload,.id"),
        ]);
        const filteredPayments = payments.filter((item) => (!input.profile || item.profile === input.profile) && (!input.status || item["trans-status"] === input.status) && inDateRange(item["trans-end"] || item["trans-start"], input.fromDate, input.toDate));
        const filteredUserProfiles = userProfiles.filter((item) => (!input.profile || item.profile === input.profile));
        const filteredSessions = sessions.filter((item) => (!input.nas || item["nas-ip-address"] === input.nas) && inDateRange(item.ended || item.started, input.fromDate, input.toDate));
        const approvedPayments = filteredPayments.filter((item) => item["trans-status"] === "approved");
        const expiredCards = filteredUserProfiles.filter((item) => item.state === "used").length;
        const packageRows = profiles.filter((profile) => !input.profile || profile.name === input.profile).map((profile) => {
          const profilePayments = approvedPayments.filter((payment) => payment.profile === profile.name);
          const profileUsers = filteredUserProfiles.filter((item) => item.profile === profile.name);
          return { package: profile.name ?? "", cards: profileUsers.length, value: profilePayments.reduce((sum, payment) => sum + toAmount(payment.price), 0), price: profile.price ?? "0" };
        });
        const totalRevenue = approvedPayments.reduce((sum, payment) => sum + toAmount(payment.price), 0);
        const timestamps = [...filteredPayments.map((item) => item["trans-end"] || item["trans-start"]), ...filteredSessions.map((item) => item.ended || item.started)].filter(Boolean).map((value) => parseRouterDate(value)).filter((value): value is number => value !== undefined);
        const nasValues = Array.from(new Set(filteredSessions.map((item) => item["nas-ip-address"]).filter(Boolean)));
        return { lastSyncAt: new Date().toISOString(), currency: approvedPayments[0]?.currency ?? "", totals: { totalCards: filteredUserProfiles.length, soldCards: Math.max(filteredUserProfiles.length - expiredCards, 0), expiredCards, revenue: totalRevenue, expenses: null, profit: null, approvedPayments: approvedPayments.length, sessions: filteredSessions.length }, rows: packageRows, profiles: profiles.map((item) => item.name).filter((value): value is string => Boolean(value)), nasValues, latestRecordAt: timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null, payments: filteredPayments.length };
      }),
    }),
    dashboard: router({
      tool: publicProcedure.input(z.object({ connection: connectionSchema, tool: dashboardToolSchema, target: z.string().max(255).optional() })).mutation(async ({ input }) => {
        const api = client(input.connection);
        if (input.tool === "ping") return { tool: input.tool, rows: await api.execute("/ping", { address: input.target || "8.8.8.8", count: "4" }) };
        const paths: Record<z.infer<typeof dashboardToolSchema>, [string, string]> = {
          ping: ["/ping", "address,avg-rtt,min-rtt,max-rtt,packet-loss"],
          interfaces: ["/interface", "name,type,running,disabled,rx-byte,tx-byte,comment"], "ip-addresses": ["/ip/address", "address,network,interface,disabled,comment"], "dhcp-leases": ["/ip/dhcp-server/lease", "address,mac-address,host-name,status,server,expires-after"], "dhcp-server": ["/ip/dhcp-server", "name,interface,address-pool,lease-time,disabled"], nat: ["/ip/firewall/nat", "chain,action,src-address,dst-address,protocol,to-addresses,to-ports,disabled,comment"], dns: ["/ip/dns", "servers,allow-remote-requests,cache-size,cache-used"], arp: ["/ip/arp", "address,mac-address,interface,status,disabled"], "firewall-filter": ["/ip/firewall/filter", "chain,action,protocol,src-address,dst-address,bytes,packets,disabled,comment"], mangle: ["/ip/firewall/mangle", "chain,action,protocol,src-address,dst-address,bytes,packets,disabled,comment"], layer7: ["/ip/firewall/layer7-protocol", "name,regexp,comment"], connections: ["/ip/firewall/connection", "protocol,src-address,dst-address,reply-src-address,reply-dst-address,tcp-state"], neighbors: ["/ip/neighbor", "identity,address,mac-address,interface,version,board"], logs: ["/log", "time,topics,message"], resources: ["/system/resource", "version,uptime,cpu-load,free-memory,total-memory,free-hdd-space,total-hdd-space"], traffic: ["/interface", "name,running,rx-byte,tx-byte,rx-packet,tx-packet"], routerboard: ["/system/routerboard", "model,serial-number,firmware-type,current-firmware,upgrade-firmware"], "device-health": ["/system/health", "name,value,type"], "hotspot-users": ["/ip/hotspot/user", "name,profile,bytes-in,bytes-out,uptime,disabled,comment"], "hotspot-active": ["/ip/hotspot/active", "user,address,mac-address,server,uptime,bytes-in,bytes-out"], "usermanager-users": ["/user-manager/user", "username,password,disabled,comment"], "system-users": ["/user", "name,group,disabled,comment"], queues: ["/queue/simple", "name,target,max-limit,limit-at,bytes,disabled,comment"], "ppp-users": ["/ppp/secret", "name,service,profile,disabled,local-address,remote-address,last-logged-out,comment"], "router-files": ["/file", "name,size,creation-time,type"], netwatch: ["/tool/netwatch", "host,status,interval,timeout,comment",], "hotspot-html-files": ["/file", "name,size,creation-time,type"], bluetooth: ["/interface/bluetooth", "name,mac-address,disabled,mtu,comment"],
        };
        const [path, proplist] = paths[input.tool];
        return { tool: input.tool, rows: await api.print(path, proplist) };
      }),
    }),
    telegram: router({
      status: publicProcedure.query(() => telegramStatus()),
      test: publicProcedure.mutation(async () => { await sendTelegramMessage("<b>ALAMEER PRO</b>\nتم إرسال رسالة اختبار Telegram بنجاح."); return { success: true }; }),
      report: publicProcedure.input(z.object({ title: z.string().max(120), text: z.string().max(12000) })).mutation(async ({ input }) => { await sendTelegramMessage(`<b>${escapeTelegramHtml(input.title)}</b>\n${escapeTelegramHtml(input.text)}`); return { success: true }; }),
      cards: publicProcedure.input(z.object({ kind: z.enum(["usermanager", "hotspot"]), cards: z.array(z.object({ username: z.string().max(128), password: z.string().max(128), profile: z.string().max(128).optional(), expires: z.string().max(64).optional() })).min(1).max(100) })).mutation(async ({ input }) => { const title = input.kind === "hotspot" ? "بطاقات Hotspot" : "بطاقات User Manager"; const text = input.cards.map((card, index) => `${index + 1}. المستخدم: ${card.username}\nكلمة المرور: ${card.password}${card.profile ? `\nالباقة: ${card.profile}` : ""}${card.expires ? `\nالانتهاء: ${card.expires}` : ""}`).join("\n\n"); await sendTelegramMessage(`<b>${title}</b>\n${escapeTelegramHtml(text)}`); return { success: true, count: input.cards.length }; }),
      document: publicProcedure.input(z.object({ filename: z.string().regex(/^[a-zA-Z0-9._-]+$/).max(120), base64: z.string().min(1).max(9000000), caption: z.string().max(1000).optional() })).mutation(async ({ input }) => { await sendTelegramDocument(Buffer.from(input.base64, "base64"), input.filename, input.caption); return { success: true }; }),
      notifyCurrent: publicProcedure.input(connectionSchema).mutation(async ({ input }) => { const api = client(input); const [activeHotspot, activeSessions, users] = await Promise.all([api.print("/ip/hotspot/active", "user,address,uptime"), api.print("/user-manager/session", "user,active,status"), api.print("/user-manager/user", "username,disabled")]); const active = activeHotspot.length + activeSessions.filter((row) => row.active === "yes" || row.status === "active").length; const enabledUsers = users.filter((row) => row.disabled !== "true").length; await sendTelegramMessage(`<b>تحديث ALAMEER PRO</b>\nالمستخدمون الفعّالون: ${active}\nمستخدمو User Manager: ${enabledUsers}\nوقت المزامنة: ${new Date().toLocaleString("ar-YE")}\nالراوتر: ${escapeTelegramHtml(input.host)}`); return { success: true, active, enabledUsers }; }),
      eventTest: publicProcedure.input(z.object({ event: z.string().min(1).max(80) })).mutation(async ({ input }) => { await sendTelegramMessage(`<b>تجربة ميزة Telegram</b>\nتم تشغيل تجربة: ${escapeTelegramHtml(input.event)}\nالوقت: ${new Date().toLocaleString("ar-YE")}`); return { success: true }; }),
      monitorNow: publicProcedure.input(z.object({ connection: connectionSchema, events: telegramEventsSchema })).mutation(({ input }) => pollMonitor(input.connection, input.events)),
      startMonitor: publicProcedure.input(z.object({ connection: connectionSchema, events: telegramEventsSchema, intervalSeconds: z.number().int().min(60).max(86400) })).mutation(async ({ input }) => { const key = monitorKey(input.connection); const existing = monitorTimers.get(key); if (existing) clearInterval(existing); await pollMonitor(input.connection, input.events); const timer = setInterval(() => { void pollMonitor(input.connection, input.events); }, input.intervalSeconds * 1000); monitorTimers.set(key, timer); return { success: true, intervalSeconds: input.intervalSeconds }; }),
      stopMonitor: publicProcedure.input(connectionSchema).mutation(({ input }) => { const key = monitorKey(input); const existing = monitorTimers.get(key); if (existing) clearInterval(existing); monitorTimers.delete(key); return { success: true }; }),
    }),
    packages: router({
      list: publicProcedure.input(connectionSchema).query(async ({ input }) => {
        const api = client(input);
        const [profiles, limitations, links, userProfiles] = await Promise.all([
          api.print("/user-manager/profile", "name,name-for-users,price,validity,starts-when,comment,.id"),
          api.print("/user-manager/limitation", "name,download-limit,upload-limit,transfer-limit,uptime-limit,comment,.id"),
          api.print("/user-manager/profile-limitation", "profile,limitation,from-time,till-time,weekdays,.id"),
          api.print("/user-manager/user-profile", "user,profile,.id"),
        ]);
        const counts = userProfiles.reduce<Record<string, number>>((acc, item) => { if (item.profile) acc[item.profile] = (acc[item.profile] ?? 0) + 1; return acc; }, {});
        return { profiles, limitations, links, userCounts: counts };
      }),
      create: publicProcedure.input(z.object({ connection: connectionSchema, package: packageSchema })).mutation(async ({ input }) => {
        const api = client(input.connection);
        const profile = await api.add("/user-manager/profile", { name: input.package.name, "name-for-users": input.package.nameForUsers || input.package.name, price: input.package.price, validity: input.package.validity, "starts-when": input.package.startsWhen, comment: input.package.comment || "" });
        const profileId = profile[0]?.[".id"] ?? profile[0]?.ret ?? ""; let limitationId = "";
        const limitationName = input.package.limitationName || `${input.package.name}-limitation`;
        try {
          const limitation = await api.add("/user-manager/limitation", { name: limitationName, "download-limit": input.package.downloadLimit || "0", "upload-limit": input.package.uploadLimit || "0", "transfer-limit": input.package.transferLimit || "0", "uptime-limit": input.package.uptimeLimit || "00:00:00", comment: input.package.comment || "" });
          limitationId = limitation[0]?.[".id"] ?? limitation[0]?.ret ?? "";
          await api.add("/user-manager/profile-limitation", { profile: input.package.name, limitation: limitationName });
          return { profileId, limitationId, limitationName };
        } catch (error) {
          if (limitationId) await api.remove("/user-manager/limitation", limitationId).catch(() => undefined);
          if (profileId) await api.remove("/user-manager/profile", profileId).catch(() => undefined);
          throw error;
        }
      }),
      update: publicProcedure.input(z.object({ connection: connectionSchema, package: packageUpdateSchema })).mutation(async ({ input }) => {
        const api = client(input.connection); const next = input.package; const limitationName = next.limitationName || `${next.name}-limitation`;
        await api.set("/user-manager/profile", next.profileId, { name: next.name, "name-for-users": next.nameForUsers || next.name, price: next.price, validity: next.validity, "starts-when": next.startsWhen, comment: next.comment || "" });
        await api.set("/user-manager/limitation", next.limitationId, { name: limitationName, "download-limit": next.downloadLimit || "0", "upload-limit": next.uploadLimit || "0", "transfer-limit": next.transferLimit || "0", "uptime-limit": next.uptimeLimit || "00:00:00", comment: next.comment || "" });
        if (next.originalName !== next.name || next.originalLimitationName !== limitationName) {
          const links = await api.print("/user-manager/profile-limitation", "profile,limitation,.id"); const link = links.find((item) => item.profile === next.originalName && item.limitation === next.originalLimitationName);
          if (link?.[".id"]) await api.remove("/user-manager/profile-limitation", link[".id"]);
          await api.add("/user-manager/profile-limitation", { profile: next.name, limitation: limitationName });
        }
        return { success: true, limitationName };
      }),
      remove: publicProcedure.input(z.object({ connection: connectionSchema, profileId: z.string().min(1).max(100), limitationId: z.string().min(1).max(100), profileName: z.string().min(1).max(64), limitationName: z.string().min(1).max(80) })).mutation(async ({ input }) => {
        const api = client(input.connection); const links = await api.print("/user-manager/profile-limitation", "profile,limitation,.id");
        const link = links.find((item) => item.profile === input.profileName && item.limitation === input.limitationName);
        if (link?.[".id"]) await api.remove("/user-manager/profile-limitation", link[".id"]);
        await api.remove("/user-manager/limitation", input.limitationId); await api.remove("/user-manager/profile", input.profileId);
        return { success: true };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
