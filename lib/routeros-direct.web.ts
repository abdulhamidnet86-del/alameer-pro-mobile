import type { LocalRouterConnection, LocalRouterInfo } from "./routeros-direct";

export async function testLocalRouterOs(_config: LocalRouterConnection): Promise<LocalRouterInfo> {
  throw new Error("الاتصال المحلي المباشر متاح داخل APK فقط، وليس في معاينة المتصفح.");
}
