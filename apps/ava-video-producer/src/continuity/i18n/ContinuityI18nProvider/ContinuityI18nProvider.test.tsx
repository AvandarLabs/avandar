import assert from "node:assert/strict";
import test from "node:test";
import { setupI18n } from "@lingui/core";
import { I18nProvider, useLingui } from "@lingui/react";
import { renderToStaticMarkup } from "react-dom/server";
import { useContinuityCopy } from "../../useContinuityCopy";
import { ContinuityI18nProvider } from "./ContinuityI18nProvider";

function CopyProbe() {
  const translate = useContinuityCopy();
  return <span>{translate("Composition Atlas")}</span>;
}

function ProductProbe() {
  const { i18n } = useLingui();
  return <span>{i18n._("product.save")}</span>;
}

test("standalone compositions render continuity copy without an outer provider", () => {
  assert.equal(
    renderToStaticMarkup(
      <ContinuityI18nProvider>
        <CopyProbe />
      </ContinuityI18nProvider>,
    ),
    "<span>Composition Atlas</span>",
  );
});

test("an existing composition locale and product translator remain active", () => {
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
    renderToStaticMarkup(
      <I18nProvider i18n={i18n}>
        <ContinuityI18nProvider>
          <CopyProbe />
          <ProductProbe />
        </ContinuityI18nProvider>
      </I18nProvider>,
    ),
    "<span>Atlas de composiciones</span><span>Guardar</span>",
  );
  assert.equal(i18n.locale, "es");
});
