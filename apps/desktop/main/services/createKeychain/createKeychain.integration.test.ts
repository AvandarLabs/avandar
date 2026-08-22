import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createKeychain } from "./createKeychain";

/*
 * G2.14: real `/usr/bin/security` round-trip. Gated by KEYCHAIN_E2E=1
 * so it doesn't fire on every CI run; on first execution macOS prompts
 * for keychain access: accept "Always Allow" for the test binary.
 *
 * The test service name is unique per run so a torn-down state doesn't
 * pollute a developer's keychain.
 */

const enabled =
  process.env.KEYCHAIN_E2E === "1" && process.platform === "darwin";

describe.skipIf(!enabled)("createKeychain (real macOS keychain)", () => {
  let serviceName = "";
  const accountName = "avandar-test-account";

  beforeEach(() => {
    serviceName = `com.avandarlabs.desktop.test.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}`;
  });

  afterEach(async () => {
    // Best-effort cleanup so leftover entries don't accumulate.
    try {
      const keychain = createKeychain();
      await keychain.delete(serviceName, accountName);
    } catch {
      // Cleanup failures are fine: the test service names are
      // randomized per run.
    }
  });

  it("set / get round-trips an ASCII password", async () => {
    const keychain = createKeychain();
    await keychain.set(serviceName, accountName, "hello-world");
    expect(await keychain.get(serviceName, accountName)).toBe("hello-world");
  });

  it("round-trips a non-ASCII payload byte-for-byte", async () => {
    const keychain = createKeychain();
    const payload = "héllo 🌮 ñoño \u0001\u0007 mañana";
    await keychain.set(serviceName, accountName, payload);
    expect(await keychain.get(serviceName, accountName)).toBe(payload);
  });

  it("overwrites an existing entry in place", async () => {
    const keychain = createKeychain();
    await keychain.set(serviceName, accountName, "first");
    await keychain.set(serviceName, accountName, "second");
    expect(await keychain.get(serviceName, accountName)).toBe("second");
  });

  it("returns null when no entry exists", async () => {
    const keychain = createKeychain();
    expect(await keychain.get(serviceName, accountName)).toBeNull();
  });

  it("delete removes the entry; further get returns null", async () => {
    const keychain = createKeychain();
    await keychain.set(serviceName, accountName, "to-be-removed");
    await keychain.delete(serviceName, accountName);
    expect(await keychain.get(serviceName, accountName)).toBeNull();
  });

  it("delete on a missing entry is a no-op", async () => {
    const keychain = createKeychain();
    await expect(
      keychain.delete(serviceName, accountName),
    ).resolves.toBeUndefined();
  });
});
