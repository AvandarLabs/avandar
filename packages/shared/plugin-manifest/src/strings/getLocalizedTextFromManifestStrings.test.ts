import { getLocalizedTextFromManifestStrings } from "@plugin-manifest/strings/getLocalizedTextFromManifestStrings.ts";
import { describe, expect, it } from "vitest";

const STRINGS = {
  en: { "plugin.name": "Epidemiology" },
  es: { "plugin.name": "Epidemiología" },
};

describe("getLocalizedTextFromManifestStrings", () => {
  it("resolves a key in the requested locale", () => {
    expect(
      getLocalizedTextFromManifestStrings({
        strings: STRINGS,
        locale: "es",
        value: "%plugin.name%",
      }),
    ).toBe("Epidemiología");
  });

  it("falls back to English", () => {
    expect(
      getLocalizedTextFromManifestStrings({
        strings: STRINGS,
        locale: "fr",
        value: "%plugin.name%",
      }),
    ).toBe("Epidemiology");
  });

  it("returns plain text unchanged", () => {
    expect(
      getLocalizedTextFromManifestStrings({
        strings: STRINGS,
        locale: "en",
        value: "Plain",
      }),
    ).toBe("Plain");
  });

  it("never returns an inherited property for a key like toString", () => {
    expect(
      getLocalizedTextFromManifestStrings({
        strings: STRINGS,
        locale: "en",
        value: "%toString%",
      }),
    ).toBe("toString");
  });

  it("never reads an inherited property for a locale like constructor", () => {
    expect(
      getLocalizedTextFromManifestStrings({
        strings: STRINGS,
        locale: "constructor",
        value: "%name%",
      }),
    ).toBe("name");
  });

  describe("locale fallback", () => {
    const FALLBACK_STRINGS = {
      en: { "plugin.name": "Epidemiology" },
      zh: { "plugin.name": "流行病学" },
      "zh-Hant": { "plugin.name": "流行病學" },
    };

    it("prefers the exact locale over its base language", () => {
      expect(
        getLocalizedTextFromManifestStrings({
          strings: FALLBACK_STRINGS,
          locale: "zh-Hant",
          value: "%plugin.name%",
        }),
      ).toBe("流行病學");
    });

    it("falls back from a regional locale to its base language", () => {
      expect(
        getLocalizedTextFromManifestStrings({
          strings: FALLBACK_STRINGS,
          locale: "zh-Hans",
          value: "%plugin.name%",
        }),
      ).toBe("流行病学");
    });

    it("falls back to English when the base language is missing too", () => {
      expect(
        getLocalizedTextFromManifestStrings({
          strings: FALLBACK_STRINGS,
          locale: "pt-BR",
          value: "%plugin.name%",
        }),
      ).toBe("Epidemiology");
    });

    it("returns the bare key when no locale has it", () => {
      expect(
        getLocalizedTextFromManifestStrings({
          strings: FALLBACK_STRINGS,
          locale: "zh-Hans",
          value: "%plugin.missing%",
        }),
      ).toBe("plugin.missing");
    });
  });
});
