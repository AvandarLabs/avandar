import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PopulationNormalizedMap } from "../../PopulationNormalizedMap";
import { defaultInput } from "../../PopulationNormalizedMap.fixtures";
import { type Input } from "../../PopulationNormalizedMap.schema";

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
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(
        "svg",
        {},
        createElement(PopulationNormalizedMap, {
          frame,
          input,
          accent: "#46dbc9",
          id: "packet17",
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
    ...input.zones.map(prop("label")),
    input.periodLabel,
    input.copy.context,
    input.copy.records,
    input.copy.population,
    input.copy.per,
    frame < 72 ? input.copy.countLegend : input.copy.normalizedLegend,
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "stratumId",
  "parcelId",
  "onsetBinId",
  "focusedBinId",
  "investigationCaseIds",
  "selectedSiteIds",
  "measure",
  "gapEmphasis",
];
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PopulationNormalizedMapTestState = {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
};
