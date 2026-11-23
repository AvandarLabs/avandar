import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ScopeAperture } from "../../ScopeAperture";
import { DEFAULT_INPUT } from "../../ScopeAperture.fixtures";
import type { Input } from "../../ScopeAperture.schema";

function _topicAttributes({
  markup,
  id,
}: {
  markup: string;
  id: string;
}): string {
  const element = [...markup.matchAll(/<g\b[^>]*>/g)]
    .map(([tag]) => {
      return tag;
    })
    .find((tag) => {
      return tag.includes(`data-topic-position="${id}"`);
    });
  assert.ok(element, id);
  return element;
}

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(ScopeAperture, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
/** Shared authored fixtures and renderers for this preset's assertions. */
export const ScopeApertureTestState = {
  topicAttributes: _topicAttributes,
  render: _render,
};
