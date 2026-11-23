import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../../text/getConservativeWidthFromText";
import { SpecimenAliquotBalance } from "../../SpecimenAliquotBalance";
import { specimenAliquotBalanceContract } from "../../SpecimenAliquotBalance.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../SpecimenAliquotBalance.fixtures";
import { inputSchema, type Input } from "../../SpecimenAliquotBalance.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/** Gets complete painted text bounds from one SVG text element. */
function _getTextBoxFromTextMarkup({
  attributes,
  content,
}: Readonly<{ attributes: string; content: string }>): TextBox {
  const fontSize = SvgAttributes.getNumberFromMarkup({
    attributes,
    name: "font-size",
  });
  let baseline = SvgAttributes.getNumberFromMarkup({
    attributes: attributes,
    name: "y",
  });
  const anchor = attributes.match(/text-anchor="([^"]+)"/)?.[1];
  const lines = Array.from(
    content.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g),
    ([, span, text]) => {
      baseline += SvgAttributes.getNumberFromMarkup({
        attributes: span,
        name: "dy",
      });
      const width = getConservativeWidthFromText({ text, fontSize });
      const x = SvgAttributes.getNumberFromMarkup({
        attributes: span,
        name: "x",
      });
      const left =
        x - (anchor === "end" ? width : anchor === "middle" ? width / 2 : 0);
      return {
        left,
        right: left + width,
        top: baseline - fontSize,
        bottom: baseline + fontSize * 0.3,
      };
    },
  );
  return {
    content,
    left: Math.min(...lines.map(prop("left"))),
    right: Math.max(...lines.map(prop("right"))),
    top: Math.min(...lines.map(prop("top"))),
    bottom: Math.max(...lines.map(prop("bottom"))),
  };
}

/** Visible content and its complete painted text bounds. */
type TextBox = {
  content: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(SpecimenAliquotBalance, {
        frame,
        input,
        accent: "#9fefca",
        id: "test",
      }),
    ),
  );
}

function _attributes({
  markup,
  attribute,
  value,
}: {
  markup: string;
  attribute: string;
  value: string;
}): string {
  const element = markup.match(/<[^>]+>/g)?.find((tag) => {
    return tag.includes(`${attribute}="${value}"`);
  });
  assert.ok(element, `${attribute}=${value}`);
  return element;
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.sceneLabel,
    input.unitLabel,
    input.parent.label,
    ...input.aliquots.map(prop("label")),
    ...Object.values(input.copy),
    ...(input.showLineage
      ? [input.parent.id, ...input.aliquots.map(prop("id"))]
      : []),
  ];
}

const ASSERTIONS = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: specimenAliquotBalanceContract,
  render: _render,
  excludedTextFields: ["id", "householdId", "slotId", "emphasis", "view"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;

function _getTextBoxes(markup: string) {
  return Array.from(
    markup.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g),
    ([, attributes, content]) => {
      return _getTextBoxFromTextMarkup({ attributes, content });
    },
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SpecimenAliquotBalanceTestState = {
  render: _render,
  attributes: _attributes,
  ASSERTIONS,
  getTextBoxes: _getTextBoxes,
};
