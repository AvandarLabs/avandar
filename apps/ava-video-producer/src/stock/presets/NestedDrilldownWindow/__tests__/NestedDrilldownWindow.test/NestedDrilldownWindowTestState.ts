import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NestedDrilldownWindow } from "../../NestedDrilldownWindow";
import { DEFAULT_INPUT } from "../../NestedDrilldownWindow.fixtures";
import { type Input } from "../../NestedDrilldownWindow.schema";

/** Inputs consumed by the corresponding rendered assertions. */

export type AssertDenseSetupSelectedDetailXOptions = {
  x: number;
  rect: ReturnType<typeof _slips>[number];
  ox: number;
  other: ReturnType<typeof _slips>[number];
  y: number;
  oy: number;
};

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string => {
  return renderToStaticMarkup(
    createElement(NestedDrilldownWindow, {
      frame,
      input,
      accent: "#72d5bd",
      id: "test",
    }),
  );
};

function _slips(markup: string) {
  return [...markup.matchAll(/<rect[^>]*data-record-id="[^"]*"[^>]*>/g)].map(
    (match) => {
      return match[0];
    },
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const NestedDrilldownWindowTestState = { render, slips: _slips };
