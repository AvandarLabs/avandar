import assert from "node:assert/strict";
import test from "node:test";
import { setupI18n } from "@lingui/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { makeLocalizedStockDataFromContract } from "../../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../../i18n/StockCopyMessages";
import { WorkspaceCapacityExtension } from "../WorkspaceCapacityExtension";
import { workspaceCapacityExtensionContract } from "../WorkspaceCapacityExtension.contract";
import { DEFAULT_INPUT } from "../WorkspaceCapacityExtension.fixtures";

const DECISION_MESSAGE_ID =
  "motionAtlas.workspace-capacity-extension.default.choice.label" as const;
const TRANSLATED_DECISION = "Ampliar el espacio" as const;
const i18n: ReturnType<typeof setupI18n> = setupI18n({
  locale: "es",
  messages: { es: { [DECISION_MESSAGE_ID]: TRANSLATED_DECISION } },
  missing: (_locale, id) => id,
});

test("default decision copy is extracted and translated without mutating its source", () => {
  const messages = StockCopyMessages.getMessagesFromContract({
    [workspaceCapacityExtensionContract.id]: workspaceCapacityExtensionContract,
  });
  assert.equal(messages[DECISION_MESSAGE_ID], DEFAULT_INPUT.choice.label);
  const resolved = makeLocalizedStockDataFromContract({
    contract: workspaceCapacityExtensionContract,
    i18n,
  });
  assert.equal(resolved.defaultInput.choice.label, TRANSLATED_DECISION);
  assert.notEqual(DEFAULT_INPUT.choice.label, TRANSLATED_DECISION);
});

test("supplied authored decision copy remains verbatim beside a translated default", () => {
  const resolved = makeLocalizedStockDataFromContract({
    contract: workspaceCapacityExtensionContract,
    i18n,
  });
  const input = {
    ...DEFAULT_INPUT,
    choice: { ...DEFAULT_INPUT.choice, label: "  Authored choice  " },
  };
  const before = structuredClone(input);
  const markup = renderToStaticMarkup(
    createElement(WorkspaceCapacityExtension, {
      input,
      frame: 150,
      accent: "#9fefca",
      id: "authored-copy",
    }),
  );
  assert.equal(resolved.defaultInput.choice.label, TRANSLATED_DECISION);
  assert.ok(markup.includes('aria-label="  Authored choice  "'));
  assert.ok(!markup.includes(TRANSLATED_DECISION));
  assert.deepEqual(input, before);
});
