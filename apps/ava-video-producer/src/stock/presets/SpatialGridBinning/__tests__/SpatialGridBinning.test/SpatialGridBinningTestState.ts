import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpatialGridBinning } from "../../SpatialGridBinning";
import { DEFAULT_INPUT } from "../../SpatialGridBinning.fixtures";
import { type Input } from "../../SpatialGridBinning.schema";
import type { getSvgAttributeMatchesFromMarkup } from "../../../../../../tests/helpers/getSvgAttributeMatchesFromMarkup/getSvgAttributeMatchesFromMarkup";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertCountTokensTravelActualTagOptions = {
  tag: ReturnType<typeof getSvgAttributeMatchesFromMarkup>["tags"][number];
  index: number;
  input: Readonly<Input>;
  travel: ReturnType<typeof getSvgAttributeMatchesFromMarkup>["tags"];
  hold: ReturnType<typeof getSvgAttributeMatchesFromMarkup>["tags"];
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(SpatialGridBinning, {
        frame,
        accent: "#3caeff",
        id: "packet29",
        input,
      }),
    ),
  );
}

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [...Object.values(input.copy), ...Object.values(input.labels)];
}

const EXCLUSIONS: string[] = ["id"];
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SpatialGridBinningTestState = {
  render: _render,
  getVisibleTexts: _getVisibleTexts,
  EXCLUSIONS,
};
