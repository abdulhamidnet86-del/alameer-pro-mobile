import net from "node:net";
import tls from "node:tls";
import { describe, expect, it } from "vitest";

type SocketLike = net.Socket | tls.TLSSocket;

function encodeLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length]);
  if (length < 0x4000) return Buffer.from([(length >> 8) | 0x80, length & 0xff]);
  if (length < 0x200000) return Buffer.from([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff]);
  if (length < 0x10000000) return Buffer.from([(length >> 24) | 0xe0, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
  return Buffer.from([0xf0, (length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
}

function word(value: string) {
  const body = Buffer.from(value, "utf8");
  return Buffer.concat([encodeLength(body.length), body]);
}

function sentence(words: string[]) {
  return Buffer.concat([...words.map(word), Buffer.from([0])]);
}

function readWord(buffer: Buffer, offset: number): { value: string; next: number } | null {
  if (offset >= buffer.length) return null;
  const first = buffer[offset];
  let length = 0;
  let header = 1;
  if (first < 0x80) length = first;
  else if (first < 0xc0) { if (offset + 2 > buffer.length) return null; length = ((first & 0x3f) << 8) | buffer[offset + 1]; header = 2; }
  else if (first < 0xe0) { if (offset + 3 > buffer.length) return null; length = ((first & 0x1f) << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2]; header = 3; }
  else if (first < 0xf0) { if (offset + 4 > buffer.length) return null; length = ((first & 0x0f) << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3]; header = 4; }
  else { if (offset + 5 > buffer.length) return null; length = buffer.readUInt32BE(offset + 1); header = 5; }
  if (offset + header + length > buffer.length) return null;
  return { value: buffer.subarray(offset + header, offset + header + length).toString("utf8"), next: offset + header + length };
}

function request(socket: SocketLike, payload: Buffer) {
  return new Promise<string[]>((resolve, reject) => {
    let data = Buffer.alloc(0);
    const timer = setTimeout(() => { socket.destroy(); reject(new Error("RouterOS API timeout")); }, 8000);
    const onData = (chunk: Buffer) => {
      data = Buffer.concat([data, chunk]);
      let offset = 0;
      const words: string[] = [];
      while (true) {
        const parsed = readWord(data, offset);
        if (!parsed) return;
        offset = parsed.next;
        if (!parsed.value) {
          clearTimeout(timer); socket.off("data", onData); resolve(words); return;
        }
        words.push(parsed.value);
      }
    };
    socket.on("data", onData);
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
    socket.write(payload);
  });
}

describe("RouterOS live connection", () => {
  it.skipIf(process.env.RUN_LIVE_ROUTEROS_TEST !== "true")("authenticates and reads system resource from the configured router", async () => {
    const host = process.env.ROUTEROS_HOST;
    const port = Number(process.env.ROUTEROS_PORT || 8728);
    const username = process.env.ROUTEROS_USERNAME;
    const password = process.env.ROUTEROS_PASSWORD;
    const tlsEnabled = process.env.ROUTEROS_TLS === "true";
    if (!host || !username || !password) throw new Error("RouterOS connection secrets are not configured");

    const socket = await new Promise<SocketLike>((resolve, reject) => {
      const connection = tlsEnabled
        ? tls.connect({ host, port, rejectUnauthorized: false }, () => resolve(connection))
        : net.createConnection({ host, port }, () => resolve(connection));
      connection.once("error", reject);
    });

    const login = await request(socket, sentence(["/login", `=name=${username}`, `=password=${password}`]));
    expect(login[0]).toBe("!done");
    const resource = await request(socket, sentence(["/system/resource/print", ".proplist=version,uptime"]));
    expect(resource[0]).toBe("!re");
    expect(resource.some((entry) => entry.startsWith("version=") || entry.startsWith("uptime="))).toBe(true);
    socket.destroy();
  }, 15000);
});
