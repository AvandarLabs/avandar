import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TradeoffPivot } from "../../TradeoffPivot";
import { DEFAULT_INPUT } from "../../TradeoffPivot.fixtures";

/** Inputs for render. */
type RenderInput = {
  approach: string;
  gains: Array<{ id: string; label: string }>;
  concessions: Array<{ id: string; label: string }>;
  sideLabels: { gain: string; concession: string };
  priorityStatement: string;
  revealOrder: "gain-first" | "concession-first";
};

function _render({
  frame,
  input = DEFAULT_INPUT,
}: {
  frame: number;
  input?: RenderInput;
}): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(TradeoffPivot, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}

function _leaf({
  markup,
  side,
}: {
  markup: string;
  side: string;
}): RegExpMatchArray | null {
  return markup.match(
    new RegExp(`data-leaf="${side}" opacity="([^"]+)" transform="([^"]+)"`),
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const TradeoffPivotTestState = { render: _render, leaf: _leaf };
