import { Buffer } from "buffer";

export type MndpDevice = { id: string; identity: string; model: string; ip: string; mac: string; version?: string; interface?: string };

type Sender = { address?: string };

function readField(data: Buffer, start: number): { value: string; next: number } | null {
  if (start + 2 > data.length) return null;
  const length = data.readUInt16BE(start);
  const valueStart = start + 2;
  const valueEnd = valueStart + length;
  if (valueEnd > data.length) return null;
  return { value: data.subarray(valueStart, valueEnd).toString("utf8").replace(/\0/g, "").trim(), next: valueEnd + 2 };
}

/** يفك تسلسل MNDP الذي يرسله RouterOS عبر UDP 5678 دون اختراع حقول غير مستلمة. */
export function parseMndpPacket(packet: Buffer, sender: Sender): MndpDevice | null {
  if (packet.length < 18 || !sender.address) return null;
  const mac = Array.from(packet.subarray(8, 14)).map((value) => value.toString(16).padStart(2, "0")).join(":").toUpperCase();
  const identity = readField(packet, 16);
  if (!identity?.value) return null;
  const version = readField(packet, identity.next);
  const platform = version ? readField(packet, version.next) : null;
  const uptime = platform ? readField(packet, platform.next) : null;
  const software = uptime ? readField(packet, uptime.next) : null;
  const board = software ? readField(packet, software.next) : null;
  const unpack = board ? readField(packet, board.next) : null;
  const interfaceName = unpack ? readField(packet, unpack.next) : null;
  return { id: `${sender.address}:${mac}`, identity: identity.value, model: board?.value || platform?.value || "MikroTik Router", ip: sender.address, mac, version: version?.value, interface: interfaceName?.value };
}
