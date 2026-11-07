import { resolveManifestString } from "@plugin-manifest/strings/resolveManifestString.ts";
import { describe, expect, it } from "vitest";

const STRINGS = {
  en: { "plugin.name": "Epidemiology" },
  es: { "plugin.name": "Epidemiología" },
};

describe("resolveManifestString", () => {
  it("resolves a key in the requested locale", () => {
    expect(
      resolveManifestString({
        strings: STRINGS,
        locale: "es",
        value: "%plugin.name%",
      }),
    ).toBe("Epidemiología");
  });

  it("falls back to English", () => {
    expect(
      resolveManifestString({
        strings: STRINGS,
        locale: "fr",
        value: "%plugin.name%",
      }),
    ).toBe("Epidemiology");
  });

  it("returns plain text unchanged", () => {
    expect(
      resolveManifestString({ strings: STRINGS, locale: "en", value: "Plain" }),
    ).toBe("Plain");
  });
});
