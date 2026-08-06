import { afterEach, describe, expect, it, vi } from "vitest";
import { getUserDataDir } from "./getUserDataDir";

/*
 * `getUserDataDir` reads `process.platform`, `process.env.HOME`,
 * `process.env.USERPROFILE`, and `process.env.APPDATA` at call time.
 * To cover every branch we override those before each assertion and
 * restore them afterwards: `process.env` is restored via vitest's
 * built-in stub helpers, and `process.platform` is restored from a
 * captured snapshot of the host platform.
 */

const ORIGINAL_PLATFORM = process.platform;

function stubPlatform(platform: NodeJS.Platform | string): void {
  Object.defineProperty(process, "platform", {
    value: platform,
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(process, "platform", {
    value: ORIGINAL_PLATFORM,
    configurable: true,
  });
  vi.unstubAllEnvs();
});

describe("getUserDataDir", () => {
  it("returns the macOS Application Support path on darwin", () => {
    stubPlatform("darwin");
    vi.stubEnv("HOME", "/Users/pablo");

    expect(getUserDataDir()).toBe(
      "/Users/pablo/Library/Application Support/Avandar",
    );
  });

  it("returns the APPDATA path on win32", () => {
    stubPlatform("win32");
    vi.stubEnv("USERPROFILE", "C:\\Users\\pablo");
    vi.stubEnv("APPDATA", "C:\\Users\\pablo\\AppData\\Roaming");

    expect(getUserDataDir()).toBe(
      "C:\\Users\\pablo\\AppData\\Roaming\\Avandar",
    );
  });

  it("preserves spaces inside the APPDATA path on win32", () => {
    stubPlatform("win32");
    vi.stubEnv("USERPROFILE", "C:\\Users\\Test User");
    vi.stubEnv("APPDATA", "C:\\Users\\Test User\\AppData\\Roaming");

    expect(getUserDataDir()).toBe(
      "C:\\Users\\Test User\\AppData\\Roaming\\Avandar",
    );
  });

  it("throws on win32 when APPDATA is missing", () => {
    stubPlatform("win32");
    vi.stubEnv("USERPROFILE", "C:\\Users\\pablo");
    vi.stubEnv("APPDATA", "");

    expect(() => {
      return getUserDataDir();
    }).toThrow(/APPDATA required/);
  });

  it("throws on unsupported platforms (e.g. linux)", () => {
    stubPlatform("linux");
    vi.stubEnv("HOME", "/home/pablo");

    expect(() => {
      return getUserDataDir();
    }).toThrow(/unsupported platform: linux/i);
  });
});
