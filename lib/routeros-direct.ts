export type LocalRouterConnection = { host: string; port: number; username: string; password: string; tls: boolean };
export type LocalRouterInfo = { version?: string; uptime?: string; cpuLoad?: string; freeMemory?: string; totalMemory?: string };

/** يختار Metro تلقائيًا ملف Android الأصلي في APK وملف الويب في المعاينة. */
export async function testLocalRouterOs(_config: LocalRouterConnection): Promise<LocalRouterInfo> {
  throw new Error("الاتصال المحلي المباشر متاح داخل APK فقط، وليس في معاينة المتصفح.");
}
