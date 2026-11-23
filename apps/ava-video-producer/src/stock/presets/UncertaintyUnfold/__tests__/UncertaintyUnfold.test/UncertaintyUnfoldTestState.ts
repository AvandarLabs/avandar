import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UncertaintyUnfold } from "../../UncertaintyUnfold";
import { DEFAULT_INPUT } from "../../UncertaintyUnfold.fixtures";
import { type Input } from "../../UncertaintyUnfold.schema";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(UncertaintyUnfold, {
        frame,
        input,
        accent: "#72d5bd",
        id: "uncertainty-test",
      }),
    ),
  );
};
/** Shared authored fixtures and renderers for this preset's assertions. */
export const UncertaintyUnfoldTestState = { render };
