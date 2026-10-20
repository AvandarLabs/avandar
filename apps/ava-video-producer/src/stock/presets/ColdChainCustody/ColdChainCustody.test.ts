/** Semantic rendering tests for cold-chain-custody. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ColdChainCustody } from "./ColdChainCustody";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ColdChainCustody.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>) {
  return renderToStaticMarkup(
    createElement(ColdChainCustody, {
      frame,
      input,
      accent: "#65d6ad",
      id: "semantic",
    }),
  );
}
test("Container IDs persist through every stop; missing acknowledgements, unknown seals and monitoring-review states remain separately visible after receipt and never become success markers implicitly.", () => {
  const markup = _render({ frame: 150 });
  assert.equal(
    (markup.match(/data-container=/g) ?? []).length,
    DEFAULT_INPUT.crates.length,
  );
  assert.match(markup, /data-acknowledged="false"/);
  assert.match(markup, /data-seal="unknown"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { coldChainCustodyContract } from "./ColdChainCustody.contract";
import { inputSchema, type Input } from "./ColdChainCustody.schema";
const textLayoutOptions = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: [
    "id",
    "kind",
    "seal",
    "stopId",
    "state",
    "geographyMode",
  ],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    input.sceneLabel,
    input.copy.schematic,
    ...input.stops.map(prop("label")),
    ...input.crates.map(prop("label")),
    ...(input.showIdentityRibbon ? input.crates.map(prop("id")) : []),
    ...(input.showMonitoring
      ? [input.copy.logged, input.copy.review, input.copy.missing]
      : []),
    input.copy.acknowledged,
    input.copy.receiptMissing,
    input.copy.sealIntact,
    input.copy.sealBroken,
    input.copy.sealUnknown,
    input.copy.arrival,
    ...(input.showLedger ? [input.copy.total] : []),
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
  ...textLayoutOptions,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: coldChainCustodyContract,
});
registerStockTextLayoutAssertions(textLayoutOptions);

test("the same containers cross the three stops with independent final facts", () => {
  const input = fixtures[3].input;
  [32, 52, 72, 92, 116, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const containers = Array.from(
      markup.matchAll(
        /<g data-moving-container="([^"]*)" transform="translate\(([^ ]+) ([^)]+)\)"/g,
      ),
    );
    assert.deepEqual(
      containers.map((match) => match[1]),
      input.crates.map(prop("id")),
    );
    containers.forEach((match) => {
      assert.ok(Number(match[2]) - 15 >= 265);
      assert.ok(Number(match[2]) + 207 <= 947);
      assert.ok(Number(match[3]) - 15 >= 150);
      assert.ok(Number(match[3]) + 28 < 405);
    });
    if (frame === 32) {
      containers.forEach((match) => assert.equal(Number(match[2]), 280));
    }
    if (frame >= 116) {
      containers.forEach((match) => assert.equal(Number(match[2]), 740));
    }
  });
  const markup = _render({ frame: 150, input: input });
  assert.match(
    markup,
    /data-state="logged" data-acknowledged="false" data-seal="unknown" opacity="1"/,
  );
  assert.match(
    markup,
    /data-state="review" data-acknowledged="true" data-seal="broken" opacity="1"/,
  );
  assert.match(markup, /data-physical-receipt="3" opacity="1"/);
  assert.match(markup, /data-fact-total="0-0"[^>]*>1<\/text>/);
  const hidden = _render({
    frame: 150,
    input: {
      ...input,
      showMonitoring: false,
      showLedger: false,
      showIdentityRibbon: false,
    },
  });
  assert.doesNotMatch(hidden, /data-monitoring=|data-fact-total=/);
  assert.match(hidden, /data-ack="false"/);
  assert.match(hidden, /data-seal-mark="unknown"/);
});

test("empty references are accepted only for an existing unique empty stop", () => {
  const input = fixtures[1].input;
  assert.equal(input.stops[0].id, "");
  assert.equal(input.crates[0].id, "");
  assert.equal(inputSchema.safeParse(input).success, true);
  assert.equal(
    inputSchema.safeParse({
      ...input,
      stops: input.stops.map((stop, index) =>
        index === 1 ? { ...stop, id: "" } : stop,
      ),
    }).success,
    false,
  );
});
