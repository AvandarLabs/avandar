import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QualifyApparentConflict } from "../../QualifyApparentConflict";
import { DEFAULT_INPUT } from "../../QualifyApparentConflict.fixtures";
import type { Input } from "../../QualifyApparentConflict.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(QualifyApparentConflict, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const QualifyApparentConflictTestState = { render: _render };
