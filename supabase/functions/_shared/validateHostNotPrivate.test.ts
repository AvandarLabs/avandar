import {
  assertHostIsSafeToConnect,
  isPrivateOrLoopbackAddress,
  UnsafeHostError,
} from "@sbfn/_shared/validateHostNotPrivate.ts";
import { describe, expect, it } from "vitest";

describe("isPrivateOrLoopbackAddress", () => {
  it.each([
    ["127.0.0.1", true],
    ["127.1.2.3", true],
    ["169.254.169.254", true], // cloud metadata endpoint
    ["169.254.0.1", true],
    ["10.0.0.1", true],
    ["10.255.255.255", true],
    ["172.16.0.1", true],
    ["172.31.255.255", true],
    ["192.168.0.1", true],
    ["192.168.255.255", true],
    ["0.0.0.0", true],
    ["::1", true],
    ["fc00::1", true],
    ["fd12:3456:789a::1", true],
    ["fe80::1", true],
    ["::ffff:127.0.0.1", true], // IPv4-mapped IPv6 loopback
    ["::ffff:10.0.0.1", true], // IPv4-mapped IPv6 private
    ["8.8.8.8", false],
    ["1.1.1.1", false],
    ["172.15.255.255", false], // just outside 172.16.0.0/12
    ["172.32.0.0", false], // just outside 172.16.0.0/12
    ["2606:4700:4700::1111", false], // public IPv6 (Cloudflare)
    ["not-an-ip-at-all", true], // invalid input treated as unsafe
    // IPv4 ranges outside RFC 1918 that still never reach the public internet
    ["100.64.0.1", true], // 100.64.0.0/10 carrier-grade NAT
    ["100.127.255.255", true],
    ["100.128.0.0", false], // just outside 100.64.0.0/10
    ["192.0.0.8", true], // 192.0.0.0/24 IETF protocol assignments
    ["198.18.0.1", true], // 198.18.0.0/15 benchmarking
    ["198.19.255.255", true],
    ["224.0.0.1", true], // 224.0.0.0/4 multicast
    ["255.255.255.255", true], // 240.0.0.0/4 reserved, including broadcast
    // Every spelling of the IPv6 loopback and unspecified addresses
    ["0:0:0:0:0:0:0:1", true],
    ["0::1", true],
    ["::0", true],
    ["0:0:0:0:0:0:0:0", true],
    // IPv4 embedded in IPv6, in both hex and dotted forms
    ["::ffff:7f00:1", true], // ::ffff:127.0.0.1
    ["::ffff:a9fe:a9fe", true], // ::ffff:169.254.169.254, cloud metadata
    ["0:0:0:0:0:ffff:127.0.0.1", true],
    ["::FFFF:10.0.0.1", true],
    ["::127.0.0.1", true], // deprecated IPv4-compatible form
    ["64:ff9b::a9fe:a9fe", true], // NAT64 to 169.254.169.254
    ["2002:7f00:1::", true], // 6to4 wrapping 127.0.0.1
    ["::ffff:0:7f00:1", true], // IPv4-translated (SIIT) 127.0.0.1
    ["64:ff9b:1::1", true], // 64:ff9b:1::/48 local-use NAT64
    ["::ffff:808:808", false], // ::ffff:8.8.8.8 is public
    ["::ffff:0:808:808", false], // IPv4-translated (SIIT) 8.8.8.8 is public
    ["64:ff9b::808:808", false], // NAT64 to 8.8.8.8 is public
    // Remaining non-public IPv6 ranges
    ["fec0::1", true], // fec0::/10 deprecated site-local
    ["ff02::1", true], // ff00::/8 multicast
    ["fe80::1%eth0", true], // link-local with a zone id
  ])("%s -> unsafe=%s", (address, expected) => {
    expect(isPrivateOrLoopbackAddress(address)).toBe(expected);
  });
});

describe("assertHostIsSafeToConnect", () => {
  it("passes a literal public IP through unchanged", async () => {
    await expect(
      assertHostIsSafeToConnect("8.8.8.8", async () => {
        return ["8.8.8.8"];
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects a literal loopback IP", async () => {
    await expect(
      assertHostIsSafeToConnect("127.0.0.1", async () => {
        return ["127.0.0.1"];
      }),
    ).rejects.toThrow(UnsafeHostError);
  });

  it("rejects the cloud metadata address", async () => {
    await expect(
      assertHostIsSafeToConnect("169.254.169.254", async () => {
        return ["169.254.169.254"];
      }),
    ).rejects.toThrow(UnsafeHostError);
  });

  it("rejects a private-range IP", async () => {
    await expect(
      assertHostIsSafeToConnect("10.0.0.5", async () => {
        return ["10.0.0.5"];
      }),
    ).rejects.toThrow(UnsafeHostError);
  });

  it("rejects a hostname that resolves to a private address (DNS rebinding shape)", async () => {
    // The resolver is stubbed to simulate a hostname an attacker controls
    // that resolves to an internal address - the check must reject based on
    // the resolved address, not the (harmless-looking) hostname string.
    await expect(
      assertHostIsSafeToConnect("attacker-controlled.example.com", async () => {
        return ["10.0.0.1"];
      }),
    ).rejects.toThrow(UnsafeHostError);
  });

  it("rejects when a hostname resolves to multiple addresses and any one is unsafe", async () => {
    await expect(
      assertHostIsSafeToConnect("multi-a-record.example.com", async () => {
        return ["8.8.8.8", "127.0.0.1"];
      }),
    ).rejects.toThrow(UnsafeHostError);
  });

  it("allows a hostname that resolves only to public addresses", async () => {
    await expect(
      assertHostIsSafeToConnect("public.example.com", async () => {
        return ["203.0.113.5"];
      }),
    ).resolves.toBeUndefined();
  });
});
