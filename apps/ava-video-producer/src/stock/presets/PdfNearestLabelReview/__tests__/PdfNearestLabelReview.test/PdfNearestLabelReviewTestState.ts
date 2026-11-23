import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { PdfNearestLabelReview } from "../../PdfNearestLabelReview";
import { pdfNearestLabelReviewContract } from "../../PdfNearestLabelReview.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../PdfNearestLabelReview.fixtures";
import { inputSchema, type Input } from "../../PdfNearestLabelReview.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
/** Rendered setup state consumed by the corresponding assertions. */
export type MakeCornerExtractionRowsKeepMarkupFromMarkupResult = {
  row: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertCornerExtractionRowsKeepMarkupOptions = {
  markup: string;
  left: number;
  showDistanceValues: boolean;
  input: Readonly<Input>;
  top: number;
  right: number;
  bottom: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type ChoiceGeometryOptions = {
  showDistanceValues: boolean;
  markup: string;
  left: number;
  input: Readonly<Input>;
  top: number;
  right: number;
  bottom: number;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type DistanceRatioOptions = {
  showDistanceValues: boolean;
  markup: string;
  left: number;
  input: Readonly<Input>;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertCornerExtractionRowsKeepFrameOptions = {
  frame: number;
  input: Readonly<Input>;
  x: number;
  y: number;
  showDistanceValues: boolean;
};

/**
 * The shape a marker names: the marked element itself, or the sketch-aware
 * shape inside a marked group.
 */
function _markedShape({
  markup,
  marker,
}: Readonly<{ markup: string; marker: string }>): string {
  const wrapped = markup.match(
    new RegExp(
      `<g [^>]*data-${marker}="[^"]*"[^>]*><(?:line|path|circle|rect|ellipse)\\b[^>]*>`,
    ),
  );
  return wrapped ? wrapped[0] : SvgAttributes.fromMarker({ markup, marker });
}

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(PdfNearestLabelReview, {
      frame,
      input,
      accent: "#9fefca",
      id: "packet26",
    }),
  );
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...Object.values(input.copy),
    input.figure.text,
    ...input.labels.map(prop("text")),
  ];
}

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: pdfNearestLabelReviewContract,
  render: _render,
  excludedTextFields: ["id", "reviewedLabelId", "text"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [52, 105, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PdfNearestLabelReviewTestState = {
  markedShape: _markedShape,
  render: _render,
  options,
};
