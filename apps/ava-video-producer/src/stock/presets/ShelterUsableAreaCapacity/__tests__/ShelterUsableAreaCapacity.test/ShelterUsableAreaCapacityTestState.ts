import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ShelterUsableAreaCapacity } from "../../ShelterUsableAreaCapacity";
import { DEFAULT_INPUT } from "../../ShelterUsableAreaCapacity.fixtures";
import { type Input } from "../../ShelterUsableAreaCapacity.schema";

/**
 * Rendered markup with each marked sketch-aware shape read as one element.
 * `SketchedShape` draws its plain shape inside a group that carries the
 * shape's markers (`data-*`, `aria-label`, `transform`), so the group's
 * attributes move onto the shape these assertions read.
 */
function _joinMarkedShapes(markup: string): string {
  return markup.replace(
    /<g((?:\s+(?:data-[\w-]+|aria-label|transform)="[^"]*")+)><(path|line|circle|rect|ellipse)\b([^>]*)><\/\2><\/g>/g,
    "<$2$1$3></$2>",
  );
}

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(
        "svg",
        {},
        createElement(ShelterUsableAreaCapacity, {
          frame,
          input,
          accent: "#46dbc9",
          id: "packet18",
        }),
      ),
    ),
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return frame >= 120
    ? Object.values(input.copy)
    : [
        input.copy.context,
        input.copy.gross,
        input.copy.sleeping,
        input.copy.circulation,
        input.copy.storage,
        input.copy.closed,
      ];
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "cellIds",
  "eventBinId",
  "firstSnapshot",
  "focusedLocationId",
  "measure",
  "role",
  "kind",
  "initialDayId",
  "initialBandId",
  "agreedDayId",
  "agreedBandId",
];
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ShelterUsableAreaCapacityTestState = {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
};
