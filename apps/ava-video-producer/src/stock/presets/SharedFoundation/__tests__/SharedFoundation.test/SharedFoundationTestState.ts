import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SharedFoundation } from "../../SharedFoundation";
import { DEFAULT_INPUT } from "../../SharedFoundation.fixtures";
import type { Input } from "../../SharedFoundation.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(SharedFoundation, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const SharedFoundationTestState = { render: _render };
