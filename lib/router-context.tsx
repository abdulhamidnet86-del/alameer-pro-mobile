import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

export type RouterConnection = { host: string; port: number; username: string; password: string; tls: boolean };
type RouterContextValue = { connection: RouterConnection | null; setConnection: (connection: RouterConnection | null) => void; };
const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: PropsWithChildren) { const [connection, setConnection] = useState<RouterConnection | null>(null); const value = useMemo(() => ({ connection, setConnection }), [connection]); return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>; }
export function useRouterConnection() { const context = useContext(RouterContext); if (!context) throw new Error("useRouterConnection must be used within RouterProvider"); return context; }
