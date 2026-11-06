/**
 * Behavioral, contract, and text-layout coverage for protected-work-boundary.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ProtectedWorkBoundary } from "./ProtectedWorkBoundary";
import { protectedWorkBoundaryContract } from "./ProtectedWorkBoundary.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ProtectedWorkBoundary.fixtures";
import { inputSchema, type Input } from "./ProtectedWorkBoundary.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(ProtectedWorkBoundary, {
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
    "kind",
    "requestedSlotId",
    "placement",
    "agreedSlotId",
    "protectedPattern",
  ],
  getVisibleTexts: ({ input }: Readonly<{ input: Input }>) => [
    input.workerLabel,
    input.request.label,
    input.labels.unit,
    input.labels.example,
    input.labels.protected,
    input.request.placement === "defer"
      ? input.labels.deferred
      : input.labels.rescheduled,
    ...input.slots.flatMap((slot) => [
      input.labels[slot.kind],
      ...(input.showSlotLabels ? [slot.label] : []),
      ...(slot.workLabel === null ? [] : [slot.workLabel]),
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
  contract: protectedWorkBoundaryContract,
});
registerStockTextLayoutAssertions({
  ...options,
  getVisibleTexts: ({
    input,
    frame,
  }: Readonly<{ input: Input; frame: number }>) =>
    frame >= 141 ? options.getVisibleTexts({ input: input }) : [],
});

test("existing slots retain kind and commitment while the request remains outstanding", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    [38, 60, 76, 105, 130, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      input.slots.forEach((slot) =>
        assert.ok(
          markup.includes(
            `data-slot="${slot.id}" data-kind="${slot.kind}" data-commitment="${slot.workLabel ?? ""}"`,
          ),
        ),
      );
    });
    const markup = _render({ frame: 150, input: input });
    assert.match(
      markup,
      new RegExp(`data-request="${input.request.placement}"`),
    );
    assert.match(markup, /data-request-outstanding="true"/);
  });
});
test("worker lifts a request clear of protected time and moves it to the actual destination", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    [39, 50, 60, 76, 90].forEach((frame) => {
      const marker = SvgAttributes.fromMarker({
        markup: _render({ frame: frame, input: input }),
        marker: "request-body",
      });
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: marker,
            name: "height",
          }) <
          210,
      );
      const hand = SvgAttributes.fromMarker({
        markup: _render({ frame: frame, input: input }),
        marker: "worker-hand",
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "x" }),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "y" }) +
          12,
      );
    });
  });
  assert.doesNotMatch(
    _render({ frame: 150, input: fixtures[3].input }),
    /data-slot-label=/,
  );
  const settled = SvgAttributes.fromMarker({
    markup: _render({ frame: 150, input: fixtures[3].input }),
    marker: "request-body",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: settled, name: "y" }),
    400,
  );
});

test("the reschedule caption is physically linked to the chosen work slot", () => {
  const markup = _render({ frame: 150, input: fixtures[3].input });
  assert.match(markup, /data-disposition-link="empty"/);
  assert.match(markup, /data-disposition-caption="reschedule"/);
  const body = SvgAttributes.fromMarker({ markup, marker: "request-body" });
  const link = SvgAttributes.fromMarker({ markup, marker: "disposition-link" });
  const center =
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "x" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "width" }) / 2;
  const bottom =
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "height" });
  assert.ok(link.includes(`d="M${center} ${bottom} V518 H50 V522"`));
  assert.ok(bottom <= 510);
});

test("all eight blocks keep equal size across both patterns and every disposition frame", () => {
  ["hatch", "dots"].forEach((pattern) => {
    const input = {
      ...fixtures[2].input,
      protectedPattern: pattern as Input["protectedPattern"],
      showSlotLabels: false,
      request: {
        ...fixtures[2].input.request,
        placement: "reschedule" as const,
        agreedSlotId: "slot-1",
      },
    };
    assert.equal(inputSchema.safeParse(input).success, true);
    [0, 38, 76, 104.5, 105, 129.5, 130, 150].forEach((frame) => {
      const rectangles = Array.from(
        _render({ frame: frame, input: input }).matchAll(
          /data-slot-body="[^"]+"[^>]+/g,
        ),
      );
      assert.equal(rectangles.length, 8);
      rectangles.forEach((rectangle, index) => {
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle[0],
            name: "x",
          }),
          50 + index * 107.5,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle[0],
            name: "width",
          }),
          107.5,
        );
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: rectangle[0],
            name: "height",
          }),
          300,
        );
      });
    });
  });
});

import { setupI18n } from "@lingui/core";
import { makeLocalizedStockDataFromContract } from "../../i18n/makeLocalizedStockDataFromContract";
import { StockCopyMessages } from "../../i18n/StockCopyMessages";

test("nested authored default prose is extracted and translated without rewriting inputs", () => {
  const messageId =
    "motionAtlas.protected-work-boundary.default.slots.0.workLabel";
  const messages = StockCopyMessages.getMessagesFromContract({
    [protectedWorkBoundaryContract.id]: protectedWorkBoundaryContract,
  });
  assert.equal(messages[messageId], DEFAULT_INPUT.slots[0].workLabel);
  const i18n = setupI18n({
    locale: "es",
    messages: { es: { [messageId]: "Texto traducido" } },
    missing: (_locale, id) => id,
  });
  const resolved = makeLocalizedStockDataFromContract({
    contract: protectedWorkBoundaryContract,
    i18n,
  });
  assert.equal(resolved.defaultInput.slots[0].workLabel, "Texto traducido");
  assert.notEqual(DEFAULT_INPUT.slots[0].workLabel, "Texto traducido");
  assert.ok(
    _render({ frame: 150 }).includes(
      `aria-label="${DEFAULT_INPUT.slots[0].workLabel}"`,
    ),
  );
});

test("dense slot names clear their protected-kind caption band", () => {
  const label = `界 ${"界".repeat(6)} ${"界".repeat(13)}`;
  const input = {
    ...fixtures[2].input,
    slots: fixtures[2].input.slots.map((slot) => ({ ...slot, label })),
  };
  const text = _render({ frame: 150, input: input }).match(
    /<text aria-label="[^"]+" x="58" y="[^"]+"[^>]*>(.*?)<\/text>/s,
  );
  assert.ok(text);
  const lines = (text[1].match(/<tspan /g) ?? []).length;
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: text[0], name: "y" }) +
      (lines - 1) * 15.6 +
      3 <
      310 - 12,
  );
});

test("request travel clears the protected-time caption above the strip", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    [39, 60, 76, 90, 104].forEach((frame) => {
      const body = SvgAttributes.fromMarker({
        markup: _render({ frame: frame, input: input }),
        marker: "request-body",
      });
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: body,
            name: "height",
          }) <
          195 - 12,
      );
    });
  });
});

test("the carrying hand stays visible over opaque schedule blocks during landing", () => {
  const markup = _render({ frame: 118, input: fixtures[3].input });
  assert.ok(
    markup.indexOf("data-worker-hand=") > markup.lastIndexOf("data-slot-body="),
  );
});
