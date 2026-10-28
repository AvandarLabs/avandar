import assert from "node:assert/strict";
import test from "node:test";
import { getSvgAttributeMatchesFromMarkup } from "./getSvgAttributeMatchesFromMarkup";
test("opening tags retain empty and escaped attribute values in document order", () => {
  const markup =
    '<svg><circle data-key=""/><text data-key="a &amp; b &quot;c&quot; &#x27;d&#39; &#x754c;"/></svg>';
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({ markup, attribute: "data-key" }),
    {
      tags: [
        '<circle data-key=""/>',
        '<text data-key="a &amp; b &quot;c&quot; &#x27;d&#39; &#x754c;"/>',
      ],
      values: ["", "a & b \"c\" 'd' 界"],
    },
  );
});
test("single-quoted values and quoted greater-than signs stay in their own opening tag", () => {
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: `<svg><path data-key='a > b' d="M0 0"/><circle data-key="b"/></svg>`,
      attribute: "data-key",
    }),
    {
      tags: [`<path data-key='a > b' d="M0 0"/>`, '<circle data-key="b"/>'],
      values: ["a > b", "b"],
    },
  );
});
test("attribute membership excludes comments, text, suffix names and closing tags", () => {
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup:
        '<!-- <g data-key="comment"/> --><g data-key-extra="suffix"><text>data-key="text"</text></g>',
      attribute: "data-key",
    }),
    { tags: [], values: [] },
  );
});
test("entities are decoded exactly once so literal entity-looking author text survives", () => {
  assert.deepEqual(
    getSvgAttributeMatchesFromMarkup({
      markup: '<g data-key="&amp;quot; &lt; &gt; &#65;"/>',
      attribute: "data-key",
    }).values,
    ["&quot; < > A"],
  );
});
test("invalid attribute selectors and unsupported entities fail explicitly", () => {
  assert.throws(() =>
    getSvgAttributeMatchesFromMarkup({
      markup: '<g data-key="x"/>',
      attribute: "data-.*",
    }),
  );
  assert.throws(() =>
    getSvgAttributeMatchesFromMarkup({
      markup: '<g data-key="&mystery;"/>',
      attribute: "data-key",
    }),
  );
});
