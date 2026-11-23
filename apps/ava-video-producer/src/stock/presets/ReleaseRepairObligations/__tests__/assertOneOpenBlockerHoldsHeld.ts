import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { type AssertOneOpenBlockerHoldsHeldOptions } from "./ReleaseRepairObligationsContractTestState.types";
import { render } from "./ReleaseRepairObligationsTestHelpers";

/**
 * Asserts one open blocker holds the whole artifact while follow-ups stay
 * attached after delivery.
 */
export function assertOneOpenBlockerHoldsHeld({
  held,
  setup,
  deliveredMarkup,
  delivered,
  heldInput,
}: Readonly<AssertOneOpenBlockerHoldsHeldOptions>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: held, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: setup, name: "x" }),
  );
  const recipient = SvgAttributes.fromMarker({
    markup: deliveredMarkup,
    marker: "recipient-bay",
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: delivered, name: "x" }) >=
      SvgAttributes.getNumberFromMarkup({ attributes: recipient, name: "x" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: delivered, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: delivered,
        name: "width",
      }) <=
      SvgAttributes.getNumberFromMarkup({ attributes: recipient, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: recipient,
          name: "width",
        }),
  );
  assert.match(render({ frame: 150, input: heldInput }), /data-held-bracket=/);
  assert.doesNotMatch(deliveredMarkup, /data-held-bracket=/);
}
