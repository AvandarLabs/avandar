import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { BatchRelease } from "./BatchRelease";
import { batchReleaseContract } from "./BatchRelease.contract";
import { DEFAULT_INPUT, FIXTURES } from "./BatchRelease.fixtures";
import { inputSchema, type Input } from "./BatchRelease.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(BatchRelease, {
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
    input.intakeLabel,
    input.boundaryLabel,
    input.destinationLabel,
    input.releaseLabel,
    ...input.batches.flatMap((batch) => [
      batch.label,
      ...(input.showItemLabels ? batch.items.map(prop("label")) : []),
    ]),
  ];
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  contract: batchReleaseContract,
  render: _render,
  excludedTextFields: ["id"],
  getVisibleTexts: _texts,
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, batches: [] },
    {
      ...DEFAULT_INPUT,
      batches: [
        {
          ...DEFAULT_INPUT.batches[0],
          items: DEFAULT_INPUT.batches[0].items.slice(0, 1),
        },
      ],
    },
    {
      ...DEFAULT_INPUT,
      batches: [
        {
          ...DEFAULT_INPUT.batches[0],
          items: [
            { id: "batch-a", label: "A" },
            { id: "other", label: "B" },
          ],
        },
      ],
    },
  ],
});
test("an open batch never crosses dispatch before its final member arrives", () => {
  const input = FIXTURES[2].input;
  [18, 36, 62, 67, 94, 110, 123].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    [
      ...markup.matchAll(/<rect[^>]*data-batch-envelope="[^"]*"[^>]*>/g),
    ].forEach(([envelope]) => {
      const ready = envelope.includes('data-complete="true"');
      if (!ready) {
        assert.ok(
          SvgAttributes.getNumberFromMarkup({
            attributes: envelope,
            name: "x",
          }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: envelope,
              name: "width",
            }) <
            500,
        );
      }
    });
  });
  assert.match(
    _render({ frame: 68, input: input }),
    /data-batch-envelope="group 0" data-complete="true"/,
  );
});
test("each released envelope preserves every member and separate groups never combine", () => {
  const input = FIXTURES[2].input;
  const markup = _render({ frame: 150, input: input });
  const envelopes = [
    ...markup.matchAll(/<rect[^>]*data-batch-envelope="[^"]*"[^>]*>/g),
  ];
  assert.equal(envelopes.length, 2);
  envelopes.forEach(([envelope]) =>
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: envelope, name: "x" }) >
        500,
    ),
  );
  input.batches.forEach((batch) => {
    batch.items.forEach((item) => {
      assert.ok(
        markup.includes(
          `data-item-id="${item.id}" data-member-of="${batch.id}"`,
        ),
      );
    });
  });
  assert.equal([...markup.matchAll(/data-item-id=/g)].length, 6);
  const tokens = [...markup.matchAll(/<rect[^>]*data-item-id="[^"]*"[^>]*>/g)];
  tokens.forEach(([token]) =>
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: token, name: "x" }) >
        500 &&
        SvgAttributes.getNumberFromMarkup({ attributes: token, name: "x" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: token,
            name: "width",
          }) <=
          920,
    ),
  );
});
test("maximum-density item tokens stay within the canvas through each staggered arrival", () => {
  Array.from({ length: 151 }, (_, frame) => frame).forEach((frame) => {
    const markup = _render({ frame: frame, input: FIXTURES[2].input });
    [...markup.matchAll(/<rect[^>]*data-item-id="[^"]*"[^>]*>/g)].forEach(
      ([token]) => {
        assert.ok(
          SvgAttributes.getNumberFromMarkup({ attributes: token, name: "x" }) >=
            0,
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({ attributes: token, name: "x" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: token,
              name: "width",
            }) <=
            960,
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({ attributes: token, name: "y" }) >=
            0,
        );
        assert.ok(
          SvgAttributes.getNumberFromMarkup({ attributes: token, name: "y" }) +
            SvgAttributes.getNumberFromMarkup({
              attributes: token,
              name: "height",
            }) <=
            600,
        );
      },
    );
  });
});
test("hiding member labels retains the exact visible token membership", () => {
  const markup = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showItemLabels: false },
  });
  assert.doesNotMatch(markup, /aria-label="A"|aria-label="B"|aria-label="C"/);
  assert.equal([...markup.matchAll(/data-item-id=/g)].length, 3);
});
