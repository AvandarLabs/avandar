/** Emitted geometry protects the authored accounting and identity semantics. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { BatteryDispatchBalance } from "./BatteryDispatchBalance";
import {
  DEFAULT_INPUT,
  changedInput,
  fixtures,
  invalidInputs,
} from "./BatteryDispatchBalance.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      null,
      createElement(BatteryDispatchBalance, {
        frame,
        accent: "#74e0bd",
        id: "test",
        input,
      }),
    ),
  );
}
test("charging fills before dispatch and final stored energy conserves the cycle", () => {
  const start = SvgAttributes.fromMarker({
    markup: _render({ frame: 24, input: changedInput }),
    marker: "battery-fill",
  });
  const peak = SvgAttributes.fromMarker({
    markup: _render({ frame: 72, input: changedInput }),
    marker: "battery-fill",
  });
  const hold = SvgAttributes.fromMarker({
    markup: _render({ frame: 150, input: changedInput }),
    marker: "battery-fill",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "height" }),
    (150 * 2) / 12,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: peak, name: "height" }),
    (150 * 8.5) / 12,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hold, name: "height" }),
    (150 * 2.75) / 12,
  );
  assert.match(
    _render({ frame: 150, input: changedInput }),
    /aria-label="2.75"/,
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { batteryDispatchBalanceContract as contract } from "./BatteryDispatchBalance.contract";
import { inputSchema, SEMANTIC_RULES } from "./BatteryDispatchBalance.schema";
import type { Input } from "./BatteryDispatchBalance.schema";
function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...Object.values(input.windows),
    ...Object.values(input.decision),
    ...Object.values(input.copy),
  ];
}
const assertions = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: [
    "id",
    "cellId",
    "fromPatchId",
    "toPatchId",
    "learnerId",
    "state",
    "orientation",
    "context",
    "stage",
    "deskLayout",
  ],
  getVisibleTexts: _getVisibleTexts,
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(assertions);
registerStockTextLayoutAssertions(assertions);
test("serialized semantic rules retain every runtime relation", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(contract.semanticRules)).map(
      ({ id, paths }: { id: string; paths: string[] }) => ({ id, paths }),
    ),
    [
      {
        id: "initial-capacity",
        paths: ["battery.initialStoredKwh", "battery.capacityKwh"],
      },
      {
        id: "charge-loss",
        paths: ["cycle.chargeLossKwh", "cycle.chargeInputKwh"],
      },
      {
        id: "peak-capacity",
        paths: ["battery", "cycle"],
      },
      {
        id: "final-nonnegative",
        paths: ["battery", "cycle"],
      },
    ],
  );
  assert.ok(
    SEMANTIC_RULES.every(
      (rule) => rule.paths.length && rule.description.length,
    ),
  );
});

test("every orientation preserves exact fractional endpoints and bounded fill throughout dispatch", () => {
  const fractional: Input = {
    ...DEFAULT_INPUT,
    battery: { capacityKwh: 0.1 + 0.2, initialStoredKwh: 0.1 },
    cycle: {
      chargeInputKwh: 0.2,
      chargeLossKwh: 0,
      deliveredKwh: 0.2,
      dischargeLossKwh: 0.1,
    },
  };
  [fractional, ...fixtures.map(prop("input"))].forEach((input) => {
    ["horizontal", "vertical"].forEach((orientation) => {
      const variant = inputSchema.parse({ ...input, orientation });
      const final =
        variant.battery.initialStoredKwh +
        variant.cycle.chargeInputKwh -
        variant.cycle.chargeLossKwh -
        variant.cycle.deliveredKwh -
        variant.cycle.dischargeLossKwh;
      [24, 36, 36.5, 65.5, 66, 72, 79.5, 80, 80.5, 94, 107.5, 108, 150].forEach(
        (frame) => {
          const fill = SvgAttributes.fromMarker({
            markup: _render({ frame: frame, input: variant }),
            marker: "battery-fill",
          });
          const height = SvgAttributes.getNumberFromMarkup({
              attributes: fill,
              name: "height",
            }),
            y = SvgAttributes.getNumberFromMarkup({
              attributes: fill,
              name: "y",
            });
          assert.ok(height >= 0 && height <= 150);
          assert.ok(
            Math.abs(y + height - (orientation === "vertical" ? 355 : 380)) <
              1e-9,
          );
          if (frame === 150) {
            assert.equal(height, 150 * (final / variant.battery.capacityKwh));
          }
        },
      );
    });
  });
});
test("the operator contacts the dispatch control before the delivery path advances", () => {
  const earlier = _render({ frame: 68, input: DEFAULT_INPUT }),
    pressed = _render({ frame: 76, input: DEFAULT_INPUT });
  const hand = SvgAttributes.fromMarker({
      markup: pressed,
      marker: "dispatch-hand",
    }),
    button = SvgAttributes.fromMarker({
      markup: pressed,
      marker: "dispatch-button",
    });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
    SvgAttributes.getNumberFromMarkup({ attributes: button, name: "cx" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
    SvgAttributes.getNumberFromMarkup({ attributes: button, name: "cy" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: earlier,
        marker: "dispatch-hand",
      }),
      name: "cx",
    }),
    SvgAttributes.getNumberFromMarkup({ attributes: button, name: "cx" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: pressed,
        marker: "delivery-path",
      }),
      name: "stroke-dashoffset",
    }),
    1,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 108 }),
        marker: "delivery-path",
      }),
      name: "stroke-dashoffset",
    }),
    0,
  );
});
test("hidden loss paths leave the full conserved equation and supplied loss numbers", () => {
  const markup = _render({
    frame: 150,
    input: { ...changedInput, showLossChannels: false },
  });
  assert.doesNotMatch(markup, /data-loss-channel/);
  ["0.5", "0.75", "2.75"].forEach((value) =>
    assert.ok(markup.includes(`aria-label="${value}"`)),
  );
  assert.match(markup, /data-energy-equation/);
});
