import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { RouterOsClient } from "./routeros";
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
type Resource = z.infer<typeof resourceSchema>;
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
