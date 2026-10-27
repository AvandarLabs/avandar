import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { CustodyTransfer } from "./CustodyTransfer";
import { custodyTransferContract } from "./CustodyTransfer.contract";
import { DEFAULT_INPUT, fixtures } from "./CustodyTransfer.fixtures";
import { inputSchema, type Input } from "./CustodyTransfer.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(CustodyTransfer, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}
function _getVisibleTextsFromInput({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  if (!input.showLabels) {
    return [];
  }
  return [
    input.holders.sender,
    input.holders.recipient,
    input.object.label,
    ...input.object.details,
    input.copy.responsible,
    input.copy.example,
    frame < 72
      ? input.copy.offered
      : input.outcome === "accepted"
        ? input.copy.accepted
        : input.copy.waiting,
  ];
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: custodyTransferContract,
  render: _render,
  excludedTextFields: ["outcome", "objectShape", "sender", "recipient"],
  getVisibleTexts: _getVisibleTextsFromInput,
  textFrames: [36, 90, 150],
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, holders: { sender: "A", recipient: "A" } },
    { ...DEFAULT_INPUT, object: { label: "", details: [] } },
    { ...DEFAULT_INPUT, object: { label: "A", details: ["B".repeat(29)] } },
    {
      ...DEFAULT_INPUT,
      copy: { ...DEFAULT_INPUT.copy, offered: "X".repeat(31) },
    },
    { ...DEFAULT_INPUT, holders: { ...DEFAULT_INPUT.holders, extra: true } },
  ],
});

test("sender support persists through acknowledgement before responsibility crosses", () => {
  const contact = _render({ frame: 71 });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: contact,
        marker: "sender-support",
      }),
      name: "x2",
    }),
    480,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: contact,
        marker: "recipient-support",
      }),
      name: "x1",
    }),
    480,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 90 }),
        marker: "sender-support",
      }),
      name: "x2",
    }),
    480,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 90 }),
        marker: "responsibility",
      }),
      name: "cx",
    }),
    480,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 150 }),
        marker: "responsibility",
      }),
      name: "cx",
    }),
    720,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 150 }),
        marker: "sender-support",
      }),
      name: "x2",
    }),
    240,
  );
});
test("waiting retains sender responsibility and physical support with every object shape", () => {
  (["folio", "baton", "key"] as const).forEach((objectShape) => {
    const input = {
      ...DEFAULT_INPUT,
      outcome: "awaiting-acceptance" as const,
      objectShape,
    };
    [36, 72, 108, 150, 166].forEach((frame) => {
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup: _render({ frame: frame, input: input }),
            marker: "responsibility",
          }),
          name: "cx",
        }),
        240,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: SvgAttributes.fromMarker({
            markup: _render({ frame: frame, input: input }),
            marker: "sender-support",
          }),
          name: "x2",
        }),
        480,
      );
    });
  });
});
test("hidden labels and responsibility marker leave the custody supports", () => {
  const markup = _render({ frame: 150, input: fixtures[1].input });
  assert.doesNotMatch(markup, /aria-label=|data-responsibility=/);
  assert.match(markup, /data-sender-support=/);
});

test("distinct holder names retain accepted packing, whitespace and grapheme text", () => {
  [
    "界".repeat(28),
    `${"界".repeat(13)} ${"界".repeat(14)}`,
    "A\nB\tC",
    "é👩‍🔬".repeat(4),
  ].forEach((sender) => {
    const input = inputSchema.parse({
      ...fixtures[2].input,
      holders: { sender, recipient: `R${sender.slice(1)}` },
    });
    const markup = _render({ frame: 150, input: input });
    Object.values(input.holders).forEach((holder) =>
      assert.ok(markup.includes(`aria-label="${holder}"`)),
    );
    assert.doesNotMatch(markup, />[\u0300-\u036f\u200d]/u);
  });
});

test("setup geometry reaches shared contact before acknowledgement and release", () => {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 24 }),
        marker: "recipient-support",
      }),
      name: "x1",
    }),
    720,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 24 }),
        marker: "responsibility",
      }),
      name: "cx",
    }),
    240,
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 72 }),
      marker: "acknowledgement",
    }),
    /opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 80 }),
      marker: "acknowledgement",
    }),
    /opacity="1"/,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 100 }),
        marker: "responsibility",
      }),
      name: "cx",
    }),
    720,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 100 }),
        marker: "sender-support",
      }),
      name: "x2",
    }),
    480,
  );
});

test("custody label and marker toggles operate independently", () => {
  const hiddenMarker = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      showResponsibilityMarker: false,
    },
  });
  assert.doesNotMatch(hiddenMarker, /data-responsibility=/);
  assert.match(hiddenMarker, /aria-label="Example morning team"/);
  const hiddenLabels = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showLabels: false },
  });
  assert.doesNotMatch(hiddenLabels, /aria-label=/);
  assert.match(hiddenLabels, /data-responsibility=/);
});

test("each object physically touches the common support line", () => {
  (["folio", "baton", "key"] as const).forEach((objectShape) => {
    const body = SvgAttributes.fromMarker({
      markup: _render({ frame: 60, input: { ...DEFAULT_INPUT, objectShape } }),
      marker: "object-base",
    });
    const bottom =
      objectShape === "key"
        ? SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y2" })
        : SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: body,
            name: "height",
          });
    assert.equal(bottom, 376);
  });
});

test("the acceptance seal clears the complete object detail slot", async () => {
  const { custodyTransferContract: correctionContract } =
    await import("./CustodyTransfer.contract");
  const { CustodyTransfer: Component } = await import("./CustodyTransfer");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source, outcome: "accepted" as const };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );
    const circle = markup.match(
      /data-acknowledgement="seal"[^>]*><circle([^>]*)>/,
    )![1];
    const circleX = Number(circle.match(/cx="([^"]*)"/)![1]);
    const circleY = Number(circle.match(/cy="([^"]*)"/)![1]);
    const radius = Number(circle.match(/r="([^"]*)"/)![1]);
    assert.ok(
      circleX - radius > 844 || circleY + radius < 246,
      "Acceptance seal clears the full supported detail slot",
    );
  });
});
