/** Semantic rendering tests for contact-window-overlap. */
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactWindowOverlap } from "./ContactWindowOverlap";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ContactWindowOverlap.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>) {
  return renderToStaticMarkup(
    createElement(ContactWindowOverlap, {
      frame,
      input,
      accent: "#65d6ad",
      id: "semantic",
    }),
  );
}
test("Only actual interval intersections with the investigation window are highlighted; touching nonoverlapping intervals and unknown records do not become confirmed contacts.", () => {
  const markup = _render({ frame: 150 });
  assert.equal((markup.match(/data-overlap="true"/g) ?? []).length, 2);
  assert.match(markup, /data-state="unknown"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { contactWindowOverlapContract } from "./ContactWindowOverlap.contract";
import { inputSchema, type Input } from "./ContactWindowOverlap.schema";
const textLayoutOptions = {
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: ["id"],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    input.sceneLabel,
    input.axis.venueLabel,
    input.axis.unitLabel,
    input.investigationWindow.label,
    ...input.records.map(prop("label")),
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
  ...textLayoutOptions,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: contactWindowOverlapContract,
});
registerStockTextLayoutAssertions(textLayoutOptions);

test("partial, containing and exact intersections have correct geometry while endpoint touches stay empty", () => {
  const input = fixtures[2].input;
  const markup = _render({ frame: 150, input: input });
  const spans = Array.from(
    markup.matchAll(
      /<rect data-overlap="true" data-overlap-person="([^"]*)" x="([^"]*)" y="([^"]*)" width="([^"]*)" height="20"/g,
    ),
  );
  assert.deepEqual(
    spans.map((match) => match[1]),
    ["p0", "p1", "p2"],
  );
  assert.deepEqual(
    spans.map((match) => Number(match[4])),
    [63, 189, 189],
  );
  assert.deepEqual(
    spans.map((match) => Number(match[2])),
    [469, 469, 469],
  );
  assert.equal((markup.match(/data-state="none"/g) ?? []).length, 2);
  assert.equal((markup.match(/data-state="unknown"/g) ?? []).length, 1);
  assert.doesNotMatch(
    _render({ frame: 150, input: fixtures[1].input }),
    /data-overlap="true"|data-interval=/,
  );
  [24, 36, 60, 84, 108, 150].forEach((frame) => {
    const scene = _render({ frame: frame, input: input });
    Array.from(
      scene.matchAll(
        /<rect[^>]* x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)"/g,
      ),
    ).forEach(([, x, y, width, height]) => {
      assert.ok(Number(x) >= 280 && Number(x) + Number(width) <= 910);
      assert.ok(Number(y) >= 85 && Number(y) + Number(height) <= 465);
    });
  });
  const stencil = (frame: number) =>
    _render({ frame: frame, input: input }).match(
      /data-window="stencil" x="[^"]*" y="([^"]*)"/,
    )?.[1];
  assert.equal(stencil(36), "85");
  assert.equal(stencil(108), "195");
  assert.doesNotMatch(
    _render({ frame: 150, input: { ...input, showOverlapFractions: false } }),
    /data-overlap-count=/,
  );
});
