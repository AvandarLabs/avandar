import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoordinateQualityTriage } from "../CoordinateQualityTriage";
import { DEFAULT_INPUT } from "../CoordinateQualityTriage.fixtures";
import { type Input } from "../CoordinateQualityTriage.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(CoordinateQualityTriage, {
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

const EXCLUSIONS: string[] = ["id", "latitude", "longitude"];
export { _render, _getVisibleTexts, EXCLUSIONS };
