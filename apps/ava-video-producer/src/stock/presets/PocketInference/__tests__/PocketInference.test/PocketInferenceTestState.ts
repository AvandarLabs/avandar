import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PocketInference } from "../../PocketInference";
import { DEFAULT_INPUT } from "../../PocketInference.fixtures";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertActualProcessingRectangleCoordinatesRectangleOptions = {
  rectangle: RegExpMatchArray[number];
  boundaryY: number;
  boundaryX: number;
  boundary: string;
};

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertActualProcessingRectangleCoordinatesMarkerOptions = {
  marker: string;
  markup: string;
  boundaryX: number;
  boundaryY: number;
  boundary: string;
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(PocketInference, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const PocketInferenceTestState = { render: _render };
