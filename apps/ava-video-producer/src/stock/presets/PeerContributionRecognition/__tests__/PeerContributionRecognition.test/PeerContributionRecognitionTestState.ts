import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { PeerContributionRecognition } from "../../PeerContributionRecognition";
import { peerContributionRecognitionContract } from "../../PeerContributionRecognition.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../PeerContributionRecognition.fixtures";
import {
  inputSchema,
  type Input,
} from "../../PeerContributionRecognition.schema";
import type { PresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";

/** Semantic geometry assertions for the authored study. */
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
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(PeerContributionRecognition, {
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
    input.people.contributor,
    input.people.colleague,
    input.exampleLabel,
    ...input.contributions.map(prop("label")),
    ...(frame >= 109 ? [input.acknowledgment.text] : []),
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
  contract: peerContributionRecognitionContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [50, 90, 150],
} satisfies PresetAssertions<Input>;
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PeerContributionRecognitionTestState = {
  markedShape: _markedShape,
  render,
  options,
};
