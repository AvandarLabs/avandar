import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { RetryBackoff } from "./RetryBackoff";
import { retryBackoffContract } from "./RetryBackoff.contract";
import { DEFAULT_INPUT, FIXTURES } from "./RetryBackoff.fixtures";
import { inputSchema, type Input } from "./RetryBackoff.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(RetryBackoff, {
        frame,
        input,
        id: "test",
        accent: "#65e2bf",
      }),
    ),
  );
}
function _texts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.operationLabel,
    input.outcomeLabels.retry,
    input.outcomeLabels[input.attempts.at(-1)!.outcome],
    input.outcomeLabels.wait,
    ...(input.showAttemptLabels ? input.attempts.map(prop("label")) : []),
    ...(input.showDelayValues ? [input.delayUnit] : []),
  ];
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  contract: retryBackoffContract,
  render: _render,
  excludedTextFields: ["outcome"],
  getVisibleTexts: _texts,
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, attempts: DEFAULT_INPUT.attempts.slice(1) },
    {
      ...DEFAULT_INPUT,
      attempts: [
        { ...DEFAULT_INPUT.attempts[0], delayAfter: 2 },
        { ...DEFAULT_INPUT.attempts[1], delayAfter: 2 },
        DEFAULT_INPUT.attempts[2],
      ],
    },
    {
      ...DEFAULT_INPUT,
      attempts: DEFAULT_INPUT.attempts.map((attempt) => ({
        ...attempt,
        outcome: "complete",
      })),
    },
  ],
});

test("waiting brackets preserve supplied delay ratios and only declared attempts exist", () => {
  const markup = _render({ frame: 150, input: DEFAULT_INPUT });
  const brackets = [
    ...markup.matchAll(/<rect[^>]*data-wait-index="\d+"[^>]*>/g),
  ].map(([attributes]) =>
    SvgAttributes.getNumberFromMarkup({ attributes, name: "width" }),
  );
  assert.equal(brackets.length, 2);
  assert.ok(Math.abs(brackets[1] / brackets[0] - 2) < 1e-8);
  assert.equal([...markup.matchAll(/data-attempt-index=/g)].length, 3);
  const start = _render({ frame: 36, input: DEFAULT_INPUT }).match(
    /<circle[^>]*data-operation-token="[^"]*"[^>]*>/,
  )![0];
  const returned = _render({ frame: 44, input: DEFAULT_INPUT }).match(
    /<circle[^>]*data-operation-token="[^"]*"[^>]*>/,
  )![0];
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: returned, name: "cy" }) <
      SvgAttributes.getNumberFromMarkup({ attributes: start, name: "cy" }),
  );
});
test("the final authored outcome determines completed socket or stop cap", () => {
  assert.match(
    _render({ frame: 150, input: DEFAULT_INPUT }),
    /data-final-outcome="complete"/,
  );
  assert.match(
    _render({ frame: 150, input: FIXTURES[3].input }),
    /data-final-outcome="stop"/,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: FIXTURES[3].input }),
    /data-completed-socket=/,
  );
});
test("external label slots remain separated from proportional crowded brackets", () => {
  const markup = _render({ frame: 150, input: FIXTURES[2].input });
  const slots = [
    ...markup.matchAll(/<rect[^>]*data-attempt-label-slot="\d+"[^>]*>/g),
  ].map(([attributes]) => ({
    x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
    width: SvgAttributes.getNumberFromMarkup({ attributes, name: "width" }),
  }));
  slots
    .slice(1)
    .forEach((slot, index) =>
      assert.ok(slot.x >= slots[index].x + slots[index].width),
    );
  assert.equal(slots.length, 4);
});
test("extreme increasing waits keep distinct markers and finite geometry at every frame", () => {
  const input: Input = {
    ...FIXTURES[2].input,
    attempts: FIXTURES[2].input.attempts.map((attempt, index) => ({
      ...attempt,
      delayAfter: [1, 15, 16, 0][index],
    })),
  };
  Array.from({ length: 180 }, (_, frame) => frame).forEach((frame) =>
    assert.doesNotMatch(
      _render({ frame: frame, input: input }),
      /NaN|Infinity/,
    ),
  );
  const markup = _render({ frame: 150, input: input });
  const markers = [
    ...markup.matchAll(/<circle[^>]*data-attempt-index="\d+"[^>]*>/g),
  ].map(([value]) => value);
  markers.slice(1).forEach((marker, index) =>
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "cx" }) -
        SvgAttributes.getNumberFromMarkup({
          attributes: markers[index],
          name: "cx",
        }) >
        SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "r" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: markers[index],
            name: "r",
          }),
    ),
  );
});
test("label toggles remove attempt captions and wait units while keeping the chain", () => {
  const markup = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      showAttemptLabels: false,
      showDelayValues: false,
    },
  });
  assert.doesNotMatch(markup, /aria-label="Attempt 1"|aria-label="s"/);
  assert.equal([...markup.matchAll(/data-attempt-index=/g)].length, 3);
});
