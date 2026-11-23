import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PersonLedSupportCalendar } from "../../PersonLedSupportCalendar";
import { DEFAULT_INPUT } from "../../PersonLedSupportCalendar.fixtures";
import { type Input } from "../../PersonLedSupportCalendar.schema";

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
        createElement(PersonLedSupportCalendar, {
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
  return [
    ...Object.values(input.people),
    ...input.days.map(prop("label")),
    ...input.timeBands.map(prop("label")),
    ...input.commitments.map(prop("label")),
    input.copy.goal,
    input.copy.example,
    ...(frame >= 132 ? [input.copy.agreement] : []),
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

function _booking({ markup, id }: { markup: string; id: string }): string {
  const match = [
    ...markup.matchAll(/<rect data-booking="([^"]*)"[^>]+>/g),
  ].find((item) => {
    return item[1] === id;
  });
  assert.ok(match);
  return match[0];
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PersonLedSupportCalendarTestState = {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
  booking: _booking,
};
