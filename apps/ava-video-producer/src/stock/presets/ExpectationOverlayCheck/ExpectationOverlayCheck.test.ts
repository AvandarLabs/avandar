/**
 * Behavioral, contract, and text-layout coverage for expectation-overlay-check.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ExpectationOverlayCheck } from "./ExpectationOverlayCheck";
import { expectationOverlayCheckContract } from "./ExpectationOverlayCheck.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ExpectationOverlayCheck.fixtures";
import { inputSchema, type Input } from "./ExpectationOverlayCheck.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(ExpectationOverlayCheck, {
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
  excludedTextFields: ["id", "sheetMotion"],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    input.exampleLabel,
    input.labels.expected,
    input.labels.observed,
    ...input.tests.flatMap((item) => [
      item.label,
      ...(input.showInputs ? [item.inputLabel] : []),
      item.expected,
      ...(item.observed === null ? [] : [item.observed]),
      item.observed === null
        ? input.labels.untested
        : item.expected === item.observed
          ? input.labels.match
          : input.labels.mismatch,
    ]),
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
  contract: expectationOverlayCheckContract,
});
registerStockTextLayoutAssertions({
  ...options,
  getVisibleTexts: ({
    input,
    frame,
  }: Readonly<{ input: Input; frame: number }>) =>
    frame >= 141 ? options.getVisibleTexts({ input: input }) : [],
});

test("only the changed case mismatches and null receives no verdict", () => {
  const matched = {
    ...DEFAULT_INPUT,
    tests: DEFAULT_INPUT.tests.map((item) => ({
      ...item,
      observed: item.expected,
    })),
  };
  const same = _render({ frame: 150, input: matched });
  assert.equal((same.match(/data-state="match"/g) ?? []).length, 2);
  const changed = {
    ...matched,
    tests: matched.tests.map((item, index) =>
      index === 0 ? { ...item, observed: "different" } : item,
    ),
  };
  assert.match(
    _render({ frame: 150, input: changed }),
    /data-case="valid" data-state="mismatch"/,
  );
  assert.match(
    _render({ frame: 150, input: changed }),
    /data-case="expired" data-state="match"/,
  );
  const absent = {
    ...changed,
    tests: changed.tests.map((item, index) =>
      index === 0 ? { ...item, observed: null } : item,
    ),
    showStateGlyphs: false,
    showInputs: false,
  };
  assert.match(
    _render({ frame: 150, input: absent }),
    /data-case="valid" data-state="unobserved"/,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: absent }),
    /data-verdict="valid"|data-input=/,
  );
});
test("case and whitespace are exact, with distinct whitespace presentation markers", () => {
  const input = {
    ...DEFAULT_INPUT,
    tests: [{ ...DEFAULT_INPUT.tests[0], expected: "A \t", observed: "A·⇥" }],
  };
  const markup = _render({ frame: 150, input: input });
  assert.match(markup, /data-state="mismatch"/);
  assert.match(markup, /text-decoration="underline"/);
  assert.match(
    _render({ frame: 150, input: fixtures[3].input }),
    /data-case="valid" data-state="mismatch"/,
  );
});
test("lowering and hinging use actual sheet geometry before judgment", () => {
  const early = SvgAttributes.fromMarker({
    markup: _render({ frame: 43 }),
    marker: "expected-sheet",
  });
  const held = SvgAttributes.fromMarker({
    markup: _render({ frame: 150 }),
    marker: "expected-sheet",
  });
  assert.notEqual(early, held);
  assert.match(
    _render({ frame: 60, input: { ...DEFAULT_INPUT, sheetMotion: "hinge" } }),
    /data-hinge="true" transform="matrix\(/,
  );
  assert.doesNotMatch(_render({ frame: 80 }), /data-verdict=/);
});

test("hinging retains its upper edge while the projected sheet opens", () => {
  const input = { ...DEFAULT_INPUT, sheetMotion: "hinge" as const };
  const early = SvgAttributes.fromMarker({
    markup: _render({ frame: 43, input: input }),
    marker: "expected-sheet",
  });
  const flat = SvgAttributes.fromMarker({
    markup: _render({ frame: 88, input: input }),
    marker: "expected-sheet",
  });
  assert.equal(early, flat);
  assert.notEqual(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 43, input: input }),
      marker: "hinge",
    }),
    SvgAttributes.fromMarker({
      markup: _render({ frame: 88, input: input }),
      marker: "hinge",
    }),
  );
});

import { setupI18n } from "@lingui/core";
import { makeLocalizedStockDataFromContract } from "../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../i18n/StockCopyMessages";

test("nested authored default prose is extracted and translated without rewriting inputs", () => {
  const messageId =
    "motionAtlas.expectation-overlay-check.default.tests.0.expected";
  const messages = StockCopyMessages.getMessagesFromContract({
    [expectationOverlayCheckContract.id]: expectationOverlayCheckContract,
  });
  assert.equal(messages[messageId], DEFAULT_INPUT.tests[0].expected);
  const i18n = setupI18n({
    locale: "es",
    messages: { es: { [messageId]: "Texto traducido" } },
    missing: (_locale, id) => id,
  });
  const resolved = makeLocalizedStockDataFromContract({
    contract: expectationOverlayCheckContract,
    i18n,
  });
  assert.equal(resolved.defaultInput.tests[0].expected, "Texto traducido");
  assert.notEqual(DEFAULT_INPUT.tests[0].expected, "Texto traducido");
  assert.ok(
    _render({ frame: 150 }).includes(
      `aria-label="${DEFAULT_INPUT.tests[0].expected}"`,
    ),
  );
});

test("three-line case captions clear the input caption below them", () => {
  const label = `界 ${"界".repeat(13)} ${"界".repeat(8)}`;
  const input = {
    ...DEFAULT_INPUT,
    tests: DEFAULT_INPUT.tests.map((item) => ({ ...item, label })),
  };
  const text = _render({ frame: 150, input: input }).match(
    /<text aria-label="[^"]+" x="45" y="130"[^>]*>(.*?)<\/text>/s,
  );
  assert.ok(text);
  const font = SvgAttributes.getNumberFromMarkup({
    attributes: text[0],
    name: "font-size",
  });
  const lines = (text[1].match(/<tspan /g) ?? []).length;
  const cue = _render({ frame: 150, input: input }).match(
    /<text aria-label="Ticket A"[^>]+/,
  );
  assert.ok(cue);
  assert.ok(
    130 + (lines - 1) * font * 1.3 + font / 4 <
      SvgAttributes.getNumberFromMarkup({ attributes: cue[0], name: "y" }) - 12,
  );
});
