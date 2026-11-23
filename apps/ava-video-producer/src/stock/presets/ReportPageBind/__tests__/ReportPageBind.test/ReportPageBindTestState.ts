import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportPageBind } from "../../ReportPageBind";
import { DEFAULT_INPUT } from "../../ReportPageBind.fixtures";
import { type Input } from "../../ReportPageBind.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ReportPageBind, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ReportPageBindTestState = { render: _render };
