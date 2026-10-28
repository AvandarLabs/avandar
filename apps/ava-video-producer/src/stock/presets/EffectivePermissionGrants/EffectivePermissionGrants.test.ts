import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { EffectivePermissionGrants } from "./EffectivePermissionGrants";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./EffectivePermissionGrants.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(EffectivePermissionGrants, {
      frame,
      input,
      accent: "#9fefca",
      id: "packet26",
    }),
  );
}

test("eligible grants combine by maximum rank with a separate action requirement", () => {
  assert.match(_render({ frame: 150 }), /data-effective-role="viewer"/);
  assert.match(_render({ frame: 150 }), /data-allowed="false"/);
  assert.match(
    _render({ frame: 150, input: fixtures[3].input }),
    /data-effective-role="editor"/,
  );
  assert.match(
    _render({ frame: 150, input: fixtures[3].input }),
    /data-allowed="true"/,
  );
  assert.match(
    _render({ frame: 150, input: fixtures[4].input }),
    /data-effective-role="none"/,
  );
  assert.match(
    _render({ frame: 150, input: fixtures[5].input }),
    /data-effective-role="admin"/,
  );
  assert.match(
    _render({
      frame: 150,
      input: {
        ...DEFAULT_INPUT,
        grants: [...DEFAULT_INPUT.grants].reverse(),
      },
    }),
    /data-effective-role="viewer"/,
  );
  assert.match(
    _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, showExcludedGrants: false },
    }),
    /data-restricted="true"/,
  );
});
test("candidates climb their own ranks before gates close and the result rises", () => {
  const token = (frame: number) =>
    SvgAttributes.fromMarker({
      markup: _render({ frame: frame }),
      marker: "grant-token",
    });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: token(13), name: "cy" }),
    440,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: token(30), name: "cy" }) <
      440,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: token(52), name: "cy" }),
    260,
  );
  assert.match(_render({ frame: 100 }), /data-grant-gate="app"/);
  const result = (frame: number) =>
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: frame }),
        marker: "result-marker",
      }),
      name: "cy",
    });
  assert.equal(result(101), 440);
  assert.ok(result(120) < 440 && result(120) > 350);
  assert.equal(result(139), 350);
  assert.match(_render({ frame: 150 }), /data-required-notch="editor"/);
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { effectivePermissionGrantsContract } from "./EffectivePermissionGrants.contract";
import { inputSchema, type Input } from "./EffectivePermissionGrants.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.labels.resource,
    input.labels.none,
    input.labels.viewer,
    input.labels.editor,
    input.labels.admin,
    ...input.grants
      .filter(
        (grant) =>
          input.showExcludedGrants ||
          (grant.eligible &&
            (!input.restricted || grant.kind !== "app-default")) ||
          frame < 100,
      )
      .map(prop("label")),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: effectivePermissionGrantsContract,
  render: _render,
  excludedTextFields: ["id", "kind", "role", "requiredRole"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [52, 105, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: effectivePermissionGrantsContract,
  expectedTextPaths: [
    ["grants", 0, "label"],
    ["grants", 1, "label"],
    ["grants", 2, "label"],
    ["labels", "resource"],
    ["labels", "none"],
    ["labels", "viewer"],
    ["labels", "editor"],
    ["labels", "admin"],
    ["labels", "allowed"],
    ["labels", "denied"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("hidden excluded grants retain the maximum and requirement comparison for every candidate order", () => {
  const grantOrders = [
    DEFAULT_INPUT.grants,
    [...DEFAULT_INPUT.grants].reverse(),
    [DEFAULT_INPUT.grants[1], DEFAULT_INPUT.grants[2], DEFAULT_INPUT.grants[0]],
  ];
  grantOrders.forEach((grants) =>
    [false, true].forEach((showExcludedGrants) => {
      const hold = _render({
        frame: 150,
        input: {
          ...DEFAULT_INPUT,
          grants,
          showExcludedGrants,
        },
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup: hold,
            marker: "result-marker",
          }),
          name: "cy",
        }),
        350,
      );
      assert.ok(hold.includes(`aria-label="${DEFAULT_INPUT.labels.denied}"`));
      assert.match(hold, /data-required-notch="editor"/);
    }),
  );
  const none = _render({
    frame: 150,
    input: {
      ...fixtures[4].input,
      showExcludedGrants: false,
    },
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: none,
        marker: "result-marker",
      }),
      name: "cy",
    }),
    440,
  );
});
