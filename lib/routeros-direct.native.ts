import TcpSocket from "react-native-tcp-socket";
import type { LocalRouterConnection, LocalRouterInfo } from "./routeros-direct";

type ParsedReply = { type: string; data: Record<string, string> };

function encodeLength(length: number) {
  if (length < 0x80) return Uint8Array.of(length);
  if (length < 0x4000) return Uint8Array.of((length >> 8) | 0x80, length & 0xff);
  if (length < 0x200000) return Uint8Array.of((length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff);
  if (length < 0x10000000) return Uint8Array.of((length >> 24) | 0xe0, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff);
  return Uint8Array.of(0xf0, (length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff);
}
function joinBytes(parts: Uint8Array[]) { const size = parts.reduce((total, item) => total + item.length, 0); const output = new Uint8Array(size); let offset = 0; parts.forEach((item) => { output.set(item, offset); offset += item.length; }); return output; }
function sentence(words: string[]) { const encoder = new TextEncoder(); return joinBytes([...words.map((word) => { const body = encoder.encode(word); return joinBytes([encodeLength(body.length), body]); }), Uint8Array.of(0)]); }
function append(left: Uint8Array, right: Uint8Array) { const merged = new Uint8Array(left.length + right.length); merged.set(left); merged.set(right, left.length); return merged; }
function readWord(input: Uint8Array, start: number): { value: string; next: number } | null {
  if (start >= input.length) return null;
  const first = input[start]; let length = 0; let header = 1;
  if (first < 0x80) length = first;
  else if (first < 0xc0) { if (start + 2 > input.length) return null; length = ((first & 0x3f) << 8) | input[start + 1]; header = 2; }
  else if (first < 0xe0) { if (start + 3 > input.length) return null; length = ((first & 0x1f) << 16) | (input[start + 1] << 8) | input[start + 2]; header = 3; }
  else if (first < 0xf0) { if (start + 4 > input.length) return null; length = ((first & 0x0f) << 24) | (input[start + 1] << 16) | (input[start + 2] << 8) | input[start + 3]; header = 4; }
  else { if (start + 5 > input.length) return null; length = ((input[start + 1] << 24) >>> 0) | (input[start + 2] << 16) | (input[start + 3] << 8) | input[start + 4]; header = 5; }
  if (start + header + length > input.length) return null;
  return { value: new TextDecoder().decode(input.subarray(start + header, start + header + length)), next: start + header + length };
}
function readSentence(input: Uint8Array, start: number): { words: string[]; next: number } | null { const words: string[] = []; let cursor = start; while (true) { const word = readWord(input, cursor); if (!word) return null; cursor = word.next; if (!word.value) return { words, next: cursor }; words.push(word.value); } }
function parse(words: string[]): ParsedReply { const data: Record<string, string> = {}; words.slice(1).forEach((word) => { const separator = word.indexOf("="); if (separator > 0) data[word.slice(0, separator)] = word.slice(separator + 1); }); return { type: words[0] ?? "", data }; }
function asBytes(value: unknown) { if (typeof value === "string") return new TextEncoder().encode(value); return new Uint8Array(value as ArrayLike<number>); }

export async function testLocalRouterOs(config: LocalRouterConnection): Promise<LocalRouterInfo> {
  if (!config.host || !config.username || !config.password) throw new Error("أدخل عنوان الراوتر واسم المستخدم وكلمة المرور أولًا.");
  return new Promise((resolve, reject) => {
    let finished = false; let loginComplete = false; let buffer = new Uint8Array(); let resource: LocalRouterInfo = {};
    const close = () => { try { socket.destroy(); } catch { /* socket already closed */ } };
    const fail = (message: string) => { if (finished) return; finished = true; close(); reject(new Error(message)); };
    const finish = () => { if (finished) return; finished = true; close(); resolve(resource); };
    const socket = TcpSocket.createConnection({ host: config.host, port: config.port, tls: config.tls, tlsCheckValidity: false, connectTimeout: 8000, interface: "wifi" }, () => {
      socket.setNoDelay(true);
      socket.write(sentence(["/login", `=name=${config.username}`, `=password=${config.password}`]));
    });
    const deadline = setTimeout(() => fail("انتهت مهلة اتصال RouterOS المحلي."), 10000);
    socket.on("error", (error) => { clearTimeout(deadline); fail(error?.message || "تعذر فتح اتصال TCP مع الراوتر."); });
    socket.on("timeout", () => { clearTimeout(deadline); fail("انتهت مهلة اتصال RouterOS المحلي."); });
    socket.on("data", (chunk) => {
      buffer = append(buffer, asBytes(chunk)); let offset = 0;
      while (true) {
        const item = readSentence(buffer, offset); if (!item) break; offset = item.next;
        const reply = parse(item.words);
        if (reply.type === "!trap") { clearTimeout(deadline); fail(reply.data.message || "رفض RouterOS طلب الاتصال."); return; }
        if (!loginComplete && reply.type === "!done") { loginComplete = true; socket.write(sentence(["/system/resource/print", "=.proplist=version,uptime,cpu-load,free-memory,total-memory"])); continue; }
        if (loginComplete && reply.type === "!re") resource = { version: reply.data.version, uptime: reply.data.uptime, cpuLoad: reply.data["cpu-load"], freeMemory: reply.data["free-memory"], totalMemory: reply.data["total-memory"] };
        if (loginComplete && reply.type === "!done") { clearTimeout(deadline); finish(); return; }
      }
      buffer = buffer.subarray(offset);
    });
  });
}
