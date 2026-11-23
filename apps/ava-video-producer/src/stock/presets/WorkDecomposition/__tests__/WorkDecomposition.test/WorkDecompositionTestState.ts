import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkDecomposition } from "../../WorkDecomposition";
import { DEFAULT_INPUT } from "../../WorkDecomposition.fixtures";
import { type Input } from "../../WorkDecomposition.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(WorkDecomposition, {
        frame,
        input,
        accent: "#72d5bd",
        id: "work-test",
      }),
    ),
  );
};

function _pieces({ frame, input }: { frame: number; input: Input }) {
  return [
    ...render({ frame: frame, input: input }).matchAll(
      /<rect[^>]*data-piece-id="[^"]*"[^>]*>/g,
    ),
  ].map((match) => {
    return match[0];
  });
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const WorkDecompositionTestState = { render, pieces: _pieces };
