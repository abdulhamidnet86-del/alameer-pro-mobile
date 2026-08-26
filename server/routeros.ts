import net from "node:net";
import tls from "node:tls";

type SocketLike = net.Socket | tls.TLSSocket;
type Reply = Record<string, string>;

function encodeLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length]);
  if (length < 0x4000) return Buffer.from([(length >> 8) | 0x80, length & 0xff]);
  if (length < 0x200000) return Buffer.from([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff]);
  if (length < 0x10000000) return Buffer.from([(length >> 24) | 0xe0, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
  return Buffer.from([0xf0, (length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
}
function encodeWord(value: string) { const body = Buffer.from(value, "utf8"); return Buffer.concat([encodeLength(body.length), body]); }
function encodeSentence(words: string[]) { return Buffer.concat([...words.map(encodeWord), Buffer.from([0])]); }
function decodeWord(buffer: Buffer, offset: number): { value: string; next: number } | null {
  if (offset >= buffer.length) return null;
  const first = buffer[offset]; let length: number; let header = 1;
  if (first < 0x80) length = first;
  else if (first < 0xc0) { if (offset + 2 > buffer.length) return null; length = ((first & 0x3f) << 8) | buffer[offset + 1]; header = 2; }
  else if (first < 0xe0) { if (offset + 3 > buffer.length) return null; length = ((first & 0x1f) << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2]; header = 3; }
  else if (first < 0xf0) { if (offset + 4 > buffer.length) return null; length = ((first & 0x0f) << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3]; header = 4; }
  else { if (offset + 5 > buffer.length) return null; length = buffer.readUInt32BE(offset + 1); header = 5; }
  if (offset + header + length > buffer.length) return null;
  return { value: buffer.subarray(offset + header, offset + header + length).toString("utf8"), next: offset + header + length };
}

function parseSentence(words: string[]): { type: string; data: Reply } {
  const data: Reply = {};
  for (const value of words.slice(1)) { const separator = value.indexOf("="); if (separator > 0) data[value.slice(0, separator)] = value.slice(separator + 1); }
  return { type: words[0] ?? "", data };
}

export class RouterOsClient {
  private socket?: SocketLike;
  private buffer = Buffer.alloc(0);
  private readonly timeoutMs = 8000;

  constructor(private readonly config = { host: process.env.ROUTEROS_HOST ?? "", port: Number(process.env.ROUTEROS_PORT || 8728), username: process.env.ROUTEROS_USERNAME ?? "", password: process.env.ROUTEROS_PASSWORD ?? "", tls: process.env.ROUTEROS_TLS === "true" }) {}

  private async connect() {
    if (!this.config.host || !this.config.username || !this.config.password) throw new Error("RouterOS connection is not configured");
    this.socket = await new Promise<SocketLike>((resolve, reject) => {
      const onConnected = () => { socket.setTimeout(0); resolve(socket); };
      const socket = this.config.tls ? tls.connect({ host: this.config.host, port: this.config.port, rejectUnauthorized: false }, onConnected) : net.createConnection({ host: this.config.host, port: this.config.port }, onConnected);
      socket.setTimeout(this.timeoutMs, () => socket.destroy(new Error("RouterOS connection timed out")));
      socket.once("error", reject);
    });
  }

  private async request(words: string[]): Promise<{ type: string; data: Reply }[]> {
    const socket = this.socket; if (!socket) throw new Error("RouterOS socket is not connected");
    return new Promise((resolve, reject) => {
      let local = Buffer.alloc(0); const replies: { type: string; data: Reply }[] = [];
      const timer = setTimeout(() => { socket.destroy(); reject(new Error("RouterOS API request timed out")); }, this.timeoutMs);
      const onData = (chunk: Buffer) => { local = Buffer.concat([local, chunk]); let offset = 0;
        while (true) { const parsed = decodeWord(local, offset); if (!parsed) return; offset = parsed.next;
          if (!parsed.value) { const last = replies[replies.length - 1]; if (last?.type === "!trap") { clearTimeout(timer); socket.off("data", onData); reject(new Error(last.data.message || "RouterOS rejected the request")); return; } if (last?.type === "!done" || last?.type === "!empty") { clearTimeout(timer); socket.off("data", onData); resolve(replies); return; } continue; }
          const sentenceWords = [parsed.value]; let sentenceOffset = offset;
          while (true) { const next = decodeWord(local, sentenceOffset); if (!next) return; sentenceOffset = next.next; if (!next.value) break; sentenceWords.push(next.value); }
          offset = sentenceOffset; replies.push(parseSentence(sentenceWords));
        }
      };
      socket.on("data", onData); socket.once("error", (error) => { clearTimeout(timer); reject(error); }); socket.write(encodeSentence(words));
    });
  }

  async execute(command: string, params: Record<string, string> = {}) {
    try { await this.connect(); await this.request(["/login", `=name=${this.config.username}`, `=password=${this.config.password}`]); const words = [command, ...Object.entries(params).map(([key, value]) => `=${key}=${value}`)]; return (await this.request(words)).filter((reply) => reply.type === "!re").map((reply) => reply.data); }
    finally { this.socket?.destroy(); this.socket = undefined; }
  }

  async system() { return (await this.execute("/system/resource/print", { ".proplist": "version,uptime,cpu-load,free-memory,total-memory" }))[0] ?? {}; }
  async print(path: string, proplist?: string) { return this.execute(`${path}/print`, proplist ? { ".proplist": proplist } : {}); }
  async add(path: string, params: Record<string, string>) { return this.execute(`${path}/add`, params); }
  async set(path: string, id: string, params: Record<string, string>) { return this.execute(`${path}/set`, { ".id": id, ...params }); }
  async remove(path: string, id: string) { return this.execute(`${path}/remove`, { ".id": id }); }
}
