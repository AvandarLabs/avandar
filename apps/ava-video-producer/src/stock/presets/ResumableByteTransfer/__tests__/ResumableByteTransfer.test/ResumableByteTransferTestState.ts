import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResumableByteTransfer } from "../../ResumableByteTransfer";
import { resumableByteTransferContract } from "../../ResumableByteTransfer.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../ResumableByteTransfer.fixtures";
import { inputSchema, type Input } from "../../ResumableByteTransfer.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertFullRetryCaptionIdentifiesLinkOptions = {
  link: string;
  x: { x: number; fontSize: number; right: number }["x"];
  checkpoint: number;
  caption: string[][number];
  fontSize: { x: number; fontSize: number; right: number }["fontSize"];
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertFullRetryCaptionIdentifiesFrameOptions = {
  frame: number;
  input: Readonly<Input>;
  acknowledgedBytes: number;
  file: Readonly<{ sizeBytes: number; chunkBytes: number }>;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertFullRetryCaptionIdentifiesLabelsOptions = {
  labels:
    | (typeof DEFAULT_INPUT)["labels"]
    | NonNullable<typeof fixtures>[number]["input"]["labels"]
    | (Omit<(typeof DEFAULT_INPUT)["labels"], "retry"> & { retry: string });
  file: Readonly<{ sizeBytes: number; chunkBytes: number }>;
  acknowledgedBytes: number;
  showOffsets: boolean;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(ResumableByteTransfer, {
      frame,
      input,
      accent: "#9fefca",
      id: "packet26",
    }),
  );
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [input.file.label, ...Object.values(input.labels)];
}

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: resumableByteTransferContract,
  render: _render,
  excludedTextFields: ["finalOutcome"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [52, 105, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ResumableByteTransferTestState = { render: _render, options };
