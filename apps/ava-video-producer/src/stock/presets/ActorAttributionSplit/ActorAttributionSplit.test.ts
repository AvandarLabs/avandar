/**
 * Behavioral, contract, and text-layout coverage for actor-attribution-split.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { propEq, prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ActorAttributionSplit } from "./ActorAttributionSplit";
import { actorAttributionSplitContract } from "./ActorAttributionSplit.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ActorAttributionSplit.fixtures";
import { inputSchema, type Input } from "./ActorAttributionSplit.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(ActorAttributionSplit, {
      frame,
      input,
      accent: "#65d6ad",
      id: "packet22",
    }),
  );
}
const options = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: [
    "id",
    "individualAccountId",
    "sharedAccountId",
    "collaboratorId",
    "phase",
  ],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    ...input.collaborators.map(prop("label")),
    ...input.accounts.map(prop("label")),
    ...input.events.map(prop("label")),
    ...Object.values(input.copy),
  ],
} satisfies Pick<
  PresetAssertions<Input>,
  | "inputSchema"
  | "fixtures"
  | "render"
  | "excludedTextFields"
  | "getVisibleTexts"
>;
registerStockPresetAssertions({
  ...options,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: actorAttributionSplitContract,
});
registerStockTextLayoutAssertions({
  ...options,
  getVisibleTexts: ({
    input,
    frame,
  }: Readonly<{ input: Input; frame: number }>) =>
    frame >= 141 ? options.getVisibleTexts({ input: input }) : [],
});

test("historical shared attribution survives separation and later accounts", () => {
  [DEFAULT_INPUT, fixtures[3].input].forEach((input) => {
    [60, 95, 140, 150, 167].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      input.events.forEach((event) => {
        const account =
          event.phase === "shared"
            ? input.sharedAccountId
            : input.collaborators.find(propEq("id", event.collaboratorId))
                ?.individualAccountId;
        assert.match(
          markup,
          new RegExp(`data-event="${event.id}" data-account="${account}"`),
        );
      });
    });
  });
  assert.doesNotMatch(_render({ frame: 150 }), /data-action-guide=/);
  assert.doesNotMatch(
    _render({ frame: 25, input: fixtures[3].input }),
    /data-action-guide=/,
  );
});
test("stamps travel from the acting collaborator into an initially empty ledger", () => {
  assert.match(_render({ frame: 0 }), /data-event="event-1"[^>]*opacity="0"/);
  const start = SvgAttributes.fromMarker({
    markup: _render({ frame: 12 }),
    marker: "stamp-event",
  });
  const held = SvgAttributes.fromMarker({
    markup: _render({ frame: 60 }),
    marker: "stamp-event",
  });
  assert.notEqual(
    start.match(/transform="([^"]+)"/)?.[1],
    held.match(/transform="([^"]+)"/)?.[1],
  );
  assert.match(held, /translate\(590 170\)/);
  assert.match(
    _render({ frame: 78 }),
    /data-shared-stamp="true" transform="translate\(300 /,
  );
});

test("the acting hand stamps even when optional action guides are hidden", () => {
  const input = { ...DEFAULT_INPUT, showActionGuides: false };
  [18, 43, 102, 124].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const hand = SvgAttributes.fromMarker({ markup, marker: "stamping-hand" });
    const eventId = hand.match(/data-stamping-hand="([^"]+)"/)?.[1];
    const stamp = markup.match(
      new RegExp(
        `data-stamp-event="${eventId}" transform="translate\\(([^ ]+) ([^)]+)\\)"`,
      ),
    );
    assert.ok(stamp);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      Number(stamp[1]),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      Number(stamp[2]),
    );
    assert.doesNotMatch(markup, /data-action-guide=/);
  });
});

test("historical accounts retain the actual shared label under reordered actions", () => {
  const input = {
    ...DEFAULT_INPUT,
    events: [
      DEFAULT_INPUT.events[1],
      DEFAULT_INPUT.events[0],
      DEFAULT_INPUT.events[3],
      DEFAULT_INPUT.events[2],
    ],
    accounts: DEFAULT_INPUT.accounts.map((account) => ({
      ...account,
      label: ` ${account.label} `,
    })),
    showActionGuides: false,
  };
  assert.equal(inputSchema.safeParse(input).success, true);
  [60, 95, 140, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    input.events.slice(0, 2).forEach((event) => {
      const record = markup
        .slice(markup.indexOf(`data-event="${event.id}"`) + 11)
        .split("data-event=")[0];
      assert.ok(record.includes('aria-label=" Shared demo account "'));
      assert.ok(!record.includes('aria-label=" Demo account A "'));
      assert.ok(!record.includes('aria-label=" Demo account B "'));
    });
  });
});

import { setupI18n } from "@lingui/core";
import { makeLocalizedStockDataFromContract } from "../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../i18n/StockCopyMessages";

test("nested authored default prose is extracted and translated without rewriting inputs", () => {
  const messageId =
    "motionAtlas.actor-attribution-split.default.copy.historyLimit";
  const messages = StockCopyMessages.getMessagesFromContract({
    [actorAttributionSplitContract.id]: actorAttributionSplitContract,
  });
  assert.equal(messages[messageId], DEFAULT_INPUT.copy.historyLimit);
  const i18n = setupI18n({
    locale: "es",
    messages: { es: { [messageId]: "Texto traducido" } },
    missing: (_locale, id) => id,
  });
  const resolved = makeLocalizedStockDataFromContract({
    contract: actorAttributionSplitContract,
    i18n,
  });
  assert.equal(resolved.defaultInput.copy.historyLimit, "Texto traducido");
  assert.notEqual(DEFAULT_INPUT.copy.historyLimit, "Texto traducido");
  assert.ok(
    _render({ frame: 150 }).includes(
      `aria-label="${DEFAULT_INPUT.copy.historyLimit}"`,
    ),
  );
});
