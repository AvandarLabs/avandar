import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { UtteranceToModelDraft } from "../UtteranceToModelDraft";
import { fixtures } from "../UtteranceToModelDraft.fixtures";
import { assertOriginalSourceCaptionPaintMarkupBottom as _assertOriginalSourceCaptionPaintMarkupBottom } from "./assertOriginalSourceCaptionPaintMarkupBottom";

/**
 * Asserts original source and caption paint over copies with full opaque
 * clearance.
 */
export function assertOriginalSourceCaptionPaintFrame({
  frame,
  input,
}: Readonly<{
  frame: number[][number];
  input: (typeof fixtures)[number]["input"];
}>): void {
  const markup = renderToStaticMarkup(
    createElement(UtteranceToModelDraft, {
      frame,
      input,
      accent: "#65d6ad",
      background: "#24303a",
      id: "lift",
    }),
  );
  const backing = SvgAttributes.fromMarker({
    markup,
    marker: "source-backing",
  });
  const caption = SvgAttributes.fromMarker({
    markup,
    marker: "draft-caption-backing",
  });
  assert.match(backing, /fill="#24303a"/);
  assert.match(caption, /fill="#24303a"/);
  assert.ok(
    markup.lastIndexOf("data-phrase-copy=") <
      markup.indexOf("data-source-backing="),
  );
  _assertOriginalSourceCaptionPaintMarkupBottom({ markup, backing, input });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) <=
      230 - 16,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: caption, name: "y" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: caption,
        name: "height",
      }) >=
      230 + 20.8 + 4,
  );
}
