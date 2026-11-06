import assert from "node:assert/strict";
import { prop, isDefined } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { ReadinessLatch } from "../ReadinessLatch";
import { DEFAULT_INPUT } from "../ReadinessLatch.fixtures";
import { type Input } from "../ReadinessLatch.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: {
  frame: number;
  input?: Input;
}): string {
  return renderToStaticMarkup(
    createElement(ReadinessLatch, {
      frame,
      input,
      accent: "#9fefca",
      id: "test",
    }),
  );
}

function _getVisibleTextsFromInput({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  if (!input.showLabels) {
    return [];
  }
  return [
    input.sharedAction,
    input.copy.example,
    frame >= 122 && input.participants.every(prop("ready"))
      ? input.copy.released
      : input.copy.held,
    ...input.participants.map(prop("label")),
    ...input.participants.map((participant) =>
      input.showParticipantStates
        ? participant.ready &&
          frame >=
            24 +
              (88 * participant.workUnits) /
                Math.max(...input.participants.map(prop("workUnits")))
          ? input.copy.ready
          : input.copy.waiting
        : undefined,
    ),
    input.showWorkValues ? input.unitLabel : undefined,
  ].filter(isDefined);
}

function _getAttributesFromMarkup({
  markup,
  id,
  kind,
}: {
  markup: string;
  id: string;
  kind: string;
}): string {
  const elements = markup.match(/<[^>]+>/g) ?? [];
  const element = elements.find((item) =>
    item.includes(`data-${kind}="${id}"`),
  );
  assert.ok(element, `${kind} ${id}`);
  return element;
}

/** Data for getResultBoundsFromMarkup. */
type GetResultBoundsFromMarkupResult = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function _getResultBoundsFromMarkup(
  markup: string,
): GetResultBoundsFromMarkupResult {
  const result = SvgAttributes.fromMarker({ markup, marker: "result" });
  if (result.startsWith("<circle")) {
    const radius = SvgAttributes.getNumberFromMarkup({
      attributes: result,
      name: "r",
    });
    return {
      left:
        SvgAttributes.getNumberFromMarkup({ attributes: result, name: "cx" }) -
        radius,
      right:
        SvgAttributes.getNumberFromMarkup({ attributes: result, name: "cx" }) +
        radius,
      top:
        SvgAttributes.getNumberFromMarkup({ attributes: result, name: "cy" }) -
        radius,
      bottom:
        SvgAttributes.getNumberFromMarkup({ attributes: result, name: "cy" }) +
        radius,
    };
  }
  const halfStroke =
    SvgAttributes.getNumberFromMarkup({
      attributes: result,
      name: "stroke-width",
    }) / 2;
  const left =
    SvgAttributes.getNumberFromMarkup({ attributes: result, name: "x" }) -
    halfStroke;
  const top =
    SvgAttributes.getNumberFromMarkup({ attributes: result, name: "y" }) -
    halfStroke;
  return {
    left,
    top,
    right:
      left +
      SvgAttributes.getNumberFromMarkup({ attributes: result, name: "width" }) +
      halfStroke * 2,
    bottom:
      top +
      SvgAttributes.getNumberFromMarkup({
        attributes: result,
        name: "height",
      }) +
      halfStroke * 2,
  };
}
export {
  _render,
  _getVisibleTextsFromInput,
  _getAttributesFromMarkup,
  _getResultBoundsFromMarkup,
};
export type { GetResultBoundsFromMarkupResult };
