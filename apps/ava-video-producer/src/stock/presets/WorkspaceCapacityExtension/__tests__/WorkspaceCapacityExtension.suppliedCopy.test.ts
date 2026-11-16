import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceCapacityExtension } from "../WorkspaceCapacityExtension";
import { DEFAULT_INPUT } from "../WorkspaceCapacityExtension.fixtures";

test("supplied authored decision copy remains verbatim and unchanged", () => {
  const input = {
    ...DEFAULT_INPUT,
    choice: { ...DEFAULT_INPUT.choice, label: "  Authored choice  " },
  };
  const before = structuredClone(input);
  const markup = renderToStaticMarkup(
    createElement(WorkspaceCapacityExtension, {
      input,
      frame: 150,
      accent: "#9fefca",
      id: "authored-copy",
    }),
  );
  assert.ok(markup.includes('aria-label="  Authored choice  "'));
  assert.ok(!markup.includes(DEFAULT_INPUT.choice.label));
  assert.deepEqual(input, before);
});
