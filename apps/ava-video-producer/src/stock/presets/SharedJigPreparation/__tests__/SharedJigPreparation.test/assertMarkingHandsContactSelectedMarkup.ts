import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertMarkingHandsContactSelectedPatternMarkup as _assertMarkingHandsContactSelectedPatternMarkup } from "./assertMarkingHandsContactSelectedPatternMarkup";
import { type AssertMarkingHandsContactSelectedMarkupOptions } from "./SharedJigPreparationTestState";

/** Asserts an independently authored portion of the rendered contract. */
export function assertMarkingHandsContactSelectedMarkup({
  markup,
  guide,
  tool,
  pattern,
  handX,
  handY,
  radius,
  arm,
}: Readonly<AssertMarkingHandsContactSelectedMarkupOptions>): void {
  const patternMarkup = markup.slice(markup.indexOf(guide));
  const contact = tool.match(/ L([^ ]+) ([^" ]+)"/);
  assert.ok(contact);
  if (pattern === "corner-mark") {
    const mark = SvgAttributes.fromMarker({
      markup: patternMarkup,
      marker: "corner-mark",
    });
    const corner = mark.match(/d="M([^ ]+) ([^ ]+) h([^ ]+) v([^" ]+)"/);
    assert.ok(corner);
    assert.equal(Number(contact[1]), Number(corner[1]) + Number(corner[3]));
    assert.equal(Number(contact[2]), Number(corner[2]));
  } else {
    _assertMarkingHandsContactSelectedPatternMarkup({
      patternMarkup,
      handX,
      handY,
      radius,
    });
    assert.equal(Number(contact[1]), handX);
    assert.equal(Number(contact[2]), handY);
  }
  assert.ok(arm.includes(`L${handX} ${handY}`));
  assert.ok(markup.indexOf(arm) > markup.indexOf(guide));
  assert.ok(markup.indexOf(tool) > markup.indexOf(guide));
}
