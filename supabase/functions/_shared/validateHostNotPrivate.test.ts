import { describe, expect, it } from "vitest";
import {
  assertHostIsSafeToConnect,
  isPrivateOrLoopbackAddress,
  UnsafeHostError,
} from "@sbfn/_shared/validateHostNotPrivate.ts";

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
