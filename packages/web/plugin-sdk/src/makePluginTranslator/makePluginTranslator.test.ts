import { makePluginTranslator } from "@plugin-sdk/makePluginTranslator/makePluginTranslator";
import { describe, expect, it } from "vitest";

const MESSAGES = {
  en: {
    "rows.count": "{count, plural, one {# row} other {# rows}}",
    greeting: "Hello, {name}",
  },
  es: { greeting: "Hola, {name}" },
};

describe("makePluginTranslator", () => {
  it("formats ICU messages in the requested locale", () => {
    const t = makePluginTranslator({ locale: "es", messages: MESSAGES });
    expect(t("greeting", { name: "Ana" })).toBe("Hola, Ana");
  });

  it("falls back to English for a missing translation", () => {
    const t = makePluginTranslator({ locale: "es", messages: MESSAGES });
    expect(t("rows.count", { count: 2 })).toBe("2 rows");
  });

  it("returns the key when no locale has it", () => {
    const t = makePluginTranslator({ locale: "en", messages: MESSAGES });
    expect(t("missing.key")).toBe("missing.key");
  });
});
