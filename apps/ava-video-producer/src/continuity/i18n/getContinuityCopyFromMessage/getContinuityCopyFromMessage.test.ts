import assert from "node:assert/strict";
import test from "node:test";
import { setupI18n } from "@lingui/core";
import { getContinuityCopyFromMessage } from "./getContinuityCopyFromMessage";

test("active locale translations take precedence without changing product messages", () => {
  const i18n = setupI18n({
    locale: "es",
    messages: {
      es: {
        "continuity.Composition Atlas": ["Atlas de composiciones"],
        "product.save": ["Guardar"],
      },
    },
  });
  assert.equal(
    getContinuityCopyFromMessage({ i18n, message: "Composition Atlas" }),
    "Atlas de composiciones",
  );
  assert.equal(i18n._("product.save"), "Guardar");
  assert.equal(i18n.locale, "es");
});

test("regional locales use a supplied parent-language catalog before English", () => {
  const i18n = setupI18n({ locale: "fr-CA", messages: { "fr-CA": {} } });
  const catalogs = {
    en: { "continuity.Composition Atlas": ["Composition Atlas"] },
    fr: { "continuity.Composition Atlas": ["Atlas de compositions"] },
  };
  assert.equal(
    getContinuityCopyFromMessage({
      i18n,
      message: "Composition Atlas",
      catalogs,
    }),
    "Atlas de compositions",
  );
});

test("missing locale messages fall back to generated English and preserve empty copy", () => {
  const i18n = setupI18n({
    locale: "es",
    messages: {
      es: {
        "product.save": ["Guardar"],
      },
    },
  });
  assert.equal(
    getContinuityCopyFromMessage({ i18n, message: "Composition Atlas" }),
    "Composition Atlas",
  );
  assert.equal(getContinuityCopyFromMessage({ i18n, message: "" }), "");
  assert.equal(i18n._("product.save"), "Guardar");
  assert.deepEqual(Object.keys(i18n.messages), ["product.save"]);
});
