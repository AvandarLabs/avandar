import assert from "node:assert/strict";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { ProseMeasurementLedger } from ".././ProseMeasurementLedger";
import { proseMeasurementLedgerContract as contract } from ".././ProseMeasurementLedger.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from ".././ProseMeasurementLedger.fixtures";
import { inputSchema, type Input } from ".././ProseMeasurementLedger.schema";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import type { StockDefaultSpanBinding } from "../../../contracts/StockContract.types";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(ProseMeasurementLedger, {
      frame,
      input,
      accent: "#72d5bd",
      id: "packet27",
    }),
  );

function _marker({
  markup,
  key,
  value,
}: {
  markup: string;
  key: string;
  value: string;
}): string {
  const tags = [...markup.matchAll(/<[^>]+>/g)].map((match) => match[0]);
  const tag = tags.find((candidateTag) =>
    candidateTag.includes(`data-${key}="${value}"`),
  );
  assert.ok(tag, `${key} ${value}`);
  return tag;
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "role",
  "method",
  "reviewState",
  "text",
];

const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => [
  input.copy.context,
  input.copy.source,
  input.copy.result,
  input.fragments.map(prop("text")).join(""),
  ...input.fragments
    .filter(({ role }) => role !== "connector")
    .map((f) => f.text.slice(f.contentStart, f.contentEnd).trim()),
];

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts,
} satisfies PresetAssertions<Input>;

function _assertReadablePaint(markup: string): void {
  const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
  SvgPaintAssertions.assertPaintClearance({
    texts: paint.filter(propEq("kind", "text")),
    rectangles: paint.filter(
      (item) =>
        item.kind === "rect" && item.fill !== "none" && item.fillOpacity > 0,
    ),
  });
}

const EXPECTED_SPAN_BINDINGS: StockDefaultSpanBinding[] = [
  {
    textPath: ["fragments", 0, "text"],
    startPath: ["fragments", 0, "contentStart"],
    endPath: ["fragments", 0, "contentEnd"],
    template: "<content>West site</content> reported ",
  },
  {
    textPath: ["fragments", 1, "text"],
    startPath: ["fragments", 1, "contentStart"],
    endPath: ["fragments", 1, "contentEnd"],
    template: "<content>about</content> ",
  },
  {
    textPath: ["fragments", 2, "text"],
    startPath: ["fragments", 2, "contentStart"],
    endPath: ["fragments", 2, "contentEnd"],
    template: "<content>12</content> ",
  },
  {
    textPath: ["fragments", 3, "text"],
    startPath: ["fragments", 3, "contentStart"],
    endPath: ["fragments", 3, "contentEnd"],
    template: "<content>crates</content> ",
  },
  {
    textPath: ["fragments", 4, "text"],
    startPath: ["fragments", 4, "contentStart"],
    endPath: ["fragments", 4, "contentEnd"],
    template: "<content>received</content> ",
  },
  {
    textPath: ["fragments", 5, "text"],
    startPath: ["fragments", 5, "contentStart"],
    endPath: ["fragments", 5, "contentEnd"],
    template: "in <content>week 2</content>.",
  },
];
export {
  render,
  _marker,
  EXCLUDED_TEXT_FIELDS as excludedTextFields,
  getVisibleTexts,
  options,
  _assertReadablePaint,
  EXPECTED_SPAN_BINDINGS as expectedSpanBindings,
};
