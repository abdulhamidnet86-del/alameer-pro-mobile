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
  }),
});

export type AppRouter = typeof appRouter;
