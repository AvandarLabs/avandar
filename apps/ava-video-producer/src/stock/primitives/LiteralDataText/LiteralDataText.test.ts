import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiteralDataText } from "./LiteralDataText";
const render = ({ value }: Readonly<{ value: string }>): string =>
  renderToStaticMarkup(createElement(LiteralDataText, { value, x: 20, y: 30 }));
test("exact data retains raw accessible content while whitespace is bounded visible marks", () => {
  const value = " \t\n\r\u00a0".repeat(5);
  const markup = render({ value: value });
  assert.ok(markup.includes(`aria-label="${value}"`));
  assert.ok(markup.includes(`data-literal-value="${value}"`));
  assert.equal((markup.match(/text-decoration="underline"/g) ?? []).length, 25);
  assert.match(markup, /·/);
  assert.match(markup, /⇥/);
  assert.match(markup, /↵/);
  assert.match(markup, /␍/);
  assert.match(markup, /␣/);
});
test("literal marker glyphs remain distinguishable from whitespace substitutions", () => {
  const space = render({ value: "A B" }),
    literal = render({ value: "A·B" });
  assert.match(space, /text-decoration="underline"/);
  assert.doesNotMatch(literal, /text-decoration="underline"/);
});
test("whole graphemes keep combining marks and ZWJ sequences attached", () => {
  const markup = render({ value: "é 👩‍🔬 \u0301" });
  assert.match(markup, />é<\/tspan>/);
  assert.match(markup, />👩‍🔬<\/tspan>/);
  assert.match(markup, />·́<\/tspan>/);
  assert.doesNotMatch(markup, />[\u0300-\u036f\u200d]/u);
});

test("substituted whitespace carries a distinct authored color and literal symbols do not", () => {
  const marked = render({ value: " " }),
    literal = render({ value: "·" });
  assert.match(
    marked,
    /<tspan[^>]*fill="#f0ba83"[^>]*text-decoration="underline"/,
  );
  assert.doesNotMatch(literal, /<tspan[^>]*fill="#f0ba83"/);
  assert.match(render({ value: "\r\n" }), />␍↵<\/tspan>/);
});
