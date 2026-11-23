import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { assertOriginalSourceCaptionPaintMarkup as _assertOriginalSourceCaptionPaintMarkup } from "./assertOriginalSourceCaptionPaintMarkup";
import type { fixtures } from "../UtteranceToModelDraft.fixtures";
import type { renderToStaticMarkup } from "react-dom/server";

/**
 * Asserts original source and caption paint over copies with full opaque
 * clearance.
 */
export function assertOriginalSourceCaptionPaintMarkupBottom({
  markup,
  backing,
  input,
}: Readonly<{
  markup: ReturnType<typeof renderToStaticMarkup>;
  backing: string;
  input: (typeof fixtures)[number]["input"];
}>): void {
  assert.ok(
    markup.lastIndexOf("data-phrase-copy=") <
      markup.indexOf("data-draft-caption-backing="),
  );
  assert.ok(
    markup.indexOf("data-source-backing=") <
      markup.indexOf("data-source-fragment="),
  );
  const bottom =
    SvgAttributes.getNumberFromMarkup({ attributes: backing, name: "y" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: backing, name: "height" });
  _assertOriginalSourceCaptionPaintMarkup({
    markup,
    input,
    backing,
    bottom,
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: backing, name: "x" }) <= 60,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: backing, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: backing,
        name: "width",
      }) >=
      900,
  );
}
