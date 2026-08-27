import UdpSockets from "react-native-udp";
import { Buffer } from "buffer";
import { parseMndpPacket, type MndpDevice as DiscoveredMikroTik } from "./mndp-parser";

type Sender = { address?: string; port?: number };

export async function discoverMikroTik(): Promise<DiscoveredMikroTik[]> {
  return new Promise((resolve, reject) => {
    const devices = new Map<string, DiscoveredMikroTik>();
    const socket = UdpSockets.createSocket({ type: "udp4", reusePort: true });
    let settled = false;
    const end = (error?: Error) => {
      if (settled) return;
      settled = true;
      try { socket.close(); } catch { /* socket already closed */ }
      if (error) reject(error); else resolve(Array.from(devices.values()).sort((a, b) => a.identity.localeCompare(b.identity)));
    };
    const timer = setTimeout(() => end(), 2600);
    socket.on("error", (error: Error) => { clearTimeout(timer); end(error); });
    socket.on("message", (message: Buffer, sender: Sender) => {
      const item = parseMndpPacket(Buffer.from(message), sender);
      if (item) devices.set(item.id, item);
    });
    try {
      socket.bind(0, "0.0.0.0", () => {
        try {
          socket.setBroadcast(true);
          const probe = Buffer.from([0, 0, 0, 0]);
          socket.send(probe, 0, probe.length, 5678, "255.255.255.255");
          setTimeout(() => socket.send(probe, 0, probe.length, 5678, "255.255.255.255"), 350);
        } catch (error) { clearTimeout(timer); end(error instanceof Error ? error : new Error("تعذر بث طلب اكتشاف MikroTik.")); }
      });
    } catch (error) { clearTimeout(timer); end(error instanceof Error ? error : new Error("تعذر تشغيل اكتشاف MikroTik.")); }
  });
}
