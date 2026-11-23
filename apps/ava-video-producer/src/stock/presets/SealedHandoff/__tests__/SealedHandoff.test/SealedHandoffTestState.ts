import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SealedHandoff } from "../../SealedHandoff";
import { DEFAULT_INPUT } from "../../SealedHandoff.fixtures";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(SealedHandoff, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SealedHandoffTestState = { render: _render };
