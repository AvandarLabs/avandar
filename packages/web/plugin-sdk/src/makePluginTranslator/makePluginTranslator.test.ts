import { i18n } from "@lingui/core";
import { makePluginTranslator } from "@plugin-sdk/makePluginTranslator/makePluginTranslator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MockInstance } from "vitest";

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

  it("formats a valid plural for each plural category", () => {
    const t = makePluginTranslator({ locale: "en", messages: MESSAGES });
    expect(t("rows.count", { count: 1 })).toBe("1 row");
    expect(t("rows.count", { count: 3 })).toBe("3 rows");
  });
});

describe("makePluginTranslator locale fallback", () => {
  it("falls back to the base language when the exact locale has no messages", () => {
    const t = makePluginTranslator({ locale: "es-MX", messages: MESSAGES });
    expect(t("greeting", { name: "Ana" })).toBe("Hola, Ana");
  });

  it("prefers the exact locale over its base language", () => {
    const t = makePluginTranslator({
      locale: "es-MX",
      messages: {
        ...MESSAGES,
        "es-MX": { greeting: "Quihubo, {name}" },
      },
    });
    expect(t("greeting", { name: "Ana" })).toBe("Quihubo, Ana");
  });

  it("falls back to the base language for a script subtag locale", () => {
    const t = makePluginTranslator({
      locale: "zh-Hans",
      messages: { en: { hello: "Hello" }, zh: { hello: "Ni hao" } },
    });
    expect(t("hello")).toBe("Ni hao");
  });

  it("falls back to English when neither the exact locale nor the base language has the key", () => {
    const t = makePluginTranslator({ locale: "es-MX", messages: MESSAGES });
    expect(t("rows.count", { count: 2 })).toBe("2 rows");
  });

  it("prefers the base language over English when the exact locale lacks the key", () => {
    const t = makePluginTranslator({
      locale: "es-MX",
      messages: {
        en: { first: "First", second: "Second" },
        es: { first: "Primero" },
        "es-MX": { second: "Segundo" },
      },
    });
    expect(t("first")).toBe("Primero");
  });

  it("prefers the exact locale over English when the base language lacks the key", () => {
    const t = makePluginTranslator({
      locale: "es-MX",
      messages: {
        en: { first: "First", second: "Second" },
        es: { first: "Primero" },
        "es-MX": { second: "Segundo" },
      },
    });
    expect(t("second")).toBe("Segundo");
  });
});

describe("makePluginTranslator with bad messages", () => {
  let consoleErrorSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      return undefined;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the raw message when a plural is syntactically broken", () => {
    const t = makePluginTranslator({
      locale: "en",
      messages: { en: { broken: "{count, plural, one {# row}" } },
    });
    expect(t("broken", { count: 2 })).toBe("{count, plural, one {# row}");
  });

  it("compiles each message once at creation, not on every call", () => {
    const t = makePluginTranslator({
      locale: "en",
      messages: { en: { broken: "{count, plural, one {# row}" } },
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    t("broken", { count: 2 });
    t("broken", { count: 2 });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns the raw message when the formatter is unknown", () => {
    const t = makePluginTranslator({
      locale: "en",
      messages: { en: { spell: "{n, spellout}" } },
    });
    expect(t("spell", { n: 3 })).toBe("{n, spellout}");
  });

  it("returns the raw message when a number style is not valid", () => {
    const t = makePluginTranslator({
      locale: "en",
      messages: { en: { amount: "{n, number, bogus}" } },
    });
    expect(t("amount", { n: 3 })).toBe("{n, number, bogus}");
  });

  it("returns the raw message when the locale is not a valid Intl locale", () => {
    const t = makePluginTranslator({
      locale: "not a locale",
      messages: { "not a locale": { rows: "{n, plural, other {# rows}}" } },
    });
    expect(t("rows", { n: 2 })).toBe("{n, plural, other {# rows}}");
  });

  it("keeps formatting the messages that are valid", () => {
    const t = makePluginTranslator({
      locale: "en",
      messages: {
        en: {
          broken: "{count, plural, one {# row}",
          "rows.count": "{count, plural, one {# row} other {# rows}}",
        },
      },
    });
    expect(t("rows.count", { count: 2 })).toBe("2 rows");
  });
});

describe("makePluginTranslator with prototype keys", () => {
  it.each(["constructor", "toString", "hasOwnProperty", "__proto__"])(
    "returns the key itself for %s",
    (key) => {
      const t = makePluginTranslator({ locale: "en", messages: MESSAGES });
      expect(t(key)).toBe(key);
    },
  );

  it("resolves a plugin message that is keyed constructor", () => {
    const t = makePluginTranslator({
      locale: "en",
      messages: { en: { constructor: "Builder" } },
    });
    expect(t("constructor")).toBe("Builder");
  });
});

describe("makePluginTranslator isolation", () => {
  it("leaves the global Lingui instance untouched", () => {
    // The ids are variables, because `lingui extract` reads an `i18n._` call
    // with a string literal as an app message and adds it to the catalogs.
    const knownId = "known";
    const pluginOnlyId = "greeting";
    i18n.loadAndActivate({
      locale: "fr",
      messages: { [knownId]: "Connu" },
    });

    makePluginTranslator({ locale: "es", messages: MESSAGES });
    makePluginTranslator({ locale: "en", messages: MESSAGES });

    expect(i18n.locale).toBe("fr");
    expect(i18n._(knownId)).toBe("Connu");
    expect(i18n._(pluginOnlyId)).toBe(pluginOnlyId);
  });
});
