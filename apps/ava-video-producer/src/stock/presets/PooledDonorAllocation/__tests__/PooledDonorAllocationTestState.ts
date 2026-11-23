import assert from "node:assert/strict";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PooledDonorAllocation } from "../PooledDonorAllocation";
import { type Input } from "../PooledDonorAllocation.schema";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertEveryAttributedCreditStaysRequestOptions = {
  request: Readonly<Input["requests"][number]>;
  tokens: Readonly<RegExpExecArray[]>;
  input: Readonly<Input>;
  markup: string;
};

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return _joinMarkedShapes(
    renderToStaticMarkup(
      createElement(PooledDonorAllocation, {
        frame,
        input,
        accent: "#9fefca",
        id: "test",
      }),
    ),
  );
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.scenarioCaption,
    ...Object.values(input.labels),
    ...input.requests.map(prop("label")),
    ...input.contributions.flatMap(({ donorLabel, mark }) => {
      return [donorLabel, mark];
    }),
  ];
}

const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "mark",
  "earmarkedRequestId",
  "contributionId",
  "requestId",
  "envelopeArrangement",
];

function _getTokenCoordinate({
  attributes,
  axis,
}: Readonly<{ attributes: string; axis: "x" | "y" }>): number {
  const transform = attributes.match(
    /transform="translate\(([^ ]+) ([^)]+)\)"/,
  );
  assert.ok(transform);
  return Number(transform[axis === "x" ? 1 : 2]);
}

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
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PooledDonorAllocationTestState = {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUDED_TEXT_FIELDS,
  getTokenCoordinate: _getTokenCoordinate,
};
