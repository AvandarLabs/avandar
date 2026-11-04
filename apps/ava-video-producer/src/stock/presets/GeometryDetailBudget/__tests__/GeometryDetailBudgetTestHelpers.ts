import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GeometryDetailBudget } from "../GeometryDetailBudget";
import { DEFAULT_INPUT } from "../GeometryDetailBudget.fixtures";
import { type Input } from "../GeometryDetailBudget.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(GeometryDetailBudget, {
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
export { _render, _getVisibleTexts, EXCLUSIONS };
