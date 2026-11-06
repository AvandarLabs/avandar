import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSvgAttributeMatchesFromMarkup } from "../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { DistanceBufferEnvelope } from "../DistanceBufferEnvelope";
import { DEFAULT_INPUT } from "../DistanceBufferEnvelope.fixtures";
import { type Input } from "../DistanceBufferEnvelope.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(DistanceBufferEnvelope, {
        frame,
        input,
        accent: "#3caeff",
        id: "packet30",
      }),
    ),
  );
}

function _values({
  markup,
  attribute,
}: {
  markup: string;
  attribute: string;
}): string[] {
  return getSvgAttributeMatchesFromMarkup({ markup, attribute }).values;
}

function _tags({
  markup,
  attribute,
}: {
  markup: string;
  attribute: string;
}): string[] {
  return getSvgAttributeMatchesFromMarkup({ markup, attribute }).tags;
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...Object.values(input.copy),
    ...Object.values(input.labels),
    input.origin.label,
    ...input.locations.map(prop("label")),
  ];
}

const EXCLUSIONS: string[] = [
  "id",
  "fromId",
  "toId",
  "originId",
  "policy",
  "values",
];

function _getVisibleRowKeys({
  markup,
  lane,
}: {
  markup: string;
  lane: "source" | "included";
}): string[] {
  return SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup)
    .filter(
      (item) =>
        item.kind === "text" &&
        item.top >= 260 &&
        item.bottom < 560 &&
        item.left >= (lane === "source" ? 438 : 690) &&
        item.right <= (lane === "source" ? 452 : 710) &&
        /^\d+$/.test(item.text ?? ""),
    )
    .map((item) => item.text!);
}
export {
  _render,
  _values,
  _tags,
  _getVisibleTexts,
  EXCLUSIONS,
  _getVisibleRowKeys,
};
