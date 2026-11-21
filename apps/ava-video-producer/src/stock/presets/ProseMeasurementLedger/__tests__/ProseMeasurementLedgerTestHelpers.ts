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
import type { RenderedLabelExpectation } from "../../../../../tests/helpers/assertRenderedLabelGraphemes/RenderedLabelExpectation.types";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(ProseMeasurementLedger, {
      frame,
      input,
      accent: "#72d5bd",
      id: "packet27",
    }),
  );
};

function _marker({
  markup,
  key,
  value,
}: {
  markup: string;
  key: string;
  value: string;
}): string {
  const tags = [...markup.matchAll(/<[^>]+>/g)].map((match) => {
    return match[0];
  });
  const tag = tags.find((candidateTag) => {
    return candidateTag.includes(`data-${key}="${value}"`);
  });
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
}: Readonly<{ input: Input; frame: number }>): RenderedLabelExpectation[] => {
  return [
    input.copy.context,
    input.copy.source,
    input.copy.result,
    {
      text: input.fragments.map(prop("text")).join(""),
      representation: { kind: "source-glyph-run" },
    },
    ...input.fragments
      .filter(({ role }) => {
        return role !== "connector";
      })
      .map((f) => {
        return f.text.slice(f.contentStart, f.contentEnd).trim();
      }),
  ];
};

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
    rectangles: paint.filter((item) => {
      return (
        item.kind === "rect" && item.fill !== "none" && item.fillOpacity > 0
      );
    }),
  });
}

export {
  render,
  _marker,
  EXCLUDED_TEXT_FIELDS as excludedTextFields,
  getVisibleTexts,
  options,
  _assertReadablePaint,
};
