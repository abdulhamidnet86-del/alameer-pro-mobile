import { Buffer } from "buffer";
import { describe, expect, it } from "vitest";
import { parseMndpPacket } from "../lib/mndp-parser";

function field(value: string) { const text = Buffer.from(value, "utf8"); const size = Buffer.alloc(2); size.writeUInt16BE(text.length); return Buffer.concat([size, text, Buffer.from([0, 0])]); }

describe("MNDP parser", () => {
  it("يستخرج اسم MikroTik والموديل وIP وMAC من البث", () => {
    const prefix = Buffer.alloc(16); prefix[8] = 0xaa; prefix[9] = 0xbb; prefix[10] = 0xcc; prefix[11] = 0x11; prefix[12] = 0x22; prefix[13] = 0x33;
    const packet = Buffer.concat([prefix, field("ALAMEER-ROUTER"), field("6.49.19"), field("MikroTik"), field("up"), field("RouterOS"), field("RB2011UiAS"), field("\u0000"), field("ether1")]);
    expect(parseMndpPacket(packet, { address: "192.168.88.1" })).toMatchObject({ identity: "ALAMEER-ROUTER", model: "RB2011UiAS", ip: "192.168.88.1", mac: "AA:BB:CC:11:22:33", version: "6.49.19" });
  });
});
