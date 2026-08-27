import type { DiscoveredMikroTik } from "./mikrotik-discovery";

export async function discoverMikroTik(): Promise<DiscoveredMikroTik[]> {
  throw new Error("اكتشاف MikroTik يتطلب APK على Android واتصال Wi‑Fi بالشبكة المحلية.");
}
