import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SupportRequestResponse } from "../../SupportRequestResponse";
import { supportRequestResponseContract } from "../../SupportRequestResponse.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../SupportRequestResponse.fixtures";
import { inputSchema, type Input } from "../../SupportRequestResponse.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertResponseTailClearsEveryAttributesOptions = {
  attributes: RegExpExecArray[][number][1];
  line: RegExpExecArray[][number][2];
  index: number;
  text: RegExpMatchArray;
  spans: Readonly<RegExpExecArray[]>;
  fontSize: number;
  tailBox: Readonly<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>;
};

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(SupportRequestResponse, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}

const render: ({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>) => string = _render;

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.people.requester,
    input.people.colleague,
    input.task.label,
    input.labels.ownedBy,
    input.labels.open,
    input.labels.example,
    ...(frame < 131 || input.showRequestAtHold ? [input.requestText] : []),
    ...(frame >= 63 ? [input.response.text] : []),
    ...(frame >= 139 && input.response.state === "joins"
      ? [input.labels.shared]
      : []),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "expertId",
  "focusedContributionId",
  "demonstration",
  "tableArrangement",
  "artifact",
  "kind",
  "form",
  "state",
  "gesture",
  "retest",
  "releaseRole",
  "issueMarks",
  "contributor",
  "colleague",
  "requester",
];

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: supportRequestResponseContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [50, 90, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SupportRequestResponseTestState = { render, options };
