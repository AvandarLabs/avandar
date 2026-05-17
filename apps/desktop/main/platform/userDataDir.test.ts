import { describe, expect, it } from "vitest";
import { resolveUserDataDir } from "./userDataDir";

describe("resolveUserDataDir", () => {
  it("returns the macOS Application Support path on darwin", () => {
    const result = resolveUserDataDir({
      platform: "darwin",
      home: "/Users/pablo",
      appdata: undefined,
    });
    expect(result).toBe("/Users/pablo/Library/Application Support/Avandar");
  });

  it("returns the APPDATA path on win32", () => {
    const result = resolveUserDataDir({
      platform: "win32",
      home: "C:\\Users\\pablo",
      appdata: "C:\\Users\\pablo\\AppData\\Roaming",
    });
    expect(result).toBe("C:\\Users\\pablo\\AppData\\Roaming\\Avandar");
  });

  it("preserves spaces inside the APPDATA path on win32", () => {
    const result = resolveUserDataDir({
      platform: "win32",
      home: "C:\\Users\\Pablo Sarmiento",
      appdata: "C:\\Users\\Pablo Sarmiento\\AppData\\Roaming",
    });
    expect(result).toBe(
      "C:\\Users\\Pablo Sarmiento\\AppData\\Roaming\\Avandar",
    );
  });

  it("throws on win32 when APPDATA is missing", () => {
    expect(() => {
      return resolveUserDataDir({
        platform: "win32",
        home: "C:\\Users\\pablo",
        appdata: undefined,
      });
    }).toThrow(/APPDATA required/);
  });

  it("throws on unsupported platforms", () => {
    expect(() => {
      return resolveUserDataDir({
        platform: "linux",
        home: "/home/pablo",
        appdata: undefined,
      });
    }).toThrow(/unsupported platform: linux/i);
  });
});
