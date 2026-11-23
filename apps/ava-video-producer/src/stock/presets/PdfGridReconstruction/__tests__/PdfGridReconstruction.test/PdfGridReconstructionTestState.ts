import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { PdfGridReconstruction } from "../../PdfGridReconstruction";
import { pdfGridReconstructionContract } from "../../PdfGridReconstruction.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../PdfGridReconstruction.fixtures";
import { inputSchema, type Input } from "../../PdfGridReconstruction.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
/** Rendered setup state consumed by the corresponding assertions. */
export type MakeCompleteMovingColumnsRemainMarkupFromMarkupResult = {
  rectangles: string[];
  sourceRight: number;
  sourceHeaders: string[];
  resultHeaders: string[];
  resultCells: string[];
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertCompleteMovingColumnsRemainSourceHeadersOptions = {
  sourceHeaders: Readonly<string[]>;
  sourceCells: Readonly<string[]>;
  resultHeaders: Readonly<string[]>;
  resultCells: Readonly<string[]>;
  markup: string;
  input: Readonly<Input>;
  sourceRight: number;
  frame: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertCompleteMovingColumnsRemainResultHeadersOptions = {
  resultHeaders: Readonly<string[]>;
  resultCells: Readonly<string[]>;
  sourceRight: number;
  frame: number;
  sourceHeaders: Readonly<string[]>;
  input: Readonly<Input>;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertCompleteMovingColumnsRemainHeaderOptions = {
  header: string[][number];
  columnIndex: number;
  resultHeaders: Readonly<string[]>;
  resultCells: Readonly<string[]>;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(PdfGridReconstruction, {
      frame,
      input,
      accent: "#9fefca",
      id: "packet26",
    }),
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.copy),
    input.evidenceLabel,
    ...input.grid.columnLabels,
    ...(frame >= 105 ? input.grid.rows.flat() : []),
  ];
}

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: pdfGridReconstructionContract,
  render: _render,
  excludedTextFields: ["signal", "rows"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [52, 105, 150],
} satisfies PresetAssertions<Input>;

function _assertGridTextFitsCell({
  markup,
  tag,
}: Readonly<{ markup: string; tag: string }>): void {
  const start = markup.indexOf(tag) + tag.length;
  const end = markup.indexOf("<rect", start);
  const fragment = markup.slice(start, end === -1 ? undefined : end);
  const text = [...fragment.matchAll(/<text[^>]*>[\s\S]*?<\/text>/g)]
    .map(([block]) => {
      return block;
    })
    .join("");
  assert.ok(text.length > 0);
  SvgPaintAssertions.assertTextCanvasBounds({
    markup: `<g transform="translate(${-SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "x" })} ${-SvgAttributes.getNumberFromMarkup({ attributes: tag, name: "y" })})">${text}</g>`,
    width: SvgAttributes.getNumberFromMarkup({
      attributes: tag,
      name: "width",
    }),
    height: SvgAttributes.getNumberFromMarkup({
      attributes: tag,
      name: "height",
    }),
  });
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PdfGridReconstructionTestState = {
  render: _render,
  options,
  assertGridTextFitsCell: _assertGridTextFitsCell,
};
