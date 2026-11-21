import { PeerContributionRecognitionTestState } from "./PeerContributionRecognitionTestState";

const { markedShape: _markedShape, render } =
  PeerContributionRecognitionTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PeerContributionRecognition.schema";

/**
 * Asserts hidden authorship stays visibly beside the focused stationary work
 * throughout hold.
 */
export function assertHiddenAuthorshipStaysVisiblyFrame({
  frame,
  input,
  setup,
}: Readonly<{ frame: number; input: Readonly<Input>; setup: string }>): void {
  const markup = render({ frame: frame, input: input });
  const object = _markedShape({ markup, marker: "focused-object" });
  ["x", "y", "width", "height"].forEach((attribute) => {
    return assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: object,
        name: attribute,
      }),
      SvgAttributes.getNumberFromMarkup({ attributes: setup, name: attribute }),
    );
  });
  const byline = markup.match(
    /<g data-authorship-byline="true">([\s\S]*?)<\/g>/,
  )?.[1];
  assert.ok(byline?.includes(`aria-label="${input.people.contributor}"`));
  const text = byline!.match(/<text[^>]*>/)?.[0];
  assert.ok(text);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: text, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: object, name: "x" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: text, name: "y" }) - 14 >
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: object,
          name: "height",
        }),
  );
}
