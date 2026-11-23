import { PortableWorkTransferTestState } from "./PortableWorkTransferTestState";

const { render } = PortableWorkTransferTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../../PortableWorkTransfer.schema";

/** Asserts rigid folio contact and returns its horizontal position. */
export function getFolioXFromFrame({
  frame,
  input,
}: Readonly<{ frame: number[][number]; input: Readonly<Input> }>): number {
  const markup = render({ frame, input }),
    folio = SvgAttributes.fromMarker({ markup, marker: "folio" }),
    hand = SvgAttributes.fromMarker({ markup, marker: "owner-hand" });
  const x = SvgAttributes.getNumberFromMarkup({ attributes: folio, name: "x" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
    x + 125,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
    SvgAttributes.getNumberFromMarkup({ attributes: folio, name: "y" }) - 3,
  );
  input.artifacts.forEach(({ id }, index) => {
    const copy = markup.match(
      new RegExp(`<g data-transfer-copy="${id}">([\\s\\S]*?)<\\/g>`),
    )?.[1];
    assert.ok(copy);
    const body = SvgAttributes.fromMarker({
      markup: copy,
      marker: "artifact-body",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: body, name: "x" }),
      x + 12,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }),
      210 + index * 86,
    );
  });
  assert.ok(
    markup.indexOf("data-transfer-copy=") < markup.indexOf("data-folio-cover="),
  );
  return x;
}
