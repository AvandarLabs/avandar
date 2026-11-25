import { SealedHandoffTestState } from "./SealedHandoffTestState";

const { render: _render } = SealedHandoffTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../SealedHandoff.fixtures";
import { assertActualFullOpacityCoverAxis as _assertActualFullOpacityCoverAxis } from "./assertActualFullOpacityCoverAxis";

/**
 * Asserts the actual full-opacity cover bounds enclose the still-painted
 * brief throughout transit.
 */
export function assertActualFullOpacityCoverRevealRule(
  revealRule: "recipient" | "remain-sealed",
): void {
  for (let frame = 66; frame <= 120; frame++) {
    const markup = _render({
      frame: frame,
      input: { ...fixtures[2].input, revealRule },
    });
    const paper = markup.match(/<rect[^>]*data-brief-paper=[^>]*>/)?.[0];
    const cover = markup.match(/<rect[^>]*data-opaque-cover=[^>]*>/)?.[0];
    assert.ok(paper);
    assert.ok(cover);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: cover, name: "opacity" }),
      1,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: cover,
        name: "fill-opacity",
      }),
      1,
    );
    assert.match(cover, /fill="#142632"/);
    Array.from(["x", "y"]).forEach((axis) => {
      return _assertActualFullOpacityCoverAxis({ axis, cover, paper });
    });
    assert.ok(
      markup.indexOf("data-opaque-cover=") >
        markup.indexOf('data-brief-line="line-3"'),
    );
    const payload = markup.slice(
      markup.indexOf("data-brief-content="),
      markup.indexOf("data-cover-progress="),
    );
    assert.doesNotMatch(payload, /opacity=/);
  }
}
